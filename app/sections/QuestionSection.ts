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

  static read(data: Buffer, offset: number): { question: IDNSQuestion, newOffset: number } {
    const { name, newOffset } = Question.decodeName(data, offset);
    offset = newOffset;
    const type = data.readUInt16BE(offset);
    offset += 2;
    const classCode = data.readUInt16BE(offset);
    offset += 2;

    return {
      question: { 
        name, 
        type: type as QuestionType, 
        classCode: classCode as QuestionClass 
      },
      newOffset: offset
    };
  }

  static decodeName(data: Buffer, offset: number): { name: string, newOffset: number } {
    const parts: string[] = [];
    const startOffset = offset;
    
    while (true) {
      const length = data[offset];
      if (length === 0) {
        offset++;
        break;
      }
      
      if ((length & 0xc0) === 0xc0) {
        const pointerOffset = ((length & 0x3f) << 8) | data[offset + 1];
        const { name } = Question.decodeName(data, pointerOffset);
        parts.push(name);
        offset += 2;
        break;
      }
      
      offset++;
      parts.push(data.slice(offset, offset + length).toString('ascii'));
      offset += length;
    }
    
    return { name: parts.join('.'), newOffset: offset };
  }

  static decode(data: Buffer): string {
    let offset: number = 0;
    let parts: string[] = [];

    while (data[offset] !== 0) {
      const length = data[offset];
      offset++;

      const part = data.subarray(offset, offset + length).toString("binary");
      parts.push(part);

      offset += length;
    }

    return parts.join(".");
  }
}

export default Question;
