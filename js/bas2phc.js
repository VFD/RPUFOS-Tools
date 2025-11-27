/**
 * ------------------------------------------------------------
 *  Project : BASIC Sanyo PHC-25 to PHC file
 *  File    : bas2phc.js
 *  Author  : VincentD
 *  Date    : 2025-11-26
 *  License : CC BY-NC 4.0 International
 * ------------------------------------------------------------
 *  Description:
 *    - Convert BASIC (text format) to PHC binary file
 *    - PHC file are used in emulator
 *    - Convert the PHC to WAV in another App for real hardware
 *  Notes:
 *    - Compatible with GitHub Pages.
 *    - 
 * ------------------------------------------------------------
 */

/*
  PHC file structure

  - Sync header:
      10 bytes of value A5h

  - Program name:
      6 ASCII characters (padded with 00h if shorter)

  - Program body:
      Repeated blocks of BASIC code encoded in tokens/ASCII
      Each line ends with 00h
      Continue until no more lines

  - End of program marker:
      00h 00h 00h

  - Line index table (stored in reverse order):
      Each entry is 4 bytes:
        AL, AH : memory address of the line (little endian)
        NL, NH : line number (little endian)
      Repeat until no more entries

  - Trailer:
      00h FFh FFh FFh FFh followed by padding with 00h bytes
      (fixed tail section to mark the end of the file)
*/


// Basic Keywords PHC-25 - Order is very important don't change it
// source : G.Fetis
const keyWords = [
  "END","FOR","NEXT","DATA","INPUT","DIM","READ","LET","GOTO","RUN",
  "IF","RESTORE","GOSUB","RETURN","REM","STOP","OUT","ON","LPRINT","DEF",
  "POKE","PRINT","CONT","LIST","LLIST","CLEAR","COLOR","PSET","PRESET","LINE",
  "PAINT","SCREEN","CLS","LOCATE","CONSOLE","CLOAD","CSAVE","EXEC","SOUND","PLAY",
  "KEY","LCOPY","NEW","CTON","CTOFF","SLOAD","SSAVE","ELSE",
  "undoc1","undoc2","undoc3","undoc4","undoc5","undoc6","undoc7","undoc8","undoc9","undoc10",
  "undoc11","undoc12","undoc13","undoc14","undoc15","undoc16","undoc17","undoc18",
  "TAB(","TO","FN","SPC(","INKEY$","THEN","NOT","STEP",
  "+","-","*","/","^","AND","OR",">","=","<",
  "SGN","INT","ABS","USR","FRE","INP","LPOS","POS","SQR","RND","LOG","EXP","COS",
  "SIN","TAN","PEEK","LEN","SCRIN","STR$","VAL","ASC","CHR$","LEFT$","RIGHT$","MID$",
  "POINT","CSRLIN","STICK","STRIG","TIME"
];

// Basic programme start at 0xC001 - 1st ligne
const BASE_ADDR = 0xC001;

// Default file name
let filename = "BAS001";

// --------------------------------------------------
// Match keywords with index 0x80....
// --------------------------------------------------
function keywordToByte(wordUpper) {
  const index = keyWords.findIndex(k => k === wordUpper);
  return index >= 0 ? (0x80 + index) : null;
}

// --------------------------------------------------
//
// --------------------------------------------------
function encodeLineContent(lineText) {
  const bytes = [];
  let i = 0;
  let inString = false;

  while (i < lineText.length) {
    const ch = lineText[i];

    if (ch === '"') {
      inString = !inString;
      bytes.push(0x22);
      i++;
      continue;
    }

    if (!inString) {
      let matchedIndex = -1;
      const upperSlice = lineText.substring(i).toUpperCase();
      for (let k = 0; k < keyWords.length; k++) {
        const kw = keyWords[k];
        if (upperSlice.startsWith(kw)) {
          matchedIndex = k;
          break;
        }
      }
      if (matchedIndex !== -1) {
        bytes.push(0x80 + matchedIndex);
        i += keyWords[matchedIndex].length;
        continue;
      }
    }

    bytes.push(lineText.charCodeAt(i));
    i++;
  }
  // ligne end
  bytes.push(0x00);
  return bytes;
}

