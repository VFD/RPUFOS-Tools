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
 * ZX81 .P to text converter (browser version)
 * - Reads a .P file (ZX81 snapshot) from disk
 * - Parses the program area using the same rules as the C utility
 * - Translates tokens with a full 256-entry charset
 * - Skips inline FP numbers except inside REM lines (like the C code)
 * - Displays the result and allows saving it
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
// - Wherever the C had NAK, we put "#".
// - 234 is REM; used to control FP skip logic.
const charset = [
  /* 000-009 */ " ", NAK, NAK, NAK, NAK, NAK, NAK, NAK, NAK, NAK,
  /* 010-019 */ NAK, "\"", "Ý", "$", ":", "?", "(", ")", ">", "<",
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
  /* 140-149 */ "Ý", "$", ":", "?", "(", ")", ">", "<", "=", "+",
  /* 150-159 */ "-", "*", "/", ";", ",", ".", "0", "1", "2", "3",
  /* 160-169 */ "4", "5", "6", "7", "8", "9", "a", "b", "c", "d",
  /* 170-179 */ "e", "f", "g", "h", "i", "j", "k", "l", "m", "n",
  /* 180-189 */ "o", "p", "q", "r", "s", "t", "u", "v", "w", "x",
  /* 190-199 */ "y", "z", "\"\"", "AT ", "TAB ", NAK, "CODE ", "VAL ",
				"LEN ", "SIN ",
  /* 200-209 */ "COS ", "TAN ", "ASN ", "ACS ", "ATN ", "LN ", "EXP ",
				"INT ", "SQR ", "SGN ",
  /* 210-219 */ "ABS ", "PEEK ", "USR ", "STR$ ", "CHR$ ", "NOT ",
				"**", " OR ", " AND ", "<=",
  /* 220-229 */ ">=", "<>", " THEN", " TO ", " STEP ", " LPRINT ",
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

// Optional semigraphics approximations:
// ZX81 pseudo-graphics are 2×2 mosaics. We approximate some common
// combinations using Unicode block elements. This is experimental.
// If a byte maps to NAK ("#"), and it's in displayable ranges,
// we try substituting with one of these. This is NOT a perfect mapping.
const quadBlocks = [
  " ",       // 0: empty
  "▘",       // 1: upper-left
  "▝",       // 2: upper-right
  "▀",       // 3: upper half
  "▖",       // 4: lower-left
  "▌",       // 5: left half
  "▞",       // 6: diag upper-right + lower-left
  "▛",       // 7: UL+UR+LL
  "▗",       // 8: lower-right
  "▚",       // 9: diag upper-left + lower-right
  "▐",       // 10: right half
  "▜",       // 11: UL+UR+LR
  "▄",       // 12: lower half
  "▙",       // 13: UL+LL+LR
  "▟",       // 14: UR+LL+LR
  "█"        // 15: full block
];

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



// Handle file selection: read into a Uint8Array
fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  console.log("File selected:", file ? file.name : "none");
  if (!file) return;

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
  a.download = "program.txt";
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
 * Approximate semigraphics using Unicode quadrant/block characters.
 * This is a heuristic for display purposes only.
 * You can tailor this to your actual ZX81 graphic codes if known.
 */
function approximateGraphic(code) {
  // Try to map codes within typical displayable ranges.
  // ZX81 inverse video lives in 128–191; base glyphs in 0–63.
  // Here we just use low 4 bits to select a block pattern as a crude approximation.
  const idx = code & 0x0F;
  return quadBlocks[idx] || NAK;
}

// -------------------- EOF --------------------