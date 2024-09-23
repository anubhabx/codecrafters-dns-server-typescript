export interface INDSAnswer {
  name: string;
  type: number;
  classCode: number;
  ttl: number;
  rdlength: number;
  rdata?: any;
}

class Answer {
  static write(values: INDSAnswer) {
    const str = values.name
      .split(".")
      .map((n) => `${String.fromCharCode(n.length)}${n}`)
      .join("");

    const data = Buffer.alloc(10 + (values.rdata ? values.rdata.length : 0));

    data.writeInt16BE(values.type);
    data.writeInt16BE(values.classCode, 2);
    data.writeInt32BE(values.ttl, 4);
    data.writeInt16BE(values.rdlength, 8);

    if (values.rdata) {
      data.write(values.rdata, 10);
    }

    const answer = Buffer.concat([Buffer.from(str + "\0", "binary"), data]);

    return answer;
  }
}

export default Answer;
