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
// bas2cas.js — BAS to CAS (Canon X‑07) in-browser converter
/*
 * x07bas2cas.js
 * Convert BASIC (UTF‑8 text) to CAS binary for Canon X‑07
 * Version const + IIFE : encapsulé mais exposé dans window
 * Dépend de X07tokens.js (tables globales)
 */

(function(global) {
  // ======================= Constantes =======================
  const BASIC_START = 0x553;
  const HEADER_LEADER_BYTE = 0xD3;
  const HEADER_LEADER_LEN = 10;
  const FILENAME_LEN = 6;
  const FILE_END_ZEROES = 11;

  // ======================= Helpers =======================
  function ciStartsWith(s, pat) {
    return s.substring(0, pat.length).toUpperCase() === pat.toUpperCase();
  }

  // Encode une ligne BASIC en bloc CAS
  function encodeLine(lineStr, lineNum, nextPtr) {
    const out = [];
    out.push(0x00, 0x00); // pointeur placeholder
    out.push(lineNum & 0xFF, (lineNum >> 8) & 0xFF);

    let i = 0, inString = false, transparent = false;

    while (i < lineStr.length) {
      const ch = lineStr[i];

      if (ch === '"') {
        inString = !inString;
        out.push(0x22);
        i++;
        continue;
      }

      // UTF‑8 spéciaux
      if (global.X07_UTF8[ch]) {
        out.push(global.X07_UTF8[ch]);
        i++;
        continue;
      }

      // Séquences d’échappement
      if (ch === "\\" && i + 1 < lineStr.length) {
        let esc = "";
        i++;
        while (i < lineStr.length && /[A-Za-z0-9:.,~]/.test(lineStr[i])) {
          esc += lineStr[i];
          i++;
        }
        if (global.X07_ESCAPES[esc]) {
          out.push(global.X07_ESCAPES[esc]);
          continue;
        }
        for (let c of esc) out.push(c.charCodeAt(0));
        continue;
      }

      // Tokens BASIC
      if (!inString && !transparent) {
        let matched = null;
        for (const tk of global.X07_TOKENS) {
          if (ciStartsWith(lineStr.substring(i), tk.t)) {
            matched = tk;
            break;
          }
        }
        if (matched) {
          if (matched.f & global.FLAG_PREFIX_COLON) out.push(0x3A);
          if (matched.f & global.FLAG_REM_BEFORE) out.push(0x8E);
          out.push(matched.v);
          if (matched.f & global.FLAG_TRANSPARENT) transparent = true;
          i += matched.t.length;
          continue;
        }
      }

      // Copie brute ASCII
      out.push(lineStr.charCodeAt(i));
      i++;
    }

    out.push(0x00); // fin de ligne
    out[0] = nextPtr & 0xFF;
    out[1] = (nextPtr >> 8) & 0xFF;
    return out;
  }

  // Construit un fichier CAS complet
  function buildCAS(basicText, basename) {
    const name = basename.replace(/\.[^/.]+$/, "").substring(0, FILENAME_LEN);
    const bytes = [];

    for (let i = 0; i < HEADER_LEADER_LEN; i++) bytes.push(HEADER_LEADER_BYTE);
    for (let i = 0; i < FILENAME_LEN; i++) {
      bytes.push(i < name.length ? name.charCodeAt(i) : 0x00);
    }

    const lines = basicText.split(/\r?\n/)
      .map(s => s.trimEnd())
      .filter(s => s.length > 0)
      .map(raw => {
        const m = raw.match(/^\s*(\d+)\s*(.*)$/);
        return m ? { num: parseInt(m[1], 10), text: m[2] } : null;
      })
      .filter(Boolean);

    let ptr = BASIC_START, lastNum = 0;
    for (const { num, text } of lines) {
      if (num <= lastNum) break;
      const lineBytes = encodeLine(text, num, 0);
      const nextPtr = ptr + lineBytes.length;
      lineBytes[0] = nextPtr & 0xFF;
      lineBytes[1] = (nextPtr >> 8) & 0xFF;
      bytes.push(...lineBytes);
      ptr = nextPtr;
      lastNum = num;
    }

    for (let i = 0; i < FILE_END_ZEROES; i++) bytes.push(0x00);
    return new Uint8Array(bytes);
  }

  // Vue hexadécimale
  function toHexView(u8) {
    let out = "";
    for (let i = 0; i < u8.length; i++) {
      const hex = u8[i].toString(16).padStart(2, "0");
      if (i > 0) out += (i % 16 === 0) ? "\n" : " ";
      out += hex;
    }
    return out;
  }

  // ======================= Expose global =======================
  global.X07_BAS2CAS = { buildCAS, toHexView };

})(window);



// -------------------- EOF --------------------