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

// const defaultHeader: IDNSHeader = {
//   id: 1234,
//   qr: 1,
//   opcode: OPCODE.QUERY,
//   aa: 0,
//   tc: 0,
//   rd: 0,
//   ra: 0,
//   z: 0,
//   rcode: ResponseCode.NO_ERROR_CONDITION,
//   qdcount: 0,
//   ancount: 0,
//   nscount: 0,
//   arcount: 0,
// };

// const defaultQuestion: IDNSQuestion = {
//   name: "codecrafters.io",
//   type: QuestionType.A,
//   classCode: QuestionClass.IN,
// };

// const defaultAnswer: INDSAnswer = {
//   name: "codecrafters.io",
//   type: 1,
//   classCode: 1,
//   ttl: 60,
//   rdlength: 4,
//   rdata: "8.8.8.8",
// };

const udpSocket: dgram.Socket = dgram.createSocket("udp4");
udpSocket.bind(2053, "127.0.0.1");

udpSocket.on("message", (data: Buffer, remoteAddr: dgram.RemoteInfo) => {
  try {
    console.log(`Received data from ${remoteAddr.address}:${remoteAddr.port}`);

    const parsedHeader = Header.read(data);
    let domainName: string = "";
    let offset: number = 12;

    while (data[offset] !== 0) {
      domainName += String.fromCharCode(data[offset]);
    }

    // console.log("Parsed Header: ", parsedHeader);

    const header = Header.write({
      ...parsedHeader,
      qr: 1,
      aa: 0,
      tc: 0,
      ra: 0,
      z: 0,
    });

    // console.log("Header written in main: ", header);
    // console.log("Written header parsed: ", Header.read(header));

    console.log("Domain Name: ", domainName);

    const question = Question.write({
      name: domainName,
      type: QuestionType.A,
      classCode: QuestionClass.IN,
    });

    console.log("Question: ", question);

    const answer = Answer.write({
      name: domainName,
      type: 1,
      classCode: 1,
      ttl: 60,
      rdlength: 4,
      rdata: "8.8.8.8",
    });

    const response = Buffer.concat([header, question, answer]);

    udpSocket.send(response, remoteAddr.port, remoteAddr.address);
  } catch (e) {
    console.log(`Error sending data: ${e}`);
  }
});
