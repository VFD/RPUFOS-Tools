/**
 * ------------------------------------------------------------
 *  Project : Nom du projet
 *  File    : zxP2txt.js
 *  Author  : VincentD
 *  Date    : 2025-11-26
 *  License : CC BY-NC 4.0 International
 * ------------------------------------------------------------
 *  Description:
 *    - Reads a .P file (ZX81 snapshot)
 *    - Parses the program area
 *    - Translates tokens with a full 256-entry charset
 *    - Skips inline FP numbers except inside REM lines
 *    - Displays the result and allows saving it
 *
 *  Notes:
 *    - Compatible with GitHub Pages.
 *    - 
 * ------------------------------------------------------------
 */


console.log("ZX81 Converter script loaded");

// The original C used "NAK" mapping to "#".
const NAK = "#";

// Full 256-entry charset based on the provided C array.
// Notes:
// - Strings that had trailing spaces in C are kept (e.g., " PRINT ").
// - Some entries are tokens, some are simple characters.
// - Wherever the C had NAK, we put "#". Before there is a check with quadBlocks.
// - 234 is REM; used to control FP skip logic.
const charset = [
  /* 000-009 */ " ", NAK, NAK, NAK, NAK, NAK, NAK, NAK, NAK, NAK,
  /* 010-019 */ NAK, "\"", "£", "$", ":", "?", "(", ")", ">", "<",
  /* 020-029 */ "=", "+", "-", "*", "/", ";", ",", ".", "0", "1",
  /* 030-039 */ "2", "3", "4", "5", "6", "7", "8", "9", "A", "B",
  /* 040-049 */ "C", "D", "E", "F", "G", "H", "I", "J", "K", "L",
  /* 050-059 */ "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V",
  /* 060-069 */ "W", "X", "Y", "Z", "RND", "INKEY$ ", "PI", NAK, NAK, NAK,
  /* 070-079 */ NAK, NAK, NAK, NAK, NAK, NAK, NAK, NAK, NAK, NAK,
  /* 080-089 */ NAK, NAK, NAK, NAK, NAK, NAK, NAK, NAK, NAK, NAK,
  /* 090-099 */ NAK, NAK, NAK, NAK, NAK, NAK, NAK, NAK, NAK, NAK,
  /* 100-109 */ NAK, NAK, NAK, NAK, NAK, NAK, NAK, NAK, NAK, NAK,
  /* 110-119 */ NAK, NAK, NAK, NAK, NAK, NAK, NAK, NAK, NAK, NAK,
  /* 120-129 */ NAK, NAK, NAK, NAK, NAK, NAK, NAK, NAK, NAK, NAK,
  /* 130-139 */ NAK, NAK, NAK, NAK, NAK, NAK, NAK, NAK, NAK, "\"",
  /* 140-149 */ "£", "$", ":", "?", "(", ")", ">", "<", "=", "+",
  /* 150-159 */ "-", "*", "/", ";", ",", ".", "🄌", "➊", "➋", "➌",
  /* 160-169 */ "➍", "➎", "➏", "➐", "➑", "➒", "🅐", "🅑", "🅒", "🅓",
  /* 170-179 */ "🅔", "🅕", "🅖", "🅗", "🅘", "🅙", "🅚", "🅛", "🅜", "🅝",
  /* 180-189 */ "🅞", "🅟", "🅠", "🅡", "🅢", "🅣", "🅤", "🅥", "🅦", "🅧",
  /* 190-199 */ "🅨", "🅩", "\"\"", "AT ", "TAB ", NAK, "CODE ", "VAL ",
				"LEN ", "SIN ",
  /* 200-209 */ "COS ", "TAN ", "ASN ", "ACS ", "ATN ", "LN ", "EXP ",
				"INT ", "SQR ", "SGN ",
  /* 210-219 */ "ABS ", "PEEK ", "USR ", "STR$ ", "CHR$ ", "NOT ",
				"^", " OR ", " AND ", "≤",
  /* 220-229 */ "≥", "≠", " THEN", " TO ", " STEP ", " LPRINT ",
				" LLIST ", " STOP", " SLOW", " FAST",
  /* 230-239 */ " NEW", " SCROLL", " CONT ", " DIM ", " REM ",
				" FOR ", " GOTO ", " GOSUB ", " INPUT ",
				" LOAD ",
  /* 240-249 */ " LIST ", " LET ", " PAUSE ", " NEXT ", " POKE ",
				" PRINT ", " PLOT ", " RUN ", " SAVE ",
				" RAND ",
  /* 250-255 */ " IF ", " CLS", " UNPLOT ", " CLEAR", " RETURN",
				" COPY"
];

