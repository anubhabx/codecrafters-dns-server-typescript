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

    // console.log("Parsed Header: ", parsedHeader);
    const domainName = Question.decode(data.subarray(12, data.length));

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
    console.log({ "Question String:": question.toString() });

    const answer = Answer.write({
      name: domainName,
      type: 1,
      classCode: 1,
      ttl: 60,
      rdlength: 4,
      rdata: "8.8.8.8",
    });

    console.log("Answer: ", answer);
    console.log({ "Answer String:": answer.toString() });

    const response = Buffer.concat([header, question, answer]);

    udpSocket.send(response, remoteAddr.port, remoteAddr.address, (err) => {
      if (err) {
        console.log("Failed to send response: ", err);
      } else {
        console.log("Response sent successfully.");
      }
    });
  } catch (e) {
    console.log(`Error sending data: ${e}`);
  }
});
