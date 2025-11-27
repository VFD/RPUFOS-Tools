/**
 * ------------------------------------------------------------
 *  Project : to convert BIN to WAV 
 *  File    : wav.js
 *  Author  : VincentD
 *  Date    : 2025-11-27
 *  License : CC BY-NC 4.0 International
 * ------------------------------------------------------------
 *  Description:
 *    - Handles WAV conversion with options
 *    - Supports Raw PCM, FSK, Manchester, PWM encodings
 *    - Parses hex dump textarea (ignores offsets and ASCII)
 *    - Adds console logs for debugging
 *
 *  Notes:
 *    - Experimental
 *    - Compatible with GitHub Pages.
 * ------------------------------------------------------------
 */


document.addEventListener("DOMContentLoaded", () => {
  console.log("Wav.js initialized.");

  const downloadBtn = document.getElementById("downloadBtn");
  const textArea = document.getElementById("fileContent");

  const srSelect = document.getElementById("wavSampleRate");
  const bitDepthSelect = document.getElementById("wavBitDepth");
  const channelsSelect = document.getElementById("wavChannels");
  const encodingSelect = document.getElementById("wavEncoding");

  if (!downloadBtn || !textArea || !srSelect || !bitDepthSelect || !channelsSelect || !encodingSelect) {
    console.error("Missing required DOM elements for WAV conversion. Check IDs: downloadBtn, fileContent, wavSampleRate, wavBitDepth, wavChannels, wavEncoding.");
    return;
  }

  downloadBtn.addEventListener("click", () => {
    console.log("Download button clicked.");

    const dumpText = (textArea.value || "").trim();
    if (!dumpText) {
      console.warn("No content to convert!");
      alert("No content to convert!");
      return;
    }

    // Parse hex dump: extract only 2-hex-digit tokens, ignore offsets and ASCII columns
    const bytes = parseHexDumpToBytes(dumpText);
    if (!bytes || bytes.length === 0) {
      console.warn("Parsed zero bytes from hex dump. Verify dump format.");
      alert("No hex bytes found to convert.");
      return;
    }
    console.log("Parsed", bytes.length, "bytes from hex dump.");

    // Read options
    const sampleRate = parseInt(srSelect.value, 10);
    const bitDepth = parseInt(bitDepthSelect.value, 10);
    const numChannels = parseInt(channelsSelect.value, 10);
    const encoding = encodingSelect.value;

    console.log("Options:", { sampleRate, bitDepth, numChannels, encoding });

    // Convert according to encoding
    let pcmSamples;
    switch (encoding) {
      case "raw":
        // Raw PCM: interpret bytes as already PCM for chosen bit depth
        pcmSamples = convertRaw(bytes, { bitDepth });
        break;

      case "fsk":
        // FSK defaults (Kansas City style variant)
        pcmSamples = encodeFSKFromBytes(bytes, {
          sampleRate,
          baud: 1200,
          f0: 1200,
          f1: 2400,
          amplitude: 0.9,
          wave: "sine",
          preambleSeconds: 1.0,
          trailerSeconds: 0.3,
          bitOrder: "lsb",
          addStartStop: false
        });
        break;

      case "manchester":
        // Manchester defaults
        pcmSamples = encodeManchesterFromBytes(bytes, {
          sampleRate,
          baud: 1200,
          amplitude: 0.9,
          carrierFreq: 0,   // DC level biphase (no carrier)
          bitOrder: "lsb"
        });
        break;

      case "pwm":
        // PWM defaults (tune for ZX81-like)
        pcmSamples = encodePWMFromBytes(bytes, {
          sampleRate,
          pulseHigh: 0.0006,
          pulseLow: 0.0003,
          gap: 0.0003,
          amplitude: 0.9,
          bitOrder: "lsb"
        });
        break;

      default:
        console.error("Unknown encoding:", encoding);
        alert("Unknown encoding: " + encoding);
        return;
    }

    console.log("Generated", pcmSamples.length, "PCM samples (float domain).");

    // Convert float samples to PCM byte array for chosen bit depth
    const pcmBytes = floatToPcm(pcmSamples, { bitDepth });
    console.log("Converted to", bitDepth, "bit PCM. Byte length:", pcmBytes.byteLength || pcmBytes.length);

    // Build WAV
    const wavBuffer = createWav(pcmBytes, { sampleRate, numChannels, bitDepth });
    const blob = new Blob([wavBuffer], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "output.wav";
    a.click();
    URL.revokeObjectURL(url);
    console.log("WAV file generated and download triggered.");
  });

  /* ===========================
     Hex dump parsing
     =========================== */
  function parseHexDumpToBytes(text) {
    console.log("Parsing hex dump into bytes...");
    // Strategy:
    // - Split by whitespace
    // - Keep tokens that are exactly 2 hex digits
    const tokens = text.split(/\s+/);
    const byteTokens = tokens.filter(t => /^[0-9a-f]{2}$/i.test(t));
    const arr = new Uint8Array(byteTokens.map(h => parseInt(h, 16)));
    console.log("Tokens:", tokens.length, "Byte tokens:", byteTokens.length);
    return arr;
  }

  /* ===========================
     Encoders: helpers and waves
     =========================== */
  function sineSample(t, freq, amp, sr) {
    return Math.sin(2 * Math.PI * freq * (t / sr)) * amp;
  }
  function squareSample(t, freq, amp, sr) {
    const phase = (freq * t / sr) % 1;
    return (phase < 0.5 ? 1 : -1) * amp;
  }
  function clamp16(x) { return Math.max(-32767, Math.min(32767, x | 0)); }
  function toPcm8(x, amp8 = 127, mid = 128) {
    return Math.max(0, Math.min(255, (x * amp8 + mid) | 0));
  }

  function bytesToBits(bytes, {
    bitOrder = "lsb",
    addStartStop = false,
    startBit = 0,
    stopBits = 1,
    parity = null  // "even" | "odd" | null
  } = {}) {
    const bits = [];
    for (const b of bytes) {
      if (addStartStop) bits.push(startBit);
      let ones = 0;
      for (let i = 0; i < 8; i++) {
        const bit = bitOrder === "lsb" ? ((b >> i) & 1) : ((b >> (7 - i)) & 1);
        bits.push(bit);
        ones += bit;
      }
      if (parity) {
        const p = (parity === "even") ? (ones % 2 === 0 ? 0 : 1) : (ones % 2 === 0 ? 1 : 0);
        bits.push(p);
      }
      if (addStartStop) for (let s = 0; s < stopBits; s++) bits.push(1);
    }
    return bits;
  }

  /* ===========================
     Raw PCM converter
     =========================== */
  function convertRaw(bytes, { bitDepth = 8 } = {}) {
    console.log("Converting raw bytes to float samples for bitDepth", bitDepth);
    // Interpret input bytes as already PCM samples; convert to float domain for uniform handling
    const out = new Array(bytes.length);
    if (bitDepth === 8) {
      for (let i = 0; i < bytes.length; i++) {
        out[i] = (bytes[i] - 128) / 127; // center around 0
      }
    } else {
      // If 16-bit expected but we have 8-bit bytes, upsample naïvely
      for (let i = 0; i < bytes.length; i++) {
        out[i] = (bytes[i] - 128) / 127;
      }
    }
    return out;
  }

  /* ===========================
     FSK encoder from bytes
     =========================== */
  function encodeFSKFromBytes(bytes, {
    sampleRate = 11025,
    baud = 1200,
    f0 = 1200,
    f1 = 2400,
    amplitude = 0.9,
    wave = "sine",
    preambleSeconds = 1.0,
    trailerSeconds = 0.3,
    bitOrder = "lsb",
    addStartStop = false
  } = {}) {
    console.log("Encoding FSK:", { sampleRate, baud, f0, f1, amplitude, wave, preambleSeconds, trailerSeconds, bitOrder, addStartStop });
    const bits = bytesToBits(bytes, { bitOrder, addStartStop });
    const samples = [];
    const bitSamples = Math.round(sampleRate / baud);
    const waveFn = wave === "square" ? squareSample : sineSample;

    // Preamble (use f1)
    const preLen = Math.round(sampleRate * preambleSeconds);
    for (let i = 0; i < preLen; i++) samples.push(waveFn(i, f1, amplitude, sampleRate));

    let t = preLen;
    for (const bit of bits) {
      const freq = bit ? f1 : f0;
      for (let i = 0; i < bitSamples; i++, t++) {
        samples.push(waveFn(t, freq, amplitude, sampleRate));
      }
    }

    // Trailer: silence
    const trLen = Math.round(sampleRate * trailerSeconds);
    for (let i = 0; i < trLen; i++) samples.push(0);

    return samples;
  }

  /* ===========================
     Manchester encoder from bytes
     =========================== */
  function encodeManchesterFromBytes(bytes, {
    sampleRate = 11025,
    baud = 1200,
    amplitude = 0.9,
    carrierFreq = 0, // 0 = DC biphase, else modulate with carrier
    bitOrder = "lsb"
  } = {}) {
    console.log("Encoding Manchester:", { sampleRate, baud, amplitude, carrierFreq, bitOrder });
    const bits = bytesToBits(bytes, { bitOrder });
    const samples = [];
    const halfBit = Math.round(sampleRate / (2 * baud));
    const waveFn = carrierFreq ? sineSample : null;
    let t = 0;

    for (const bit of bits) {
      const firstSign = bit ? -1 : 1;
      const secondSign = -firstSign;

      for (let i = 0; i < halfBit; i++, t++) {
        const v = carrierFreq ? waveFn(t, carrierFreq, amplitude, sampleRate) : firstSign * amplitude;
        samples.push(v);
      }
      for (let i = 0; i < halfBit; i++, t++) {
        const v = carrierFreq ? waveFn(t, carrierFreq, amplitude, sampleRate) : secondSign * amplitude;
        samples.push(v);
      }
    }
    return samples;
  }

  /* ===========================
     PWM encoder from bytes
     =========================== */
  function encodePWMFromBytes(bytes, {
    sampleRate = 11025,
    pulseHigh = 0.0006,
    pulseLow = 0.0003,
    gap = 0.0003,
    amplitude = 0.9,
    bitOrder = "lsb"
  } = {}) {
    console.log("Encoding PWM:", { sampleRate, pulseHigh, pulseLow, gap, amplitude, bitOrder });
    const bits = bytesToBits(bytes, { bitOrder });
    const samples = [];
    const hiLen1 = Math.round(sampleRate * pulseHigh);
    const hiLen0 = Math.round(sampleRate * pulseLow);
    const gapLen = Math.round(sampleRate * gap);

    for (const bit of bits) {
      const highLen = bit ? hiLen1 : hiLen0;
      for (let i = 0; i < highLen; i++) samples.push(amplitude);
      for (let i = 0; i < gapLen; i++) samples.push(-amplitude);
    }
    return samples;
  }

  /* ===========================
     Float to PCM conversion
     =========================== */
  function floatToPcm(samplesFloat, { bitDepth = 8 } = {}) {
    console.log("Converting float samples to", bitDepth, "bit PCM.");
    if (bitDepth === 8) {
      const out = new Uint8Array(samplesFloat.length);
      for (let i = 0; i < samplesFloat.length; i++) out[i] = toPcm8(samplesFloat[i]);
      return out;
    } else {
      const out = new Int16Array(samplesFloat.length);
      for (let i = 0; i < samplesFloat.length; i++) out[i] = clamp16(samplesFloat[i] * 32767);
      return out;
    }
  }

  /* ===========================
     WAV file writer
     =========================== */
  function createWav(samples, { sampleRate, numChannels, bitDepth }) {
    console.log("Creating WAV from", samples.length || samples.byteLength, "samples (or bytes).");
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;

    // Normalize samples to a byte array
    let dataBytes;
    if (bitDepth === 8 && samples instanceof Uint8Array) {
      dataBytes = samples;
    } else if (bitDepth === 16 && samples instanceof Int16Array) {
      dataBytes = new Uint8Array(samples.buffer);
    } else {
      // Fallback if a different typed array was provided
      dataBytes = samples instanceof ArrayBuffer ? new Uint8Array(samples) :
                  samples.buffer ? new Uint8Array(samples.buffer) :
                  new Uint8Array(samples);
    }

    const dataSize = dataBytes.byteLength;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    let o = 0;

    writeStr(view, o, "RIFF"); o += 4;
    view.setUint32(o, 36 + dataSize, true); o += 4;
    writeStr(view, o, "WAVE"); o += 4;

    writeStr(view, o, "fmt "); o += 4;
    view.setUint32(o, 16, true); o += 4;
    view.setUint16(o, 1, true); o += 2; // PCM format
    view.setUint16(o, numChannels, true); o += 2;
    view.setUint32(o, sampleRate, true); o += 4;
    view.setUint32(o, byteRate, true); o += 4;
    view.setUint16(o, blockAlign, true); o += 2;
    view.setUint16(o, bitDepth, true); o += 2;

    writeStr(view, o, "data"); o += 4;
    view.setUint32(o, dataSize, true); o += 4;

    // Copy samples
    for (let i = 0; i < dataBytes.length; i++, o++) {
      view.setUint8(o, dataBytes[i]);
    }

    console.log("WAV buffer created, total size:", buffer.byteLength);
    return buffer;
  }

  function writeStr(view, off, s) {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  }
});


// -------------------- EOF --------------------