// Index of REM token in the charset array (from the C mapping).
const REM_TOKEN = 234;

/*
🄌 ➊ ➋ ➌ ➍ ➎ ➏ ➐ ➑ ➒
🅐 🅑 🅒 🅓 🅔 🅕 🅖 🅗 🅘 🅙
🅚 🅛 🅜 🅝 🅞 🅟 🅠 🅡 🅢 🅣
🅤 🅥 🅦 🅧 🅨 🅩
*/


// Optional semigraphics approximations:
// ZX81 pseudo-graphics are 2×2 mosaics. We approximate some common
// combinations using Unicode block elements. This is experimental.
// If a byte maps to NAK ("#"), and it's in displayable ranges,
// we try substituting with one of these. This is NOT a perfect mapping.
const quadBlocks = {
  "01": "▘",  // upper-left (U+2598)
  "02": "▝",  // upper-right (U+259D)
  "03": "▀",  // upper half (U+2580)
  "04": "▖",  // lower-left (U+2596)
  "05": "▌",  // left half (U+258C)
  "06": "▞",  // diag upper-right + lower-left (U+259E)
  "07": "▛",  // UL+UR+LL (U+259B)
  "08": "▒",  // MEDIUM SHADE (U+2592)
  "09": "🮏",  // INVERSE MEDIUM SHADE (U+1FB8F)
  "0A": "🮎",  // INVERSE CHECKER BOARD FILL (U+1FB8E)
  "80": "█",  // full block (U+2588)
  "81": "▟",  // UR+LL+LR (U+259F)
  "82": "▙",  // UL+LL+LR (U+2599)
  "83": "▄",  // lower half (U+2584)
  "84": "▜",  // UL+UR+LR (U+259C)
  "85": "▐",  // right half (U+2590)
  "86": "▚",  // diag upper-left + lower-right (U+259A)
  "87": "▗",  // QUADRANT LOWER RIGHT (U+2597)
  "88": "🮐",  // BLOCK SEXTANT-1 (U+1FB90)
  "89": "🮑",  // BLOCK SEXTANT-2 (U+1FB91)
  "8A": "🮒",   // BLOCK SEXTANT-3 (U+1FB92)
  "9C": "🄌", // 0 (U+1F10C NEGATIVE CIRCLED DIGIT ZERO)
  "9D": "➊", // 1 (U+278A DINGBAT NEGATIVE CIRCLED DIGIT ONE)
  "9E": "➋", // 2 (U+278B DINGBAT NEGATIVE CIRCLED DIGIT TWO)
  "9F": "➌", // 3 (U+278C DINGBAT NEGATIVE CIRCLED DIGIT THREE)
  "A0": "➍", // 4 (U+278D DINGBAT NEGATIVE CIRCLED DIGIT FOUR)
  "A1": "➎", // 5 (U+278E DINGBAT NEGATIVE CIRCLED DIGIT FIVE)
  "A2": "➏", // 6 (U+278F DINGBAT NEGATIVE CIRCLED DIGIT SIX)
  "A3": "➐", // 7 (U+2790 DINGBAT NEGATIVE CIRCLED DIGIT SEVEN)
  "A4": "➑", // 8 (U+2791 DINGBAT NEGATIVE CIRCLED DIGIT EIGHT)
  "A5": "➒", // 9 (U+2792 DINGBAT NEGATIVE CIRCLED DIGIT NINE)
  "A6": "🅐", // A (U+1F150 NEGATIVE CIRCLED LATIN CAPITAL LETTER A)
  "A7": "🅑", // B (U+1F151 NEGATIVE CIRCLED LATIN CAPITAL LETTER B)
  "A8": "🅒", // C (U+1F152 NEGATIVE CIRCLED LATIN CAPITAL LETTER C)
  "A9": "🅓", // D (U+1F153 NEGATIVE CIRCLED LATIN CAPITAL LETTER D)
  "AA": "🅔", // E (U+1F154 NEGATIVE CIRCLED LATIN CAPITAL LETTER E)
  "AB": "🅕", // F (U+1F155 NEGATIVE CIRCLED LATIN CAPITAL LETTER F)
  "AC": "🅖", // G (U+1F156 NEGATIVE CIRCLED LATIN CAPITAL LETTER G)
  "AD": "🅗", // H (U+1F157 NEGATIVE CIRCLED LATIN CAPITAL LETTER H)
  "AE": "🅘", // I (U+1F158 NEGATIVE CIRCLED LATIN CAPITAL LETTER I)
  "AF": "🅙", // J (U+1F159 NEGATIVE CIRCLED LATIN CAPITAL LETTER J)
  "B0": "🅚", // K (U+1F15A NEGATIVE CIRCLED LATIN CAPITAL LETTER K)
  "B1": "🅛", // L (U+1F15B NEGATIVE CIRCLED LATIN CAPITAL LETTER L)
  "B2": "🅜", // M (U+1F15C NEGATIVE CIRCLED LATIN CAPITAL LETTER M)
  "B3": "🅝", // N (U+1F15D NEGATIVE CIRCLED LATIN CAPITAL LETTER N)
  "B4": "🅞", // O (U+1F15E NEGATIVE CIRCLED LATIN CAPITAL LETTER O)
  "B5": "🅟", // P (U+1F15F NEGATIVE CIRCLED LATIN CAPITAL LETTER P)
  "B6": "🅠", // Q (U+1F160 NEGATIVE CIRCLED LATIN CAPITAL LETTER Q)
  "B7": "🅡", // R (U+1F161 NEGATIVE CIRCLED LATIN CAPITAL LETTER R)
  "B8": "🅢", // S (U+1F162 NEGATIVE CIRCLED LATIN CAPITAL LETTER S)
  "B9": "🅣", // T (U+1F163 NEGATIVE CIRCLED LATIN CAPITAL LETTER T)
  "BA": "🅤", // U (U+1F164 NEGATIVE CIRCLED LATIN CAPITAL LETTER U)
  "BB": "🅥", // V (U+1F165 NEGATIVE CIRCLED LATIN CAPITAL LETTER V)
  "BC": "🅦", // W (U+1F166 NEGATIVE CIRCLED LATIN CAPITAL LETTER W)
  "BD": "🅧", // X (U+1F167 NEGATIVE CIRCLED LATIN CAPITAL LETTER X)
  "BE": "🅨", // Y (U+1F168 NEGATIVE CIRCLED LATIN CAPITAL LETTER Y)
  "BF": "🅩" // Z (U+1F169 NEGATIVE CIRCLED LATIN CAPITAL LETTER Z)
}

