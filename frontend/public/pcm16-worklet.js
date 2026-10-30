class PCM16Worklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ratio = sampleRate / 16000;
    this.pos = 0;
    this.last = 0;
    this.out = new Int16Array(512);
    this.n = 0;
  }
  process(inputs) {
    const x = inputs[0][0];
    if (!x) return true;
    const len = x.length;
    while (true) {
      const i = Math.floor(this.pos);
      if (i + 1 >= len) break;
      const a = i < 0 ? this.last : x[i];
      const s = a + (x[i + 1] - a) * (this.pos - i);
      this.out[this.n++] = Math.max(-1, Math.min(1, s)) * 32767;
      if (this.n === 512) {
        this.port.postMessage(this.out.buffer, [this.out.buffer]);
        this.out = new Int16Array(512);
        this.n = 0;
      }
      this.pos += this.ratio;
    }
    this.pos -= len;
    this.last = x[len - 1];
    return true;
  }
}
registerProcessor("pcm16", PCM16Worklet);
