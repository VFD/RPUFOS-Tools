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
 * x07cas2bas.js
 * Convert CAS binary (Canon X‑07) back to BASIC (UTF‑8 text)
 * Version const + IIFE : encapsulé mais exposé dans window
 * Dépend de X07tokens.js (tables globales)
 */

(function(global) {
  // ======================= Helpers =======================

  // Construire une map inverse pour UTF‑8
  const INV_UTF8 = {};
  for (const [ch, code] of Object.entries(global.X07_UTF8)) {
    INV_UTF8[code] = ch;
  }

  // Construire une map inverse pour escapes
  const INV_ESCAPES = {};
  for (const [esc, code] of Object.entries(global.X07_ESCAPES)) {
    // On garde la première correspondance
    if (!INV_ESCAPES[code]) INV_ESCAPES[code] = "\\" + esc;
  }

  // Construire une map inverse pour tokens BASIC
  const INV_TOKENS = {};
  for (const tk of global.X07_TOKENS) {
    INV_TOKENS[tk.v] = tk;
  }

  // ======================= Décodage =======================

  function decodeLine(bytes, offset) {
    // bytes = Uint8Array
    const nextPtr = bytes[offset] | (bytes[offset+1] << 8);
    const lineNum = bytes[offset+2] | (bytes[offset+3] << 8);
    let i = offset + 4;
    let out = lineNum.toString() + " ";
    let transparent = false;

    while (i < bytes.length) {
      const b = bytes[i++];
      if (b === 0x00) break; // fin de ligne

      // Token BASIC
      if (INV_TOKENS[b] && !transparent) {
        const tk = INV_TOKENS[b];
        if (tk.f & global.FLAG_PREFIX_COLON) out += ":";
        if (tk.f & global.FLAG_REM_BEFORE) out += "REM ";
        out += tk.t;
        if (tk.f & global.FLAG_TRANSPARENT) transparent = true;
        continue;
      }

      // UTF‑8 spécial
      if (INV_UTF8[b]) {
        out += INV_UTF8[b];
        continue;
      }

      // Escape connu
      if (INV_ESCAPES[b]) {
        out += INV_ESCAPES[b];
        continue;
      }

      // Sinon ASCII brut
      out += String.fromCharCode(b);
    }

    return { nextPtr, lineNum, text: out };
  }

  function parseCAS(u8) {
    // u8 = Uint8Array du fichier CAS
    let offset = 0;

    // Skip leader
    while (offset < u8.length && u8[offset] === 0xD3) offset++;
    // Skip filename (6 bytes)
    offset += 6;

    const lines = [];
    while (offset < u8.length) {
      const nextPtr = u8[offset] | (u8[offset+1] << 8);
      if (nextPtr === 0) break; // fin
      const line = decodeLine(u8, offset);
      lines.push(line.text);
      offset = nextPtr;
    }

    return lines.join("\n");
  }

  // ======================= Expose global =======================
  global.X07_CAS2BAS = { parseCAS };

})(window);


// -------------------- EOF --------------------