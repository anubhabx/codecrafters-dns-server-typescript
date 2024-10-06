import * as dgram from "dgram";
import Header, { IDNSHeader, OPCODE, ResponseCode } from "./sections/HeaderSection";
import Question, { IDNSQuestion } from "./sections/QuestionSection";

interface ServerConfig {
  resolver: string;
  port: number;
}

// Parse command line arguments
function parseArgs(): ServerConfig {
  const args = process.argv.slice(2);
  const result: ServerConfig = { resolver: "", port: 53 };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--resolver" && i + 1 < args.length) {
      const [ip, port] = args[i + 1].split(":");
      result.resolver = ip;
      if (port) result.port = parseInt(port, 10);
      break;
    }
  }

  if (!result.resolver) {
    console.error("Error: --resolver argument is required");
    process.exit(1);
  }

  return result;
}

const { resolver, port } = parseArgs();

const udpSocket: dgram.Socket = dgram.createSocket("udp4");
const forwardSocket: dgram.Socket = dgram.createSocket("udp4");

udpSocket.on("listening", () => {
  const address = udpSocket.address();
  console.log(`DNS server listening on ${address.address}:${address.port}`);
});

udpSocket.on("message", async (data: Buffer, remoteAddr: dgram.RemoteInfo) => {
  console.log(`Received data from ${remoteAddr.address}:${remoteAddr.port}`);

  const header = Header.read(data);
  const questions: IDNSQuestion[] = [];

  let offset = 12;
  for (let i = 0; i < header.qdcount; i++) {
    const { question, newOffset } = Question.read(data, offset);
    questions.push(question);
    offset = newOffset;
  }

  console.log(`Received ${questions.length} questions`);

  if (header.opcode === OPCODE.IQUERY || header.opcode === OPCODE.STATUS || header.opcode > OPCODE.STATUS) {
    // Handle IQUERY, STATUS, and unknown opcodes
    const response = createErrorResponse(header, ResponseCode.NOT_IMPLEMENTED);
    udpSocket.send(response, remoteAddr.port, remoteAddr.address, (err) => {
      if (err) {
        console.error("Error sending response:", err);
      } else {
        console.log("Response sent successfully.");
      }
    });
    return;
  }

  const responses = await Promise.all(
    questions.map((question) => forwardQuery(header.id, question))
  );
  const combinedResponse = combineResponses(header, questions, responses);

  console.log("Combined response:", combinedResponse);

  udpSocket.send(
    combinedResponse,
    remoteAddr.port,
    remoteAddr.address,
    (err) => {
      if (err) {
        console.error("Error sending response:", err);
      } else {
        console.log("Response sent successfully.");
      }
    }
  );
});

function forwardQuery(
  originalId: number,
  question: IDNSQuestion
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const newHeader = Header.write({
      id: originalId,
      qr: 0,
      opcode: 0,
      aa: 0,
      tc: 0,
      rd: 1,
      ra: 0,
      z: 0,
      rcode: 0,
      qdcount: 1,
      ancount: 0,
      nscount: 0,
      arcount: 0,
    });

    const newQuestion = Question.write(question);
    const newQuery = Buffer.concat([newHeader, newQuestion]);

    forwardSocket.send(newQuery, port, resolver, (err) => {
      if (err) {
        reject(err);
        return;
      }

      forwardSocket.once("message", (resolverResponse: Buffer) => {
        console.log("Received response from resolver:", resolverResponse);
        resolve(resolverResponse);
      });
    });
  });
}

function combineResponses(
  originalHeader: IDNSHeader,
  questions: IDNSQuestion[],
  responses: Buffer[]
): Buffer {
  const totalAnswers = responses.reduce(
    (sum, resp) => sum + Header.read(resp).ancount,
    0
  );

  const combinedHeader = Header.write({
    ...originalHeader,
    qr: 1, // This is a response
    ancount: totalAnswers,
  });

  const questionSection = Buffer.concat(
    questions.map((q) => Question.write(q))
  );

  const answerSections = Buffer.concat(
    responses.map((resp) => {
      const respHeader = Header.read(resp);
      // Skip the header and question section in the response
      const questionEnd = resp.indexOf('\0', 12) + 5;
      return resp.subarray(questionEnd);
    })
  );

  const combinedResponse = Buffer.concat([combinedHeader, questionSection, answerSections]);
  console.log("Combined response length:", combinedResponse.length);
  return combinedResponse;
}

udpSocket.on("error", (err) => {
  console.error(`Server error:\n${err.stack}`);
  udpSocket.close();
});

udpSocket.bind(2053, "127.0.0.1");

// Keep the process running
process.on("SIGINT", () => {
  console.log("Shutting down server...");
  udpSocket.close();
  forwardSocket.close();
  process.exit(0);
});

function createErrorResponse(originalHeader: IDNSHeader, rcode: ResponseCode): Buffer {
  const responseHeader = Header.write({
    ...originalHeader,
    qr: 1, // This is a response
    rcode: rcode,
    ancount: 0,
    nscount: 0,
    arcount: 0,
  });

  return responseHeader;
}