// Whether to attempt semigraphics approximations
let useGraphics = false;

// Buffer for loaded file (Uint8Array)
let fileBuffer = null;

// DOM elements
const fileInput = document.getElementById('fileInput');
const convertBtn = document.getElementById('convertBtn');
const saveBtn = document.getElementById('saveBtn');
const graphicsToggle = document.getElementById('graphicsToggle');
const output = document.getElementById('output');
const status = document.getElementById('status');

// bin as Hex
let binAsHex = false;
const hexToggle = document.getElementById('hexToggle');

hexToggle.addEventListener('change', () => {
  binAsHex = hexToggle.checked;
});
let firstRemSeen = false;


let loadedFileName = "program"; // default if no file loaded

// Handle file selection: read into a Uint8Array
fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  console.log("File selected:", file ? file.name : "none");
  if (!file) return;

  // Store base name without extension
  loadedFileName = file.name.replace(/\.p$/i, "") || "program";

  const reader = new FileReader();
  reader.onload = (e) => {
    fileBuffer = new Uint8Array(e.target.result);
    console.log("File loaded, size:", fileBuffer.length, "bytes");
    status.textContent = `Loaded: ${file.name} (${fileBuffer.length} bytes)`;
    convertBtn.disabled = false;
  };
  reader.readAsArrayBuffer(file);
});


// Handle toggle for semigraphics
graphicsToggle.addEventListener('change', () => {
  useGraphics = graphicsToggle.checked;
});

// Convert button: parse the ZX81 .P format like the C tool
convertBtn.addEventListener('click', () => {
  console.log("Convert button clicked");
  if (!fileBuffer) {
	alert("Please load a .P file first.");
	return;
  }

  try {
	const listing = convertPtoText(fileBuffer, useGraphics);
	console.log("Conversion produced", listing.length, "characters");
	output.value = listing;
	status.textContent = "Conversion complete.";
  } catch (err) {
	console.error("Conversion error:", err);
	alert("Conversion failed: " + err.message);
	status.textContent = "Conversion failed.";
  }
});