// --------------------------------------------------
//
// --------------------------------------------------
function parseLine(txtLine) {
  const m = txtLine.match(/^\s*(\d+)\s+(.*)$/);
  if (!m) return null;
  return { num: parseInt(m[1], 10), content: m[2] };
}

// --------------------------------------------------
//
// --------------------------------------------------
function convertToPHC(txtContent) {
  const linesRaw = txtContent.split(/\r?\n/).filter(l => l.trim().length > 0);
  const parsed = [];
  for (const l of linesRaw) {
    const p = parseLine(l);
    if (p) parsed.push(p);
  }

  const phc = [];

  // Sync A5
  for (let i = 0; i < 10; i++) phc.push(0xA5);

  // File name: 6 bytes, padding with 0x00
  // Remove the file extension from the filename.
  // Example: "program.bas" → "program"
  // \. → matches the dot before the extension.
  // [^/.]+ → matches all characters after the dot until another dot or slash.
  // $ → ensures it’s at the end of the string.
  // replace(..., "") → replaces the extension with nothing, leaving just the base name.
  const baseName = filename.replace(/\.[^/.]+$/, "");
  for (let i = 0; i < 6; i++) {
    if (i < baseName.length) {
      phc.push(baseName.charCodeAt(i));
    } else {
      phc.push(0x00);
    }
  }

  // ⚠️ No separator

  // Encode lignes
  const blocks = [];
  for (const { num, content } of parsed) {
    const bytes = encodeLineContent(content);
    blocks.push({ num, bytes, length: bytes.length });
  }

  for (const b of blocks) phc.push(...b.bytes);

  // End separator
  phc.push(0x00, 0x00);

  // Memory adresses
  const addrs = [];
  let addr = BASE_ADDR;			// 0xC001
  for (const b of blocks) {
    addrs.push(addr);
    addr += b.length;
  }

  // Reverse Table
  for (let i = blocks.length - 1; i >= 0; i--) {
    const a = addrs[i];
    const n = blocks[i].num;
    phc.push(a & 0xFF, (a >> 8) & 0xFF); // adresse LE
    phc.push(n & 0xFF, (n >> 8) & 0xFF); // numéro LE
  }

  // Trailer to end the phc
  phc.push(0x00, 0xFF, 0xFF, 0xFF, 0xFF);
  for (let i = 0; i < 18; i++) phc.push(0x00);

  return phc;
}

// --------------------------------------------------
/**
 * Convert a byte array into a hexadecimal string.
 * Each byte is printed as two hex digits.
 * Bytes are separated by spaces, and a newline is inserted every 16 bytes.
 * Example: [0x00, 0x01, ...] → "00 01 ...\n..."
 */
// --------------------------------------------------
function toHexString(byteArray) {
  return byteArray
    .map((b, i) => {
      const hex = b.toString(16).padStart(2, '0');
      // Add a newline before every 16th byte except the first
      return (i > 0 && i % 16 === 0 ? '\n' : '') + hex;
    })
    .join(' ');
}

// --------------------------------------------------
// Button Load
// --------------------------------------------------
document.getElementById("loadBtn").addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".bas,.txt";
  input.onchange = e => {
    const file = e.target.files[0];
    filename = file.name.replace(/\.[^/.]+$/, "");
    const reader = new FileReader();
    reader.onload = () => {
      document.getElementById("txtInput").value = reader.result;
    };
    reader.readAsText(file);
  };
  input.click();
});

// --------------------------------------------------
// Button Convert
// --------------------------------------------------
document.getElementById("buildBtn").addEventListener("click", () => {
  const txt = document.getElementById("txtInput").value;
  // convert
  const phc = convertToPHC(txt);
  // to show in hex format
  document.getElementById("hexOutput").value = toHexString(phc);
});

// --------------------------------------------------
// Button Save
// --------------------------------------------------
document.getElementById("saveBtn").addEventListener("click", () => {
  const hex = document.getElementById("hexOutput").value.trim();
  if (!hex) return;
  const bytes = hex.split(/\s+/).map(h => parseInt(h, 16));
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/octet-stream" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename.replace(/\.[^/.]+$/, "") + ".phc";
  link.click();
});


// -------------------- EOF --------------------