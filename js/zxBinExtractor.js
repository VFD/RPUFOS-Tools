/**
 * ------------------------------------------------------------
 *  Project : Binary extractor from ZX81 .P file
 *  File    : zxBinExtractor.js
 *  Author  : VincentD
 *  Date    : 2025-11-26
 *  License : CC BY-NC 4.0 International
 * ------------------------------------------------------------
 *  Description:
 *    - load a .P file
 *    - Show content and you can extract the BIN part (Z80)
 *
 *  Notes:
 *    - Compatible with GitHub Pages.
 *    - 
 * ------------------------------------------------------------
 */

const REM_TOKEN = 234; // ZX81 REM token
let fileBuffer = null;
let extractedBin = null;
let extractedName = "rem_payload.bin";

const fileInput = document.getElementById('fileInput');
const extractBtn = document.getElementById('extractBtn');
const saveBtn = document.getElementById('saveBtn');
const output = document.getElementById('output');
const status = document.getElementById('status');

fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
	fileBuffer = new Uint8Array(e.target.result);
	extractedBin = null;
	extractedName = file.name.replace(/\.[Pp]$/, '') + ".bin";
	status.textContent = `Loaded: ${file.name} (${fileBuffer.length} bytes)`;
	extractBtn.disabled = false;
	saveBtn.disabled = true;
	output.value = "File loaded.\nClick 'Extract REM binary' to continue.";
  };
  reader.readAsArrayBuffer(file);
});

extractBtn.addEventListener('click', () => {
  if (!fileBuffer) return;
  try {
	const result = extractRemBinary(fileBuffer);
	if (!result.isRem || result.bin.length === 0) {
	  status.textContent = "No REM payload found.";
	  output.value = "No REM payload found in first line.";
	  extractedBin = null;
	  saveBtn.disabled = true;
	} else {
	  extractedBin = result.bin;
	  saveBtn.disabled = false;
	  const baseAddr = 0x43A0 + 4 + 1; // <-- Correct start address: 0x4005
	  status.textContent = `Extracted ${extractedBin.length} bytes from REM line ${result.lineNumber}, starting at ${baseAddr} (0x${baseAddr.toString(16).toUpperCase()}).`;
	  output.value =
		`First line number: ${result.lineNumber}\n` +
		`Is REM: yes\n` +
		`Payload bytes: ${extractedBin.length}\n` +
		`Start address: ${baseAddr} (0x${baseAddr.toString(16).toUpperCase()})\n\n` +
		hexPreview(extractedBin, 16, baseAddr);
	}
  } catch (err) {
	alert("Extraction failed: " + err.message);
	status.textContent = "Extraction failed.";
  }
});

saveBtn.addEventListener('click', () => {
  if (!extractedBin) return;
  const blob = new Blob([extractedBin], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = extractedName;
  a.click();
  URL.revokeObjectURL(url);
});

function extractRemBinary(buf) {
  let pos = 0;
  pos += 3; // skip sys vars
  const d_file = buf[pos] + 256 * buf[pos + 1];
  pos += 2;
  pos += 111; // skip more sys vars
  let total = d_file - 16509;

  const ln_b1 = buf[pos++];
  const ln_b2 = buf[pos++];
  total -= 2;
  const lineNumber = ln_b1 * 256 + ln_b2;

  const ll_b1 = buf[pos++];
  const ll_b2 = buf[pos++];
  total -= 2;
  const lineLength = ll_b1 + 256 * ll_b2;

  const lineBytes = new Uint8Array(lineLength);
  for (let i = 0; i < lineLength; i++) {
	lineBytes[i] = buf[pos++];
	total -= 1;
  }

  const isRem = lineBytes[0] === REM_TOKEN;
  const payload = isRem ? lineBytes.slice(1, lineBytes.length - 1) : new Uint8Array(0);
  return { lineNumber, isRem, bin: payload };
}

function hexPreview(bytes, width = 16, baseAddr = 0x43A0) {
  const toHex = (n) => n.toString(16).toUpperCase().padStart(2, "0");
  const toAscii = (n) => {
	const c = n & 0x7F;
	return (c >= 32 && c <= 126) ? String.fromCharCode(c) : ".";
  };
  let out = "";
  for (let i = 0; i < bytes.length; i += width) {
	const chunk = bytes.slice(i, i + width);
	const hex = Array.from(chunk).map(toHex).join(" ");
	const ascii = Array.from(chunk).map(toAscii).join("");
	const addr = baseAddr + i; // <-- show addresses starting at 0x4005
	out += addr.toString(16).toUpperCase().padStart(6, "0") + "  " +
		   hex.padEnd(width * 3, " ") + "  |" + ascii + "|\n";
  }
  return out;
}


// -------------------- EOF --------------------