// Save button: download the textarea content as a .txt file
saveBtn.addEventListener('click', () => {
  const text = output.value;
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${loadedFileName}.bas`; // use loaded filename + .bas
  a.click();
  URL.revokeObjectURL(url);
});

/**
 * Core converter: mimics the original C logic.
 * - Skips sys vars
 * - Reads d_file pointer
 * - Computes total program bytes
 * - Reads lines: line number (big-endian), line length (little-endian), line bytes
 * - Translates using charset
 * - Skips inline FP numbers (byte 126 + 5 following) except inside REM
 */
function convertPtoText(buf, useGraphicsBlocks) {
  // Cursor in buffer
  let pos = 0;
  
  // reset for each conversion
  firstRemSeen = false;
  
  // Ignore first 3 bytes (system vars)
  pos += 3;

  // Read d_file (little-endian: low, high)
  const d_file = buf[pos] + 256 * buf[pos + 1];
  pos += 2;

  // Ignore next 111 bytes of sys vars
  pos += 111;

  // Total program bytes: d_file - 16509
  // The base address 16509 mirrors the original tool's assumption.
  let total = d_file - 16509;

  let listing = "";

  // Helper: safe read byte
  const getByte = () => {
	if (pos >= buf.length) throw new Error("Unexpected end of file while reading program.");
	return buf[pos++];
  };

  // Read lines while there is program data
  while (total > 0) {
	// Line number: big-endian b1*256 + b2
	const ln_b1 = getByte();
	const ln_b2 = getByte();
	total -= 2;
	const lineNumber = ln_b1 * 256 + ln_b2;

	// Line length: little-endian b1 + 256*b2
	const ll_b1 = getByte();
	const ll_b2 = getByte();
	total -= 2;
	const lineLength = ll_b1 + 256 * ll_b2;

	// Read line bytes
	const lineBytes = new Uint8Array(lineLength);
	for (let i = 0; i < lineLength; i++) {
	  lineBytes[i] = getByte();
	  total -= 1;
	}

	// Translate line into text
	const lineText = translateLine(lineBytes, useGraphicsBlocks);
	listing += lineNumber.toString().padStart(4, " ") + lineText + "\n";

	// Stop when total < 0 or buffer consumed by loop condition
  }

  return listing;
}

/**
 * Translate a line buffer to text using the charset.
 * - Skips inline FP numbers if not a REM line:
 *   if (firstByte != REM) and (byte == 126) then skip next 5 bytes
 * - Otherwise, prints charset[byte] or approximates graphics if enabled
 */
function translateLine(lineBytes, useGraphicsBlocks) {
  let s = "";
  const first = lineBytes[0]; // first token of the line

  // If this is a REM line
  if (first === REM_TOKEN) {
    const remText = charset[REM_TOKEN] ?? " REM ";
    s += remText;

    // Only the first REM line can contain assembler code
    if (!firstRemSeen && binAsHex) {
      firstRemSeen = true; // mark that we've processed the first REM
      // Render the rest of the line as hex
      for (let f = 1; f < lineBytes.length - 1; f++) {
        const b = lineBytes[f];
        s += b.toString(16).padStart(2, "0").toUpperCase();
        if (f < lineBytes.length - 2) s += " ";
      }
      return s;
    }
    // If it's not the first REM or hex mode is off → fall through to normal mapping
  }

  // Normal path (non-REM or later REM lines)
  for (let f = 0; f < lineBytes.length - 1; f++) {
    const b = lineBytes[f];

    // Inline FP numbers marker (126) outside REM → skip next 5 bytes
    if (first !== REM_TOKEN && b === 126) {
      f += 5;
      continue;
    }

    let mapped = charset[b];
    if (mapped === NAK && useGraphicsBlocks) {
      mapped = approximateGraphic(b);
    }
    s += mapped !== undefined ? mapped : NAK;
  }

  return s;
}



/**
 * Converts a code to an approximate graphic character
 * @param {number} code - The code to convert
 * @return {string} The corresponding graphic character or NAK if not found
 */
function approximateGraphic(code) {
  // Convert code to hex string (e.g. 128 -> "80")
  const hexCode = code.toString(16).padStart(2, '0').toLowerCase();
  
  // Look up the character directly in the quadBlocks table
  return quadBlocks[hexCode] || NAK;
}

// -------------------- EOF --------------------