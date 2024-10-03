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

export interface IDNSQuestion {
  name: string;
  type: QuestionType;
  classCode: QuestionClass;
}

class Question {
  static write(values: IDNSQuestion) {
    const { name, type, classCode } = values;
    const labels = name.split(".");
    const nameBuffer = Buffer.concat(
      labels.map((label) => {
        const length = Buffer.from([label.length]);
        const labelBuffer = Buffer.from(label, "binary");
        return Buffer.concat([length, labelBuffer]);
      })
    );
    const nullByte = Buffer.from([0]);
    const typeBuffer = Buffer.alloc(2);
    typeBuffer.writeUInt16BE(type);
    const classBuffer = Buffer.alloc(2);
    classBuffer.writeUInt16BE(classCode);
    const question = Buffer.concat([
      nameBuffer,
      nullByte,
      typeBuffer,
      classBuffer,
    ]);
    console.log("Question Size: ", question.byteLength);
    return question;
  }

  static decode(
    data: Buffer,
    offset: number
  ): { name: string; byteLength: number } {
    let currentOffset = offset;
    let parts: string[] = [];
    let jumped = false;
    let jumpOffset = -1;

    while (data[currentOffset] !== 0) {
      const length = data[currentOffset];

      // Check for compression
      if ((length & 0xc0) === 0xc0) {
        if (!jumped) {
          jumpOffset = currentOffset + 2;
        }
        currentOffset = ((length & 0x3f) << 8) | data[currentOffset + 1];
        jumped = true;
      } else {
        currentOffset++;
        const part = data
          .subarray(currentOffset, currentOffset + length)
          .toString("binary");
        parts.push(part);
        currentOffset += length;
      }
    }

    if (!jumped) {
      jumpOffset = currentOffset + 1;
    }

    const name = parts.join(".");
    const byteLength = jumpOffset - offset + 4; // +4 for type and classCode
    return { name, byteLength };
  }

  static read(value: Buffer): IDNSQuestion {
    const decoded = this.decode(value, 0);
    const domainName = decoded.name;
    let offset = decoded.byteLength - 4; // Subtract 4 to get the correct offset for type and classCode
    const type = value.readUInt16BE(offset);
    offset += 2;
    const classCode = value.readUInt16BE(offset);
    return {
      name: domainName,
      type: type,
      classCode: classCode,
    };
  }
}

export default Question;
