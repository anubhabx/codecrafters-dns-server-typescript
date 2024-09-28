export interface INDSAnswer {
  name: string;
  type: number;
  classCode: number;
  ttl: number;
  rdlength: number;
  rdata: string;
}

class Answer {
  static write(values: INDSAnswer) {
    const labels = values.name.split(".");
    const nameBuffer = Buffer.concat(
      labels.map((label) => {
        const length = Buffer.from([label.length]);
        const labelBuffer = Buffer.from(label, "binary");
        return Buffer.concat([length, labelBuffer]);
      })
    );

    const nullByte = Buffer.from([0]);
    const typeBuffer = Buffer.alloc(2);
    typeBuffer.writeUInt16BE(values.type);

    const classBuffer = Buffer.alloc(2);
    classBuffer.writeUInt16BE(values.classCode);

    const ttlBuffer = Buffer.alloc(4);
    classBuffer.writeUInt16BE(values.ttl);

    const lengthBuffer = Buffer.alloc(2);
    classBuffer.writeUInt16BE(values.rdlength);

    const rdataBuffer = Buffer.from(
      values.rdata.split(".").map((octet) => parseInt(octet, 10))
    );

    console.log("RDATA: ", rdataBuffer.byteLength);

    const answer = Buffer.concat([
      nameBuffer,
      nullByte,
      typeBuffer,
      classBuffer,
      ttlBuffer,
      lengthBuffer,
      rdataBuffer,
    ]);

    console.log("Answer Size: ", answer.byteLength);

    return answer;
  }
}

export default Answer;
