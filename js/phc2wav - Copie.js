/**
 * ------------------------------------------------------------
 *  Project : Nom du projet
 *  File    : CharEdit.js
 *  Author  : VincentD
 *  Date    : 2025-11-26
 *  License : CC BY-NC 4.0 International
 * ------------------------------------------------------------
 *  Description:
 *    
 *
 *  Notes:
 *    - Compatible with GitHub Pages.
 *    - 
 * ------------------------------------------------------------
 */

/* ============================================================
   File: phcToWav.js
   Description: Convert PHC binary files to WAV format in browser.
                This is a faithful port of the provided C# logic
                (WaveConversion.cs and WaveData.cs), designed for
                cassette restoration and valid PCM WAV output.
   Author: VincentD (ported to JS)
   Created: December 1, 2025
   ============================================================

   OVERVIEW
   --------
   The application performs the following:
   1) UI: Load a PHC file, display its hex dump in a "source" textarea.
   2) Conversion: Encode PHC bytes into an audio payload as per C# logic:
      - Silence, synchronization high bits, framed header (16 bytes),
        more high bits, framed program bytes, tail sync, trailing silence.
   3) WAV Header: Build a valid RIFF/WAVE header for 8-bit PCM, mono, 9600 Hz.
   4) UI: Display the hex dump of the converted WAV in a second textarea.
   5) Save: Download the WAV file to disk with .wav extension.
   6) Accessibility: A- / A+ buttons to adjust font size of both textareas.

   DESIGN NOTES
   ------------
   - Sample rate is 9600 Hz (matches the C# implementation).
   - Each "bit" is encoded into 8 bytes of 8-bit PCM values, following
     the exact patterns used in the C# WaveData.Add(bool) method.
   - Byte framing: 1 start bit (false), 8 data bits LSB-first, 3 stop bits (true).
   - All values are written in little-endian format for the WAV header.
   - The UI is minimal, and CSS provided by the user styles the layout.

   SAFETY / ROBUSTNESS
   -------------------
   - Basic checks ensure a file is loaded before conversion or saving.
   - Hex dump formatter uses 16 bytes per line for readability.
   - The Save process uses Blob and a temporary object URL.

   ============================================================ */


/* ==========================
   Global State (UI and Data)
   ========================== */

/**
 * Raw bytes of the loaded PHC file.
 * - Set when user selects a file via the hidden <input type="file">.
 * - Cleared or replaced on a new load.
 * @type {Uint8Array|null}
 */
let loadedBytes = null;

/**
 * Original filename of the loaded PHC file.
 * - Used for display and for deriving the WAV filename on save.
 * @type {string}
 */
let loadedFileName = "";

/**
 * Bytes of the converted WAV file (header + payload).
 * - Set after a successful conversion.
 * @type {Uint8Array|null}
 */
let convertedWavBytes = null;


/* ==========================
   Utility Functions
   ========================== */

/**
 * Format a byte array into a human-readable hex dump (16 bytes per line).
 * - This function mirrors standard hexdump layouts without offsets/ASCII,
 *   focusing on raw hex values for clarity.
 * @param {Uint8Array} bytes - The byte array to format.
 * @returns {string} - Lines of hex text, 16 bytes per line.
 */
function formatHexDump(bytes) {
  if (!bytes || bytes.length === 0) return "";
  const lines = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const slice = bytes.slice(i, i + 16);
    const hex = Array.from(slice)
      .map(b => b.toString(16).padStart(2, "0"))
      .join(" ");
    lines.push(hex);
  }
  return lines.join("\n");
}

/**
 * Write a 32-bit unsigned integer in little-endian format into a Uint8Array.
 * - Used for WAV header fields: chunk sizes, sample rate, byte rate, etc.
 * @param {number} value - 32-bit unsigned integer value.
 * @param {Uint8Array} target - The byte array to write into.
 * @param {number} offset - The starting index for the write.
 */
function writeUint32LE(value, target, offset) {
  target[offset]     = value & 0xff;
  target[offset + 1] = (value >> 8) & 0xff;
  target[offset + 2] = (value >> 16) & 0xff;
  target[offset + 3] = (value >> 24) & 0xff;
}

/**
 * Write a 16-bit unsigned integer in little-endian format into a Uint8Array.
 * - Used for WAV header fields: audio format, channels, block align, etc.
 * @param {number} value - 16-bit unsigned integer value.
 * @param {Uint8Array} target - The byte array to write into.
 * @param {number} offset - The starting index for the write.
 */
