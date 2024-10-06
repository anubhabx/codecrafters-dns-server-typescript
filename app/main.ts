import * as dgram from "dgram";
import Header, {
  IDNSHeader,
  OPCODE,
  ResponseCode,
} from "./sections/HeaderSection";
import Question, { IDNSQuestion } from "./sections/QuestionSection";
import Answer, { INDSAnswer } from "./sections/AnswerSection";
import { argv } from "process";

function parseArgs(): { resolver: string; port: number } {
  const args = argv.slice(2);
  let result = { resolver: "", port: 53 };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--resolver" && i + 1 < args.length) {
      const [ip, port] = args[i + 1].split(":");
      result.resolver = ip;
      if (port) result.port = parseInt(port, 10);
      break;
    }
  }

  if (!result.resolver) {
    console.log("Error: --resolver argument is required.");
    process.exit(1);
  }

  return result;
}

const { resolver, port } = parseArgs();
console.log(`Using resolver ${resolver}:${port}`);

const udpSocket: dgram.Socket = dgram.createSocket("udp4");
udpSocket.bind(2053, "127.0.0.1");

function forwardDnsRequest(data: Buffer, remoteAddr: dgram.RemoteInfo) {
  const forwardSocket = dgram.createSocket("udp4");

  forwardSocket.send(data, port, resolver, (err) => {
    if (err) {
      console.error("Error forwarding request: ", err);
      forwardSocket.close();
      return;
    }

    forwardSocket.on("message", (msg) => {
      udpSocket.send(msg, remoteAddr.port, remoteAddr.address, (err) => {
        if (err) {
          console.error("Error sending response:", err);
        } else {
          console.log("Response sent successfully.");
        }
        forwardSocket.close();
      });
    });
  });

  forwardSocket.on("error", (err) => {
    console.error("Forward Socket Error: ", err);
    forwardSocket.close();
  });
}

udpSocket.on("message", async (data: Buffer, remoteAddr: dgram.RemoteInfo) => {
  try {
    console.log(`Received data from ${remoteAddr.address}:${remoteAddr.port}`);

    const parsedHeader = Header.read(data);
    let offset = 12; // DNS header is 12 bytes
    const questions = [];
    for (let i = 0; i < parsedHeader.qdcount; i++) {
      const { name, byteLength } = Question.decode(data, offset);
      const type = data.readUInt16BE(offset + byteLength - 4);
      const classCode = data.readUInt16BE(offset + byteLength - 2);
      questions.push({ name, type, classCode, byteLength });
      offset += byteLength;
    }

    if (questions.length > 1) {
      // Handle multiple questions by splitting them into separate requests
      const responses: Buffer[] = [];
      for (const question of questions) {
        const singleQuestionHeader = {
          ...parsedHeader,
          qdcount: 1,
          ancount: 0,
          nscount: 0,
          arcount: 0,
        };
        const singleQuestionData = Buffer.concat([
          Header.write(singleQuestionHeader),
          Question.write(question),
        ]);
        const responsePromise = new Promise<Buffer>((resolve) => {
          const forwardSocket = dgram.createSocket("udp4");
          forwardSocket.send(singleQuestionData, port, resolver, (err) => {
            if (err) {
              console.error("Error forwarding request: ", err);
              forwardSocket.close();
              resolve(Buffer.alloc(0));
            }
          });
          forwardSocket.on("message", (msg) => {
            forwardSocket.close();
            resolve(msg);
          });
        });
        responses.push(await responsePromise);
        // Handle the response here
      }

      // Merge responses
      const mergedHeader = {
        ...parsedHeader,
        qr: 1,
        ancount: responses.reduce(
          (sum, resp) => sum + Header.read(resp).ancount,
          0
        ),
      };
      const mergedResponse = Buffer.concat([
        Header.write(mergedHeader),
        ...responses.map((resp) => resp.subarray(12)), // Remove headers from individual responses
      ]);

      udpSocket.send(
        mergedResponse,
        remoteAddr.port,
        remoteAddr.address,
        (err) => {
          if (err) {
            console.error("Error sending merged response:", err);
          } else {
            console.log("Merged response sent successfully.");
          }
        }
      );
    } else {
      // Forward single question request
      forwardDnsRequest(data, remoteAddr);
    }
  } catch (e) {
    console.log(`Error processing request: ${e}`);
  }
});

console.log("DNS server is running on 127.0.0.1:2053");
