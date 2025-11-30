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

/* ============================================================
   File: phcToWav.js
   Description: Convert PHC binary files to WAV format in browser.
                Faithful port of C# WaveConversion.cs and WaveData.cs.
   Author: VincentD (ported to JS)
   Created: December 1, 2025
   ============================================================

   OVERVIEW
   --------
   - Load PHC file and show hex dump in left textarea.
   - Convert PHC bytes into WAV audio payload (silence, sync bits,
     framed header, program data, tail sync, trailing silence).
   - Build valid RIFF/WAVE header (PCM 8-bit mono, 9600 Hz).
   - Show logical frames or hex dump of WAV in right textarea.
   - Save WAV file with same name but .wav extension.
   - Adjust font size of both textareas with A- / A+ buttons.

   ============================================================ */


/* ==========================
   Global State
   ========================== */

let loadedBytes = null;        // PHC file bytes
let loadedFileName = "";       // Original filename
let convertedWavBytes = null;  // WAV result


/* ==========================
   Utility Functions
   ========================== */

/**
 * Format a byte array into hex dump (16 bytes per line).
 * @param {Uint8Array} bytes
 * @returns {string}
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
 * Write 32-bit unsigned integer in little-endian.
 */
function writeUint32LE(value, target, offset) {
  target[offset]     = value & 0xff;
  target[offset + 1] = (value >> 8) & 0xff;
  target[offset + 2] = (value >> 16) & 0xff;
  target[offset + 3] = (value >> 24) & 0xff;
}

/**
 * Write 16-bit unsigned integer in little-endian.
 */
function writeUint16LE(value, target, offset) {
  target[offset]     = value & 0xff;
  target[offset + 1] = (value >> 8) & 0xff;
}

/**
 * Concatenate multiple Uint8Array instances.
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
   WaveData Builder
   ========================== */

class WaveData {
  constructor() { this._data = []; }

  // Raw writers
  addRawByte(b) { this._data.push(b & 0xff); }
  addRawString(s) { for (let c of s) this.addRawByte(c.charCodeAt(0)); }
  addRawShortLE(v) { this._data.push(v & 0xff, (v >> 8) & 0xff); }
  addRawIntLE(v) { this.addRawShortLE(v & 0xffff); this.addRawShortLE((v >> 16) & 0xffff); }
  addRawWaveData(other) { this._data.push(...other._data); }

  // Encoded writers
  addBit(bit) {
    if (bit) {
      this._data.push(0x80,0x00,0x80,0xff,0x80,0x00,0x80,0xff);
    } else {
      this._data.push(0x80,0x00,0x00,0x00,0xff,0xff,0xff,0xff);
    }
  }
  addFramedByte(b) {
    this.addBit(false); // start bit
    for (let i=0;i<8;i++) this.addBit(((b>>i)&1)!==0);
    this.addBit(true); this.addBit(true); this.addBit(true); // stop bits
  }
  addBytes(bytes) { for (let b of bytes) this.addFramedByte(b); }
  addRawRange(count,value){ for(let i=0;i<count;i++) this._data.push(value&0xff); }
  addBitRange(count,value){ for(let i=0;i<count;i++) this.addBit(value); }
  getContent(){ return new Uint8Array(this._data); }
}


/* ==========================
   PHC → WAV Conversion
   ========================== */

function convertPhcToWav(inBytes) {
  const audio = new WaveData();

  // Silence 2s
  audio.addRawRange(9600*2,0x80);

  // Sync 3.5s high bits
  audio.addBitRange(Math.floor(1200*3.5),true);

  // Header (first 16 bytes)
  audio.addBytes(inBytes.slice(0,16));

  // Sync 0.5s high bits
  audio.addBitRange(600,true);

  // Program data (remaining bytes)
  audio.addBytes(inBytes.slice(16));

  // Tail sync
  audio.addBitRange(60,true);

  // Silence 0.6s
  audio.addRawRange(Math.floor(9600*0.6),0x80);

  const payload = audio.getContent();
  const dataSize = payload.length;
  const riffSize = 36+dataSize;

  // WAV header (44 bytes)
  const header = new Uint8Array(44);
  header.set([0x52,0x49,0x46,0x46],0); // "RIFF"
  writeUint32LE(riffSize,header,4);
  header.set([0x57,0x41,0x56,0x45],8); // "WAVE"
  header.set([0x66,0x6d,0x74,0x20],12);// "fmt "
  writeUint32LE(16,header,16);          // PCM block
  writeUint16LE(1,header,20);           // PCM
  writeUint16LE(1,header,22);           // mono
  writeUint32LE(9600,header,24);        // sample rate
  writeUint32LE(9600,header,28);        // byte rate
  writeUint16LE(1,header,32);           // block align
  writeUint16LE(8,header,34);           // bits/sample
  header.set([0x64,0x61,0x74,0x61],36); // "data"
  writeUint32LE(dataSize,header,40);

  return concatUint8([header,payload]);
}