function writeUint16LE(value, target, offset) {
  target[offset]     = value & 0xff;
  target[offset + 1] = (value >> 8) & 0xff;
}

/**
 * Concatenate multiple Uint8Array instances into one new array.
 * - Used to combine the WAV header and the audio payload.
 * @param {Uint8Array[]} arrays - An array of Uint8Array instances.
 * @returns {Uint8Array} - A new array containing all the bytes in sequence.
 */
function concatUint8(arrays) {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const a of arrays) {
    out.set(a, pos);
    pos += a.length;
  }
  return out;
}


/* ==========================
   WaveData Builder (Port)
   ========================== */

/**
 * WaveData class mirrors the C# WaveData helper.
 * It accumulates bytes in an internal array, providing:
 * - Raw writers (bytes, strings, little-endian integers).
 * - Encoded writers for bits/bytes with framing.
 * - Range writers for silence and repeated bit patterns.
 * - Finalization to Uint8Array.
 */
class WaveData {
  /**
   * Internal storage of raw bytes as a simple JS number array.
   * - We use a number[] for push efficiency, converting to Uint8Array at the end.
   */
  constructor() {
    /** @type {number[]} */
    this._data = [];
  }

  /* ----- Raw Writers (no encoding) ----- */

  /**
   * Add a raw byte (0–255) directly to the data.
   * @param {number} b - Byte value.
   */
  addRawByte(b) {
    this._data.push(b & 0xff);
  }

  /**
   * Add a raw ASCII string (each charCode truncated to 8 bits).
   * @param {string} s - ASCII string.
   */
  addRawString(s) {
    for (let i = 0; i < s.length; i++) {
      this.addRawByte(s.charCodeAt(i) & 0xff);
    }
  }

  /**
   * Add a raw 16-bit little-endian integer.
   * @param {number} value - 16-bit value.
   */
  addRawShortLE(value) {
    this._data.push(value & 0xff, (value >> 8) & 0xff);
  }

  /**
   * Add a raw 32-bit little-endian integer.
   * - Implemented as two 16-bit writes for parity with the C# approach.
   * @param {number} value - 32-bit value.
   */
  addRawIntLE(value) {
    this.addRawShortLE(value & 0xffff);
    this.addRawShortLE((value >> 16) & 0xffff);
  }

  /**
   * Add raw bytes from another WaveData instance.
   * @param {WaveData} other - source WaveData to append.
   */
  addRawWaveData(other) {
    this._data.push(...other._data);
  }

  /* ----- Encoded Writers (bits and framed bytes) ----- */

  /**
   * Add a single encoded bit into the PCM payload as 8 bytes.
   * Patterns mirror C# WaveData.Add(bool):
   * - true  => [0x80, 0x00, 0x80, 0xff, 0x80, 0x00, 0x80, 0xff]
   * - false => [0x80, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff]
   * These emulate a square-like waveform suitable for tape-style signaling.
   * @param {boolean} bit - true or false.
   */
  addBit(bit) {
    if (bit) {
      this._data.push(0x80, 0x00, 0x80, 0xff, 0x80, 0x00, 0x80, 0xff);
    } else {
      this._data.push(0x80, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff);
    }
  }

  /**
   * Add one framed data byte with start/data/stop bits:
   * - Start bit: false (1 bit)
   * - Data bits: 8 bits, LSB-first (bit 0 first, bit 7 last)
   * - Stop bits: three true bits (3 bits)
   * Each bit emits 8 PCM bytes via addBit().
   * @param {number} b - Byte value to frame and encode.
   */
  addFramedByte(b) {
    // Start bit (false)
    this.addBit(false);

    // 8 data bits, least-significant bit first
    for (let i = 0; i < 8; i++) {
      const bit = ((b >> i) & 1) !== 0;
      this.addBit(bit);
    }

    // Stop bits: 3 × true
    this.addBit(true);
    this.addBit(true);
    this.addBit(true);
  }

  /**
   * Add multiple framed bytes from a Uint8Array or number[].
   * @param {Uint8Array|number[]} bytes - Sequence of byte values.
   */
  addBytes(bytes) {
    for (let i = 0; i < bytes.length; i++) {
      this.addFramedByte(bytes[i] & 0xff);
    }
  }

  /**
   * Add N identical raw bytes (used for silence segments).
   * @param {number} count - How many bytes to write.
   * @param {number} value - The byte value to repeat.
   */
  addRawRange(count, value) {
    for (let i = 0; i < count; i++) {
      this._data.push(value & 0xff);
    }
  }

