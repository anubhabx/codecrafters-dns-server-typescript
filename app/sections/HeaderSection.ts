export enum OPCODE {
  QUERY = 0,
  IQUERY = 1,
  STATUS = 2,
}

export enum ResponseCode {
  NO_ERROR_CONDITION = 0,
  FORMAT_ERROR = 1,
  SERVER_FAILURE = 2,
  NAME_ERROR = 3,
  NOT_IMPLEMENTED = 4,
  REFUSED = 5,
}

export interface IDNSHeader {
  id: number;
  qr: number;
  opcode: OPCODE;
  aa: number;
  tc: number;
  rd: number;
  ra: number;
  z: number;
  rcode: ResponseCode;
  qdcount: number;
  ancount: number;
  nscount: number;
  arcount: number;
}

class Header {
  static write(values: IDNSHeader) {
    let header = Buffer.alloc(12);

    header.writeInt16BE(values.id);

    const { qr, opcode, aa, tc, rd, ra, z, rcode } = values;

    const flags =
      (qr << 15) |
      (opcode << 11) |
      (aa << 10) |
      (tc << 9) |
      (rd << 8) |
      (ra << 7) |
      (z << 4) |
      rcode;

    header.writeInt16BE(flags, 2);
    header.writeInt16BE(values.qdcount, 4);
    header.writeInt16BE(values.ancount, 6);
    header.writeInt16BE(values.nscount, 8);
    header.writeInt16BE(values.arcount, 10);

    return header;
  }
}

export default Header;
