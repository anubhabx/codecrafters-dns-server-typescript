import * as dgram from "dgram";
import {
  encode,
  IDNSHeader,
  IDNSPacket,
  OPCODE,
  QuestionClass,
  QuestionType,
  RCODE,
} from "./encode";

const packet: IDNSPacket = {
  header: {
    id: 1234,
    qr: 1,
    opcode: OPCODE.QUERY,
    aa: 0,
    tc: 0,
    rd: 0,
    ra: 0,
    z: 0,
    rcode: RCODE.NO_ERROR,
    qdcount: 0,
    ancount: 0,
    nscount: 0,
    arcount: 0,
  },

  question: {
    name: "codecrafters.io",
    type: QuestionType.A,
    class: QuestionClass.IN,
  },
};

const udpSocket: dgram.Socket = dgram.createSocket("udp4");
udpSocket.bind(2053, "127.0.0.1");

udpSocket.on("message", (data: Buffer, remoteAddr: dgram.RemoteInfo) => {
  try {
    console.log(`Received data from ${remoteAddr.address}:${remoteAddr.port}`);

    const response = encode(packet);

    udpSocket.send(response, remoteAddr.port, remoteAddr.address);
  } catch (e) {
    console.log(`Error sending data: ${e}`);
  }
});
