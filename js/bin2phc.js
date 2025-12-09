/**
 * ------------------------------------------------------------
 *  Project : Nom du projet
 *  File    : bin2phc.js
 *  Author  : VincentD
 *  Date    : 2025-12-04
 *  License : CC BY-NC 4.0 International
 * ------------------------------------------------------------
 *  Description:
 *    Take BIN file and convert it to PHC file.
 *
 *  Notes:
 *    - Compatible with GitHub Pages.
 *    - 
 * ------------------------------------------------------------
 */

// --------------------------------------------------
// Textareas for BIN and PHC views
// --------------------------------------------------
const binHexTA = document.getElementById('leftArea');   // BIN hex view
const phcHexTA = document.getElementById('rightArea');  // PHC hex view

// --------------------------------------------------
// Constants for PHC file structure
// --------------------------------------------------
const PHC_HEADER = new Uint8Array(10).fill(0xA5);
const NAME_LEN = 6;
const PHC_FOOTER = new Uint8Array([
  0x00,0x00,0x01,0xC0,0x0A,0x00,0x00,0xFF,0xFF,0xFF,
  0xFF,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00
]);

// --------------------------------------------------
// State variables
// --------------------------------------------------
let binBytes = null;          // Holds the loaded BIN file bytes
let loadedFilename = "";      // Stores the name of the loaded file


// --------------------------------------------------
// Utility: Build program name section (max NAME_LEN chars)
// --------------------------------------------------
function buildProgramName(filename) {
	const base = filename.replace(/\.[^/.]+$/, "");
	const name = base.slice(0, NAME_LEN);
	const out = new Uint8Array(NAME_LEN);
	for (let i = 0; i < NAME_LEN; i++) {
		out[i] = i < name.length ? name.charCodeAt(i) : 0x20; // pad with spaces
	}
	return out;
}

// --------------------------------------------------
// Utility: Build bootloader section with start address
// --------------------------------------------------
function buildBootloader(addrHex) {
	let addr = parseInt(addrHex, 16);
	const hexStr = addr.toString(16).toUpperCase().padStart(4, '0');
	const arr = [];
	arr.push(0xA5); // marker
	arr.push(0x26); // CALL token
	arr.push(0x48); // 'H'
	arr.push(0x43); // 'C'
	for (const ch of hexStr) arr.push(ch.charCodeAt(0));
	arr.push(0x00); // end marker
	return new Uint8Array(arr);
}

// --------------------------------------------------
// Utility: Build full PHC file from BIN + metadata
// --------------------------------------------------
function buildPHC(bin, filename, startAddr) {
	const nameBytes = buildProgramName(filename);
	const boot = buildBootloader(startAddr);
	const payloadLen = boot.length + bin.length + PHC_FOOTER.length;
	const needsPadFF = (payloadLen % 2) !== 0; // ensure even length
	//
	const totalLen =
	PHC_HEADER.length +
	nameBytes.length +
	boot.length +
	bin.length +
	(needsPadFF ? 1 : 0) +
	PHC_FOOTER.length;
	//
	const out = new Uint8Array(totalLen);
	let off = 0;
	out.set(PHC_HEADER, off); off += PHC_HEADER.length;
	out.set(nameBytes, off);  off += nameBytes.length;
	out.set(boot, off);       off += boot.length;
	out.set(bin, off);        off += bin.length;
	if (needsPadFF) out[off++] = 0xFF;
	out.set(PHC_FOOTER, off); off += PHC_FOOTER.length;
	return out;
}

// --------------------------------------------------
// UI element: start address input
// --------------------------------------------------
const startAddrEl = document.getElementById('startAddr');

// --------------------------------------------------
// Load button: select and read a BIN file
// --------------------------------------------------
loadBtn.addEventListener('click', () => {
	const input = document.createElement('input');
	input.type = 'file';
	input.accept = '.bin';
	input.onchange = async (e) => {
		const file = e.target.files[0];
		if (!file) return;
		loadedFilename = file.name;
		filenameEl.textContent = loadedFilename;
		const buf = await file.arrayBuffer();
		binBytes = new Uint8Array(buf);
		binHexTA.value = bytesToHex(binBytes); // show BIN in left area
		phcHexTA.value = "";                   // clear PHC area
	};
	input.click();
});

// --------------------------------------------------
// Convert button: build PHC from BIN and show hex
// --------------------------------------------------
convertBtn.addEventListener('click', () => {
	if (!binBytes || !loadedFilename) {
		alert('Load a BIN file first.');
		return;
	}
	//
	const phc = buildPHC(binBytes, loadedFilename, startAddrEl.value);
	//
	phcHexTA.value = bytesToHex(phc); // show PHC in right area
});

// --------------------------------------------------
// Save button: export PHC file to disk
// --------------------------------------------------
saveBtn.addEventListener('click', () => {
	if (!binBytes || !loadedFilename) {
		alert('Nothing to save. Load and convert first.');
		return;
	}
	//
	const phc = buildPHC(binBytes, loadedFilename, startAddrEl.value);
	const blob = new Blob([phc], { type: 'application/octet-stream' });
	const a = document.createElement('a');
	const base = loadedFilename.replace(/\.[^/.]+$/, "");
	//
	a.href = URL.createObjectURL(blob);
	a.download = `${base}.phc`;
	a.click();
});

// -------------------- EOF --------------------