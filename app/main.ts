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

const defaultHeader: IDNSHeader = {
  id: 1234,
  qr: 1,
  opcode: OPCODE.QUERY,
  aa: 0,
  tc: 0,
  rd: 0,
  ra: 0,
  z: 0,
  rcode: ResponseCode.NO_ERROR_CONDITION,
  qdcount: 0,
  ancount: 0,
  nscount: 0,
  arcount: 0,
};

const defaultQuestion: IDNSQuestion = {
  name: "codecrafters.io",
  type: QuestionType.A,
  classCode: QuestionClass.IN,
};

const udpSocket: dgram.Socket = dgram.createSocket("udp4");
udpSocket.bind(2053, "127.0.0.1");

udpSocket.on("message", (data: Buffer, remoteAddr: dgram.RemoteInfo) => {
  try {
    console.log(`Received data from ${remoteAddr.address}:${remoteAddr.port}`);

    const header = Header.write(defaultHeader);
    const question = Question.write(defaultQuestion);

    const response = Buffer.concat([header, question]);

    udpSocket.send(response, remoteAddr.port, remoteAddr.address);
  } catch (e) {
    console.log(`Error sending data: ${e}`);
  }
});