/* ==========================
   UI Wiring
   ========================== */

function updateSourceView(name,bytes){
  document.getElementById("filename").textContent=name||"No file loaded";
  document.getElementById("sourceOutput").value=formatHexDump(bytes||new Uint8Array());
}
function updateWavView(bytes){
  document.getElementById("wavOutput").value=formatHexDump(bytes||new Uint8Array());
}

// Load button
document.getElementById("loadBtn").addEventListener("click",()=>document.getElementById("file").click());

// File input change
document.getElementById("file").addEventListener("change",async e=>{
  const file=e.target.files[0]; if(!file)return;
  loadedBytes=new Uint8Array(await file.arrayBuffer());
  loadedFileName=file.name; convertedWavBytes=null;
  updateSourceView(loadedFileName,loadedBytes);
  updateWavView(new Uint8Array());
});


/**
 * Estimate WAV duration from PHC length (bytes).
 * Formula: 6.81 + 0.01 * (N - 16) seconds
 * @param {number} phcLength
 * @returns {number} seconds
 */
function estimateWavDurationSeconds(phcLength) {
  if (!Number.isFinite(phcLength) || phcLength < 0) return 0;
  return 6.81 + 0.01 * Math.max(0, phcLength - 16);
}

// Update filename and source view
function updateSourceView(name, bytes) {
  document.getElementById("filename").textContent = name || "No file loaded";
  document.getElementById("sourceOutput").value = formatHexDump(bytes || new Uint8Array());
  document.getElementById("duration").textContent = "Duration: N/A";
}

// Update WAV view and duration
function updateWavView(bytes, phcLength) {
  document.getElementById("wavOutput").value = formatHexDump(bytes || new Uint8Array());
  if (phcLength) {
    const seconds = estimateWavDurationSeconds(phcLength);
    document.getElementById("duration").textContent = "Duration: " + seconds.toFixed(2) + " s";
  }
}

// Convert button
document.getElementById("convertBtn").addEventListener("click", () => {
  if (!loadedBytes) {
    alert("No file loaded.");
    return;
  }
  // Perform conversion (still needed for Save)
  convertedWavBytes = convertPhcToWav(loadedBytes);
   // Show logical frames
  document.getElementById("wavOutput").value = formatFrames(loadedBytes);
});



/**
 * Format a single byte into a framed binary string.
 * - Start bit = 0
 * - 8 data bits, LSB-first
 * - Stop bits = 111
 * Example: "0 01010101 111"
 */
function formatFramedByte(b) {
  let bits = [];
  bits.push("0"); // start bit
  for (let i = 0; i < 8; i++) {
    bits.push(((b >> i) & 1) ? "1" : "0");
  }
  bits.push("111"); // stop bits
  return bits.join(" ");
}

/**
 * Format the PHC file into logical frames.
 * - Header (first 16 bytes)
 * - Program (remaining bytes)
 * - Tail sync and silence
 */
function formatFrames(phcBytes) {
  let lines = [];

  // Header section
  lines.push("=== HEADER FRAMES ===");
  for (let i = 0; i < 16 && i < phcBytes.length; i++) {
    lines.push("Byte " + i + ": " + formatFramedByte(phcBytes[i]));
  }

  // Program section
  lines.push("\n=== PROGRAM FRAMES ===");
  for (let i = 16; i < phcBytes.length; i++) {
    lines.push("Byte " + i + ": " + formatFramedByte(phcBytes[i]));
  }

  // Tail section
  lines.push("\n=== TAIL / SYNC ===");
  lines.push("60 × '1' bits (sync)");
  lines.push("0.6s silence");

  return lines.join("\n");
}




// Save button
document.getElementById("saveBtn").addEventListener("click",()=>{
  if(!convertedWavBytes){alert("No converted WAV available.");return;}
  const wavName=loadedFileName.replace(/\.[^.]+$/,"")+".wav";
  const blob=new Blob([convertedWavBytes],{type:"audio/wav"});
  const link=document.createElement("a");
  link.href=URL.createObjectURL(blob);
  link.download=wavName; link.click();
  setTimeout(()=>URL.revokeObjectURL(link.href),5000);
});


/* ==========================
   Text Size Controls (A- / A+)
   ========================== */

let currentFontSize = 16; // initial font size in px

function changeTextSize(delta) {
  currentFontSize = Math.max(8, currentFontSize + delta);
  document.getElementById("sourceOutput").style.fontSize = currentFontSize + "px";
  document.getElementById("wavOutput").style.fontSize = currentFontSize + "px";
}

// Wire buttons
document.getElementById("increaseText").addEventListener("click", () => changeTextSize(2));
document.getElementById("decreaseText").addEventListener("click", () => changeTextSize(-2));



// -------------------- EOF --------------------