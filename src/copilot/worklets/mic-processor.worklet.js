// mic-processor.worklet.js
class MicProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.buffer = [];
    // Calculate ratio based on the actual AudioContext sample rate
    // sampleRate is a global variable in AudioWorkletProcessor representing the context's sample rate
    // For a typical 48kHz AudioContext: ratio = 48000 / 8000 = 6
    this.ratio = sampleRate / 8000;
    this.sequenceNumber = 0;
    this.timestamp = 0;
    this.ssrc = Math.floor(Math.random() * 0xFFFFFFFF); // Random SSRC
  }

  process(inputs) {
    const input = inputs[0][0];
    if (!input) return true;

    // Downsample from 48kHz -> 8kHz
    for (let i = 0; i < input.length; i += this.ratio) {
      const idx = Math.floor(i);
      const sample = input[idx];
      const mu = this.encodeMuLaw(sample);
      this.buffer.push(mu);
    }

    // Send in RTP chunks (160 samples = 20 ms @ 8 kHz)
    const CHUNK = 160;
    while (this.buffer.length >= CHUNK) {
      const frame = this.buffer.splice(0, CHUNK);
      const rtpPacket = this.createRTPPacket(frame);
      this.port.postMessage(rtpPacket);
    }

    return true;
  }

  createRTPPacket(pcmuData) {
    // RTP Header (12 bytes)
    const header = new Uint8Array(12);
    
    // Version (2 bits) + Padding (1 bit) + Extension (1 bit) + CSRC Count (4 bits)
    header[0] = 0x80; // Version 2, no padding, no extension, no CSRC
    
    // Marker (1 bit) + Payload Type (7 bits) - PCMU = 0
    header[1] = 0x00; // No marker, PCMU payload type
    
    // Sequence Number (16 bits)
    header[2] = (this.sequenceNumber >> 8) & 0xFF;
    header[3] = this.sequenceNumber & 0xFF;
    this.sequenceNumber++;
    
    // Timestamp (32 bits) - 8kHz sample rate
    header[4] = (this.timestamp >> 24) & 0xFF;
    header[5] = (this.timestamp >> 16) & 0xFF;
    header[6] = (this.timestamp >> 8) & 0xFF;
    header[7] = this.timestamp & 0xFF;
    this.timestamp += 160; // 160 samples = 20ms @ 8kHz
    
    // SSRC (32 bits)
    header[8] = (this.ssrc >> 24) & 0xFF;
    header[9] = (this.ssrc >> 16) & 0xFF;
    header[10] = (this.ssrc >> 8) & 0xFF;
    header[11] = this.ssrc & 0xFF;
    
    // Combine header + payload
    const rtpPacket = new Uint8Array(12 + pcmuData.length);
    rtpPacket.set(header, 0);
    rtpPacket.set(pcmuData, 12);
    
    return rtpPacket;
  }

  encodeMuLaw(sample) {
    const BIAS = 0x84;
    const MAX = 32635;
    const sign = sample < 0 ? 0x80 : 0;
    let s = Math.abs(sample);
    s = Math.min(s, 1.0);
    let s16 = Math.floor(s * 32767);
    if (s16 > MAX) s16 = MAX;
    s16 = s16 + BIAS;
    let exponent = 7;
    for (let expMask = 0x4000; (s16 & expMask) === 0 && exponent > 0; expMask >>= 1) exponent--;
    const mantissa = (s16 >> (exponent + 3)) & 0x0F;
    const muLaw = ~(sign | (exponent << 4) | mantissa);
    return muLaw & 0xff;
  }
}

registerProcessor('mic-processor', MicProcessor);



