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

    const str = name
      .split(".")
      .map((n) => `${String.fromCharCode(n.length)}${n}`)
      .join("");

    const typeAndClass = Buffer.alloc(4);

    typeAndClass.writeInt16BE(type);
    typeAndClass.writeInt16BE(classCode, 2);

    const question = Buffer.concat([
      Buffer.from(str + "\0", "binary"),
      typeAndClass,
    ]);

    return question;
  }

  static read(data: Buffer): IDNSQuestion {
    let domainName: string = "";
    let offset: number = 0;

    // Concat the string until there is a null character.
    while (data[offset] !== 0) {
      domainName += String.fromCharCode(data[offset]);
      offset++;
    }

    // Skip the null character
    offset++;

    const type = data.readInt16BE(offset);
    const classCode = data.readInt16BE(offset + 2);

    return {
      name: domainName,
      type,
      classCode,
    };
  }
}

export default Question;
