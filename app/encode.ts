export enum OPCODE {
  QUERY = 0,
  IQUERY = 1,
  STATUS = 2,
  RESERVED = 3,
}

export enum RCODE {
  NO_ERROR = 0,
  FORMAT_ERROR = 1,
  SERVER_FAILURE = 2,
  NAME_ERROR = 3,
  NOT_IMPLEMENTED = 4,
  REFUSED = 5,
  RESERVED = 6,
}

export enum QuestionType {
  A = 1,
  NS = 2,
  MD = 3,
  MF = 4,
  CNAME = 5,
  SOA = 6,
  MB = 7,
  MG = 8,
  MR = 9,
  NULL = 10,
  WKS = 11,
  PTR = 12,
  HINFO = 13,
  MINFO = 14,
  MX = 15,
  TXT = 16,
}

export enum QuestionClass {
  IN = 1,
  CS = 2,
  CH = 3,
  HS = 4,
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
  rcode: RCODE;
  qdcount: number;
  ancount: number;
  nscount: number;
  arcount: number;
}

export interface IDNSQuestion {
  name: string;
  type: QuestionType;
  class: QuestionClass;
}

export interface IDNSPacket {
  header: IDNSHeader;
  question: IDNSQuestion;
}

export function encode(packet: IDNSPacket): Buffer {
  const { header, question } = packet;

  const domainLabels = question.name.split(".");

  const domain = domainLabels[0];
  const tld = domainLabels[1];

  // Size Allocation

  const HEADER_LENGTH = 12;
  const QUESTION_LENGTH = 1 + domain.length + 1 + tld.length + 4;

  const TOTAL_LENGTH = HEADER_LENGTH + QUESTION_LENGTH;

  const buffer = Buffer.alloc(TOTAL_LENGTH);

  let offset = 0;

  // Header Section

  buffer.writeInt16BE(header.id);
  offset += 2;

  const flags =
    (header.qr << 15) |
    (header.opcode << 11) |
    (header.aa << 10) |
    (header.tc << 9) |
    (header.rd << 8) |
    (header.ra << 7) |
    (header.z << 4) |
    header.rcode;

  buffer.writeInt16BE(flags, offset);
  offset += 2;

  buffer.writeInt16BE(header.qdcount);
  offset += 2;

  buffer.writeInt16BE(header.ancount);
  offset += 2;

  buffer.writeInt16BE(header.nscount);
  offset += 2;

  buffer.writeInt16BE(header.arcount);
  offset += 2;

  // Question Section\

  buffer.writeInt8(domain.length, offset);
  offset += 1;

  buffer.write(domain, offset);
  offset += domain.length;

  buffer.writeInt8(tld.length, offset);
  offset += 1;

  buffer.write(tld, offset);
  offset += tld.length;

  buffer.writeInt8(0x0, offset);
  offset += 1;

  buffer.writeInt16BE(question.type, offset);
  offset += 2;

  buffer.writeInt16BE(question.class, offset);
  offset += 2;

  return buffer;
}