  /**
   * Add N encoded bits of a given boolean value.
   * @param {number} count - Number of bits to add.
   * @param {boolean} value - Bit value (true/false).
   */
  addBitRange(count, value) {
    for (let i = 0; i < count; i++) {
      this.addBit(value);
    }
  }

  /**
   * Finalize and obtain the content as a Uint8Array.
   * @returns {Uint8Array} - Raw bytes accumulated so far.
   */
  getContent() {
    return new Uint8Array(this._data);
  }
}


/* ==========================
   PHC → WAV Conversion Logic
   ========================== */

/**
 * Convert PHC bytes into a valid WAV file (header + audio payload).
 * This function mirrors the C# WaveConversion constructor behavior:
 * 1) Build payload:
 *    - 2.0s silence (9600 * 2 samples of 0x80)
 *    - 3.5s of high bits (true) at 1200 bits per second
 *    - 16-byte header (framed bytes)
 *    - 0.5s of high bits (true)
 *    - Program data (remaining bytes as framed bytes)
 *    - 60 high bits (true)
 *    - 0.6s silence
 * 2) Build header:
 *    - RIFF/WAVE PCM, mono, 8 bits, 9600 Hz
 * 3) Concatenate header and payload.
 *
 * Timing note:
 * - With 9600 Hz sample rate and 8 PCM bytes per bit, the effective bit rate is 1200 bps.
 * - This matches the C# design; the addBitRange counts (e.g., 1200*3.5) reflect bit counts.
 *
 * @param {Uint8Array} inBytes - Raw PHC bytes (entire file).
 * @returns {Uint8Array} - Complete WAV file bytes.
 */
function convertPhcToWav(inBytes) {
  // 1) Build audio payload
  const audio = new WaveData();

  // 2.0 seconds of silence: 9600 samples per second × 2 seconds = 19200 bytes of 0x80
  audio.addRawRange(9600 * 2, 0x80);

  // 3.5 seconds of 'true' bits for synchronization at 1200 bps => 1200 * 3.5 bits
  audio.addBitRange(Math.floor(1200 * 3.5), true);

  // First 16 bytes form the "header" segment, encoded as framed bytes
  const headerBytes = inBytes.slice(0, 16);
  audio.addBytes(headerBytes);

  // 0.5 seconds of 'true' bits (sync) => 600 bits
  audio.addBitRange(600, true);

  // Remaining bytes form the program data, encoded as framed bytes
  const programBytes = inBytes.slice(16);
  audio.addBytes(programBytes);

  // Tail synchronization: 60 'true' bits
  audio.addBitRange(60, true);

  // 0.6 seconds of trailing silence => 9600 * 0.6 ≈ 5760 bytes of 0x80
  audio.addRawRange(Math.floor(9600 * 0.6), 0x80);

  // Final payload
  const payload = audio.getContent();

  // 2) Build WAV header (PCM, mono, 8-bit, 9600 Hz)
  const dataSize = payload.length;
  const riffChunkSize = 36 + dataSize; // Standard RIFF header size + data size

  // Standard 44-byte PCM WAV header layout
  const header = new Uint8Array(44);

  // ChunkID: "RIFF"
  header[0] = 0x52; header[1] = 0x49; header[2] = 0x46; header[3] = 0x46;
  // ChunkSize: 36 + Subchunk2Size (dataSize)
  writeUint32LE(riffChunkSize, header, 4);
  // Format: "WAVE"
  header[8] = 0x57; header[9] = 0x41; header[10] = 0x56; header[11] = 0x45;

  // Subchunk1ID: "fmt "
  header[12] = 0x66; header[13] = 0x6d; header[14] = 0x74; header[15] = 0x20;
  // Subchunk1Size: 16 for PCM
  writeUint32LE(16, header, 16);
  // AudioFormat: 1 (PCM)
  writeUint16LE(1, header, 20);
  // NumChannels: 1 (mono)
  writeUint16LE(1, header, 22);
  // SampleRate: 9600 Hz
  writeUint32LE(9600, header, 24);
  // ByteRate: SampleRate * NumChannels * BitsPerSample/8 = 9600 * 1 * 1 = 9600
  writeUint32LE(9600, header, 28);
  // BlockAlign: NumChannels * BitsPerSample/8 = 1 * 1 = 1
  writeUint16LE(1, header, 32);
  // BitsPerSample: 8
  writeUint16LE(8, header, 34);

  // Subchunk2ID: "data"
  header[36] = 0x64; header[37] = 0x61; header[38] = 0x74; header[39] = 0x61;
  // Subchunk2Size: size of the payload
  writeUint32LE(dataSize, header, 40);

  // 3) Combine header and payload into final WAV file
  return concatUint8([header, payload]);
}


