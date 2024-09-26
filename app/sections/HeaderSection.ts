export enum OPCODE {
  QUERY = 0,
  IQUERY = 1,
  STATUS = 2,
  NOT_IMPLEMENTED = 3,
}

export enum ResponseCode {
  NOERROR = 0,
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

    let { qr, opcode, aa, tc, rd, ra, z, rcode } = values;

    opcode = opcode === OPCODE.QUERY ? OPCODE.QUERY : OPCODE.NOT_IMPLEMENTED;

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

  static read(data: Buffer): IDNSHeader {
    const id = data.readInt16BE(0);
    const flags = data.readInt16BE(2);
    const qdcount = data.readInt16BE(4);
    const ancount = data.readInt16BE(6);
    const nscount = data.readInt16BE(8);
    const arcount = data.readInt16BE(10);

    const qr = (flags >> 15) & 1;
    const opcode = (flags >> 11) & 0b1111;
    const aa = (flags >> 10) & 1;
    const tc = (flags >> 9) & 1;
    const rd = (flags >> 8) & 1;
    const ra = (flags >> 7) & 1;
    const z = (flags >> 4) & 0b111;
    const rcode = flags & 0b1111;

    return {
      id,
      qr,
      opcode: opcode as OPCODE,
      aa,
      tc,
      rd,
      ra,
      z,
      rcode: opcode === 0 ? ResponseCode.NOERROR : ResponseCode.NOT_IMPLEMENTED,
      qdcount,
      ancount,
      nscount,
      arcount,
    };
  }
}

export default Header;
