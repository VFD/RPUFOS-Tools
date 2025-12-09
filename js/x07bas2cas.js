/**
 * ------------------------------------------------------------
 *  Project : Nom du projet
 *  File    : x07bas2cas.js
 *  Author  : VincentD
 *  Date    : 2025-12-09
 *  License : CC BY-NC 4.0 International
 * ------------------------------------------------------------
 *  Description:
 *		BAS to CAS (Canon X‑07) in-browser converter
 *		Convert BASIC (UTF‑8 text) to CAS binary for Canon X‑07
 *
 *  Notes:
 *		- X07tokens.js (tables globales) mandatory
 *		- TO  DO: Comment script
 * ------------------------------------------------------------
 */

// ===================== Constantes ======================
const BASIC_START = 0x553;
const HEADER_LEADER_BYTE = 0xD3;
const HEADER_LEADER_LEN = 10;
const FILENAME_LEN = 6;
const FILE_END_ZEROES = 11;

// ======================= Helpers =======================
function ciStartsWith(s, pat) {
	return s.substring(0, pat.length).toUpperCase() === pat.toUpperCase();
}

// --------------------------------------------------
// Encode BASIC to bloc CAS
// --------------------------------------------------
function encodeLine(lineStr, lineNum, nextPtr) {
	//
	const out = [];
	out.push(0x00, 0x00); // pointeur placeholder
	out.push(lineNum & 0xFF, (lineNum >> 8) & 0xFF);
	//
	let i = 0, inString = false, transparent = false;
	//
	while (i < lineStr.length) {
		const ch = lineStr[i];
		//
		if (ch === '"') {
			inString = !inString;
			out.push(0x22);
			i++;
			continue;
		}
		// Specail UTF‑8
		if (X07_UTF8[ch]) {
			out.push(X07_UTF8[ch]);
			i++;
			continue;
		}
		// Escape Sequences
		if (ch === "\\" && i + 1 < lineStr.length) {
			let esc = "";
			i++;
			while (i < lineStr.length && /[A-Za-z0-9:.,~]/.test(lineStr[i])) {
				esc += lineStr[i];
				i++;
			}
			if (X07_ESCAPES[esc]) {
				out.push(X07_ESCAPES[esc]);
				continue;
			}
			for (let c of esc) out.push(c.charCodeAt(0));
			continue;
		}
		// BASIC Tokens
		if (!inString && !transparent) {
			let matched = null;
			for (const tk of X07_TOKENS) {
				if (ciStartsWith(lineStr.substring(i), tk.t)) {
					matched = tk;
					break;
				}
			}
			if (matched) {
				if (matched.f & FLAG_PREFIX_COLON) out.push(0x3A);
				if (matched.f & FLAG_REM_BEFORE) out.push(0x8E);
				out.push(matched.v);
				if (matched.f & FLAG_TRANSPARENT) transparent = true;
				i += matched.t.length;
				continue;
			}
		}
		// ASCII copy brute force
		out.push(lineStr.charCodeAt(i));
		i++;
	}
	//
	out.push(0x00); // end of line
	out[0] = nextPtr & 0xFF;
	out[1] = (nextPtr >> 8) & 0xFF;
	return out;
}

// --------------------------------------------------
// Build the complete CAS file
// --------------------------------------------------
function buildCAS(basicText, basename) {
	const name = basename.replace(/\.[^/.]+$/, "").substring(0, FILENAME_LEN);
	const bytes = [];

	for (let i = 0; i < HEADER_LEADER_LEN; i++) bytes.push(HEADER_LEADER_BYTE);
	for (let i = 0; i < FILENAME_LEN; i++) {
		bytes.push(i < name.length ? name.charCodeAt(i) : 0x00);
	}
	//
	const lines = basicText.split(/\r?\n/)
	.map(s => s.trimEnd())
	.filter(s => s.length > 0)
	.map(raw => {
		const m = raw.match(/^\s*(\d+)\s*(.*)$/);
		return m ? { num: parseInt(m[1], 10), text: m[2] } : null;
	})
	.filter(Boolean);
	//
	let ptr = BASIC_START, lastNum = 0;
	for (const { num, text } of lines) {
		if (num <= lastNum) break;
		//
		const lineBytes = encodeLine(text, num, 0);
		const nextPtr = ptr + lineBytes.length;
		//
		lineBytes[0] = nextPtr & 0xFF;
		lineBytes[1] = (nextPtr >> 8) & 0xFF;
		bytes.push(...lineBytes);
		ptr = nextPtr;
		lastNum = num;
	}
	//
	for (let i = 0; i < FILE_END_ZEROES; i++) bytes.push(0x00);
	return new Uint8Array(bytes);
}


// --------------------------------------------------
// Load .bas/.txt file
// --------------------------------------------------
loadBtn?.addEventListener("click", () => {
	const input = document.createElement("input");
	input.type = "file";
	input.accept = ".bas,.txt";
	input.onchange = e => {
		const file = e.target.files && e.target.files[0];
		if (!file) return;
		setFilename(file.name);
		const reader = new FileReader();
		reader.onload = () => {
			// UTF-8 read
			leftArea.value = reader.result;
		};
		reader.readAsText(file, "utf-8");
	};
	input.click();
});

// --------------------------------------------------
// Convert BAS -> CAS (hex view)
// --------------------------------------------------
buildBtn?.addEventListener("click", () => {
	const basename = getBaseName();
	const cas = buildCAS(leftArea.value || "", basename); // ← txtInput → leftArea
	rightArea.value = bytesToHex(cas);
});

// --------------------------------------------------
// Save CAS file (binary) (saveBtn? ? mean if not define do nothing)
// --------------------------------------------------
saveBtn?.addEventListener("click", () => {
	// If the right textarea is empty, rebuild CAS from BASIC text first
	if (!rightArea.value.trim()) {
		const basename = getBaseName();							// Get the base filename (without extension)
		const cas = buildCAS(leftArea.value || "", basename);	// Convert BASIC text to CAS bytes
		rightArea.value = bytesToHex(cas);						// Show CAS bytes in hex view
	}
	// Get the hex string from the right textarea
	const hex = rightArea.value.trim();
	if (!hex) return;											// If still empty, stop here
	// Convert hex string back into raw bytes
	// Split by spaces, parse each hex value into an integer
	const bytes = hex.split(/\s+/).map(h => parseInt(h, 16));
	// Create a binary Blob from the byte array
	const blob = new Blob([new Uint8Array(bytes)], { type: "application/octet-stream" });
	// Create a temporary <a> element to trigger download
	const a = document.createElement("a");
	// Generate a temporary URL pointing to the Blob
	a.href = URL.createObjectURL(blob);
	// Set the download filename (basename + ".cas")
	const basename = getBaseName();
	// Add the <a> to the document, click it programmatically to start download
	a.download = (basename || "program") + ".cas";
	document.body.appendChild(a);
	a.click();
	// Release the temporary URL and remove the <a> element
	URL.revokeObjectURL(a.href);
	a.remove();
});


// -------------------- EOF --------------------