/* ==========================
   UI Wiring (Load, Convert, Save)
   ========================== */

/**
 * Update the "source" textarea with the hex dump of the loaded file,
 * and update the filename display label.
 * @param {string} name - The filename to show in the UI.
 * @param {Uint8Array} bytes - The bytes to display as hex.
 */
function updateSourceView(name, bytes) {
  document.getElementById("filename").textContent = name || "No file loaded";
  document.getElementById("sourceOutput").value = formatHexDump(bytes || new Uint8Array());
}

/**
 * Update the "WAV" textarea with the hex dump of the converted WAV file.
 * @param {Uint8Array} bytes - The bytes to display as hex.
 */
function updateWavView(bytes) {
  document.getElementById("wavOutput").value = formatHexDump(bytes || new Uint8Array());
}

/**
 * Bind the "Load" button to show the hidden file input dialog.
 * - This keeps the UI clean while still allowing file selection.
 */
document.getElementById("loadBtn").addEventListener("click", () => {
  document.getElementById("file").click();
});

/**
 * Handle the file selection from the hidden input:
 * - Reads the file as an ArrayBuffer, wraps it as Uint8Array.
 * - Stores in global state (loadedBytes, loadedFileName).
 * - Clears previous conversion state (convertedWavBytes).
 * - Updates the source view and clears the WAV view.
 */
document.getElementById("file").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  // Read file contents into memory
  loadedBytes = new Uint8Array(await file.arrayBuffer());
  loadedFileName = file.name;
  convertedWavBytes = null; // Reset previous conversion

  // Update UI
  updateSourceView(loadedFileName, loadedBytes);
  updateWavView(new Uint8Array()); // Clear WAV view
});

/**
 * Bind the "Convert" button:
 * - Validates that a file is loaded.
 * - Runs the PHC→WAV conversion (full fidelity).
 * - Displays the converted WAV in the right textarea.
 */
document.getElementById("convertBtn").addEventListener("click", () => {
  if (!loadedBytes) {
    alert("No file loaded.");
    return;
  }

  try {
    // Perform conversion
    convertedWavBytes = convertPhcToWav(loadedBytes);

    // Display the hex dump of the generated WAV
    updateWavView(convertedWavBytes);
  } catch (e) {
    console.error(e);
    alert("Conversion failed: " + (e?.message || e));
  }
});

/**
 * Bind the "Save" button:
 * - Validates that conversion has occurred.
 * - Creates a Blob with type 'audio/wav'.
 * - Triggers a download using an object URL.
 * - Filename: original base name + .wav extension.
 */
document.getElementById("saveBtn").addEventListener("click", () => {
  if (!convertedWavBytes) {
    alert("No converted WAV available. Click Convert first.");
    return;
  }

  // Derive WAV filename from the original input filename
  const wavName = loadedFileName.replace(/\.[^.]+$/, "") + ".wav";

  // Create a Blob and trigger download
  const blob = new Blob([convertedWavBytes], { type: "audio/wav" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = wavName;
  link.click();

  // Revoke the object URL later to free memory
  setTimeout(() => URL.revokeObjectURL(link.href), 5000);
});


/* ==========================
   Text Size Controls (A- / A+)
   ========================== */

/**
 * Current font size (pixels) used by both textareas.
 * - Initialized to 16px, adjustable via the A-/A+ buttons.
 * @type {number}
 */
let currentFontSize = 16;

/**
 * Apply a delta change to the current font size and update both textareas.
 * - Enforces a minimum of 8px to remain readable.
 * @param {number} delta - Positive to increase, negative to decrease.
 */
function changeTextSize(delta) {
  currentFontSize = Math.max(8, currentFontSize + delta);
  document.getElementById("sourceOutput").style.fontSize = currentFontSize + "px";
  document.getElementById("wavOutput").style.fontSize = currentFontSize + "px";
}

/**
 * Wire A+ (increase) and A- (decrease) buttons.
 * - Each click adjusts the font size by 2px.
 */
document.getElementById("increaseText").addEventListener("click", () => changeTextSize(2));
document.getElementById("decreaseText").addEventListener("click", () => changeTextSize(-2));




// -------------------- EOF --------------------