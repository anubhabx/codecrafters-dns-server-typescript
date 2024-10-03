import * as dgram from "dgram";
import Header, {
  IDNSHeader,
  OPCODE,
  ResponseCode,
} from "./sections/HeaderSection";
import Question, {
  IDNSQuestion,
  QuestionClass,
  QuestionType,
} from "./sections/QuestionSection";
import Answer, { INDSAnswer } from "./sections/AnswerSection";

const udpSocket: dgram.Socket = dgram.createSocket("udp4");
udpSocket.bind(2053, "127.0.0.1");

udpSocket.on("message", (data: Buffer, remoteAddr: dgram.RemoteInfo) => {
  try {
    console.log(`Received data from ${remoteAddr.address}:${remoteAddr.port}`);

    const parsedHeader = Header.read(data);

    let responseHeader = {
      ...parsedHeader,
      qr: 1,
      aa: 0,
      tc: 0,
      ra: 0,
      z: 0,
      rcode: ResponseCode.NOERROR,
    };

    // Handle IQUERY, STATUS, RESERVED, and unrecognized opcodes
    if (parsedHeader.opcode === OPCODE.IQUERY || 
        parsedHeader.opcode === OPCODE.STATUS || 
        parsedHeader.opcode === OPCODE.RESERVED) {
      responseHeader.rcode = ResponseCode.NOT_IMPLEMENTED;
      responseHeader.ancount = 0;
      responseHeader.qdcount = 0;
      const header = Header.write(responseHeader);
      udpSocket.send(header, remoteAddr.port, remoteAddr.address, (err) => {
        if (err) {
          console.log("Failed to send response: ", err);
        } else {
          console.log("Response sent successfully.");
        }
      });
      return;
    }

    let offset = 12; // DNS header is 12 bytes
    const questions = [];
    for (let i = 0; i < parsedHeader.qdcount; i++) {
      const { name, byteLength } = Question.decode(data, offset);
      const type = data.readUInt16BE(offset + byteLength - 4);
      const classCode = data.readUInt16BE(offset + byteLength - 2);
      questions.push({ name, type, classCode, byteLength });
      offset += byteLength;
    }

    responseHeader.ancount = questions.length;
    responseHeader.qdcount = questions.length;

    const header = Header.write(responseHeader);

    console.log("Questions: ", questions);

    const questionBuffers = questions.map((q) =>
      Question.write({
        name: q.name,
        type: q.type,
        classCode: q.classCode,
      })
    );

    const answerBuffers = questions.map((q) =>
      Answer.write({
        name: q.name,
        type: 1, // A record
        classCode: 1, // IN class
        ttl: 60,
        rdlength: 4,
        rdata: "8.8.8.8", // Example IP address for the answer
      })
    );

    const response = Buffer.concat([header, ...questionBuffers, ...answerBuffers]);

    udpSocket.send(response, remoteAddr.port, remoteAddr.address, (err) => {
      if (err) {
        console.log("Failed to send response: ", err);
      } else {
        console.log("Response sent successfully.");
      }
    });
  } catch (e) {
    console.log(`Error processing request: ${e}`);
  }
});
