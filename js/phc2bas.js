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
// --------------------------------------------------
// Keywords table for token decoding
// --------------------------------------------------
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

// --------------------------------------------------
// State variables
// --------------------------------------------------
let phcFilename = "PROGRAM";
let phcBytes = null; // raw PHC file bytes

// --------------------------------------------------
// Decode one BASIC line from PHC
// --------------------------------------------------
function decodeLine(bytes, start, hardEnd) {
  let pos = start;
  let s = "";
  let inString = false;

  while (pos < hardEnd) {
    const b = bytes[pos++];
    if (b === 0x00) break; // line terminator

    if (b === 0x22) { // toggle string state on "
      inString = !inString;
      s += '"';
      continue;
    }

    if (!inString && b >= 0x80) {
      const idx = b - 0x80;
      const kw = keyWords[idx];
      s += (kw ?? `{TOK:${b.toString(16)}}`);
    } else {
      s += String.fromCharCode(b);
    }
  }
  return { text: s, nextPos: pos };
}

// --------------------------------------------------
// Convert PHC bytes to BASIC text
// --------------------------------------------------
function phcToBas(phcBytes) {
	const bytes = Array.from(phcBytes);
	let pos = 0;
	// Skip header (10 bytes sync + 6 bytes filename)
	pos += 10;
	const nameBytes = bytes.slice(pos, pos + 6);
	pos += 6;
	phcFilename = "";
	for (let b of nameBytes) if (b !== 0x00) phcFilename += String.fromCharCode(b);
	if (!phcFilename) phcFilename = "PROGRAM";
	// Find separator 00 00 00
	let sepPos = -1;
	for (let i = pos; i < bytes.length - 2; i++) {
		if (bytes[i] === 0x00 && bytes[i + 1] === 0x00 && bytes[i + 2] === 0x00) {
			sepPos = i;
			break;
		}
	}
	//
	if (sepPos < 0) throw new Error("Separator 00 00 00 not found");
	// Decode lines until separator
	const lines = [];
	let scan = pos;
	while (scan < sepPos) {
		if (bytes[scan] === 0x00 && bytes[scan + 1] === 0x00 && bytes[scan + 2] === 0x00) break;
		const { text, nextPos } = decodeLine(bytes, scan, sepPos);
		if (text.length > 0) lines.push(text);
		scan = nextPos;
	}
	// Find trailer FF FF FF FF
	const indexStart = sepPos + 3;
	let trailerPos = -1;
	for (let i = indexStart; i < bytes.length - 3; i++) {
		if (bytes[i] === 0xFF && bytes[i + 1] === 0xFF && bytes[i + 2] === 0xFF && bytes[i + 3] === 0xFF) {
			trailerPos = i;
			break;
		}
	}
	if (trailerPos < 0) throw new Error("Trailer FF FF FF FF not found");
	// Read line numbers from index
	const allLineNumbers = [];
	for (let i = indexStart; i < trailerPos; i += 4) {
		const numLo = bytes[i + 2];
		const numHi = bytes[i + 3];
		const num = numLo + (numHi << 8);
		allLineNumbers.unshift(num);
	}
	//
	const needed = lines.length;
	const lineNumbers = allLineNumbers.slice(-needed);
	// Reconstruct BASIC text
	let basText = "";
	for (let i = 0; i < lines.length; i++) {
		const num = lineNumbers[i] ?? ((i + 1) * 10);
		basText += num + " " + lines[i] + "\n";
		}
	//
	return basText.trim();
}

// --------------------------------------------------
// Load PHC file: only load + show hex in left area
// --------------------------------------------------
document.getElementById("loadBtnPhc").addEventListener("click", () => {
	const input = document.createElement("input");
	input.type = "file";
	input.accept = ".phc";
	input.onchange = e => {
		const file = e.target.files[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			try {
				phcBytes = new Uint8Array(reader.result); // store raw PHC
				// Show raw hex in left area
				document.getElementById("leftArea").value = bytesToHex(phcBytes);
				// Update filename meta
				phcFilename = file.name.replace(/\.[^/.]+$/, "") || "PROGRAM";
				document.getElementById("phcName").textContent = phcFilename;
				// Reset right area + line count
				document.getElementById("rightArea").value = "";
				document.getElementById("lineCount").textContent = "0";
				document.getElementById("saveBtnBas").disabled = true;
				} catch (err) {
					document.getElementById("leftArea").value = "Error: " + err.message;
				}
		};
		reader.readAsArrayBuffer(file);
	};
	input.click();
});

/// --------------------------------------------------
// Build button: decode PHC into BASIC and show in right area
// --------------------------------------------------
document.getElementById("buildBtn").addEventListener("click", () => {
	if (!phcBytes) {
		alert("Load a PHC file first.");
		return;
	}
	try {
		const basText = phcToBas(phcBytes);
		document.getElementById("rightArea").value = basText;
		document.getElementById("lineCount").textContent = basText.split("\n").length;
		document.getElementById("saveBtnBas").disabled = false;
		} catch (err) {
		document.getElementById("rightArea").value = "Error: " + err.message;
	}
});

// --------------------------------------------------
// Save BASIC as .bas file
// --------------------------------------------------
document.getElementById("saveBtnBas").addEventListener("click", () => {
	const basText = document.getElementById("rightArea").value;
	//
	if (!basText) return;
	//
	const blob = new Blob([basText], { type: "text/plain" });
	const link = document.createElement("a");
	//
	link.href = URL.createObjectURL(blob);
	link.download = phcFilename + ".bas";
	link.click();
});


// -------------------- EOF --------------------