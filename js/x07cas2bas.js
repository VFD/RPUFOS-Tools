/**
 * ------------------------------------------------------------
 *  Project : Nom du projet
 *  File    : x07cas2bas.js
 *  Author  : VincentD
 *  Date    : 2025-12-09
 *  License : CC BY-NC 4.0 International
 * ------------------------------------------------------------
 *  Description:
 *    Convert CAS binary (Canon X‑07) back to BASIC (UTF‑8 text)
 *
 *  Notes:
 *    - Requires X07tokens.js (global tables: X07_TOKENS, X07_UTF8, X07_ESCAPES)
 *    - Uses general.js for shared DOM references and helpers
 * ------------------------------------------------------------
 */


// TO DO: Complete the comments


// ======================= Inverse Maps =======================

// Build inverse map for UTF‑8 special characters
const INV_UTF8 = {};
for (const [ch, code] of Object.entries(X07_UTF8)) {
  INV_UTF8[code] = ch;
}

// Build inverse map for escape sequences
const INV_ESCAPES = {};
for (const [esc, code] of Object.entries(X07_ESCAPES)) {
  if (!INV_ESCAPES[code]) INV_ESCAPES[code] = "\\" + esc;
}

// Build inverse map for BASIC tokens
const INV_TOKENS = {};
for (const tk of X07_TOKENS) {
  INV_TOKENS[tk.v] = tk;
}

// ======================= Decoding =======================

/**
 * Decode a single BASIC line from CAS bytes
 * @param {Uint8Array} bytes - CAS file bytes
 * @param {number} offset - starting offset of the line
 * @returns {object} - { nextPtr, lineNum, text }
 */
function decodeLine(bytes, offset) {
  const nextPtr = bytes[offset] | (bytes[offset + 1] << 8);
  const lineNum = bytes[offset + 2] | (bytes[offset + 3] << 8);
  let i = offset + 4;
  let out = lineNum.toString() + " ";
  let transparent = false;

  while (i < bytes.length) {
    const b = bytes[i++];
    if (b === 0x00) break; // end of line marker

    // BASIC token
    if (INV_TOKENS[b] && !transparent) {
      const tk = INV_TOKENS[b];
      if (tk.f & FLAG_PREFIX_COLON) out += ":";
      if (tk.f & FLAG_REM_BEFORE) out += "REM ";
      out += tk.t;
      if (tk.f & FLAG_TRANSPARENT) transparent = true;
      continue;
    }

    // Special UTF‑8 character
    if (INV_UTF8[b]) {
      out += INV_UTF8[b];
      continue;
    }

    // Known escape sequence
    if (INV_ESCAPES[b]) {
      out += INV_ESCAPES[b];
      continue;
    }

    // Otherwise, raw ASCII
    out += String.fromCharCode(b);
  }

  return { nextPtr, lineNum, text: out };
}

/**
 * Parse a CAS file into BASIC text
 * @param {Uint8Array} u8 - CAS file bytes
 * @returns {string} - BASIC program text
 */
function parseCAS(u8) {
  let offset = 0;

  // Skip leader (0xD3 bytes)
  while (offset < u8.length && u8[offset] === 0xD3) offset++;
  // Skip filename (6 bytes)
  offset += 6;

  const lines = [];
  while (offset < u8.length) {
    const nextPtr = u8[offset] | (u8[offset + 1] << 8);
    if (nextPtr === 0) break; // end of program
    const line = decodeLine(u8, offset);
    lines.push(line.text);
    offset = nextPtr;
  }

  return lines.join("\n");
}

// ======================= Hex Utilities =======================

/**
 * Format bytes into hex view (16 per line)
 */
function toHexView16(u8) {
  let out = "";
  for (let i = 0; i < u8.length; i++) {
    if (i > 0) out += (i % 16 === 0) ? "\n" : " ";
    out += u8[i].toString(16).padStart(2, "0");
  }
  return out;
}

/**
 * Parse hex text back into byte array
 */
function parseHexTextToBytes(hexText) {
  const cleaned = hexText.toLowerCase()
    .replace(/[^0-9a-f\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return new Uint8Array([]);
  const bySpace = cleaned.split(" ").filter(Boolean);
  let bytes = [];
  if (bySpace.every(tok => /^[0-9a-f]{2}$/.test(tok))) {
    bytes = bySpace.map(h => parseInt(h, 16));
  } else {
    const compact = cleaned.replace(/ /g, "");
    if (compact.length % 2 !== 0) throw new Error("Hex length not even");
    for (let i = 0; i < compact.length; i += 2) {
      bytes.push(parseInt(compact.slice(i, i + 2), 16));
    }
  }
  return new Uint8Array(bytes);
}

// ======================= UI Wiring =======================

// Load CAS file (binary -> hex view)
loadBtn?.addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".cas";
  input.onchange = e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const u8 = new Uint8Array(reader.result);
      // Show hex view in left textarea
      leftArea.value = toHexView16(u8);
      // Clear BASIC output
      rightArea.value = "";
    };
    reader.readAsArrayBuffer(file);
  };
  input.click();
});

// Convert CAS hex -> BASIC text
buildBtn?.addEventListener("click", () => {
  try {
    const u8 = parseHexTextToBytes(leftArea.value || "");
    leftArea.value = toHexView16(u8); // reformat hex nicely
    const basText = parseCAS(u8);
    rightArea.value = basText;
  } catch (err) {
    rightArea.value = "Convert error: " + (err.message || err);
  }
});

// Save BASIC output to .bas file
saveBtn?.addEventListener("click", () => {
  const text = (rightArea.value || "").trim();
  if (!text) return;
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  const basename = (loadedFilename.replace(/\.[^/.]+$/, "") || "program");
  a.download = basename + ".bas";
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(a.href);
  a.remove();
});

// -------------------- EOF --------------------
