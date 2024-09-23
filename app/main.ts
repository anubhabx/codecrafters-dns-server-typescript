import * as dgram from "dgram";
import Header, {
  AA,
  IDNSHeader,
  OPCODE,
  QRIndicator,
  ResponseCode,
} from "./sections/HeaderSection";

const defaultHeader: IDNSHeader = {
  id: 1234,
  qr: QRIndicator.REPLY_PACKET,
  opcode: OPCODE.QUERY,
  aa: AA.NOT_AUTHORAITATIVE,
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

const udpSocket: dgram.Socket = dgram.createSocket("udp4");
udpSocket.bind(2053, "127.0.0.1");

udpSocket.on("message", (data: Buffer, remoteAddr: dgram.RemoteInfo) => {
  try {
    console.log(`Received data from ${remoteAddr.address}:${remoteAddr.port}`);

    const header = Header.write(defaultHeader);

    const response = Buffer.from(header);

    udpSocket.send(response, remoteAddr.port, remoteAddr.address);
  } catch (e) {
    console.log(`Error sending data: ${e}`);
  }
});
