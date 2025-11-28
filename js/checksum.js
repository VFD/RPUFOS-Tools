/**
 * ------------------------------------------------------------
 *  Project : Nom du projet
 *  File    : checksum.js
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

// checksum.js
(function () {
  "use strict";

  // === References ===
  const loadBtn = document.getElementById("loadBtn");
  const saveBtn = document.getElementById("saveBtn");
  const outputArea = document.getElementById("outputArea");
  const filenameDisplay = document.getElementById("filename");

  let loadedFile = null;

  // === Load file and calculate immediately ===
  loadBtn.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = e => {
      loadedFile = e.target.files[0];
      filenameDisplay.textContent = loadedFile.name;

      const reader = new FileReader();
      reader.onload = async () => {
        const data = reader.result;

        // Calculate CRC32
        const crc32 = crc32Calc(data).toString(16).toUpperCase();

        // Calculate CRC16
        const crc16 = crc16Calc(data).toString(16).toUpperCase();

        // Calculate MD5 (from md5.js IIFE)
        const md5hash = md5(data);

        // Calculate SHA-1
        const sha1 = await digestCalc(data, "SHA-1");

        // Calculate SHA-256
        const sha256 = await digestCalc(data, "SHA-256");
		
		// Calculate SHA-384
		const sha384 = await digestCalc(data, "SHA-384");

		// Calculate SHA-512
		const sha512 = await digestCalc(data, "SHA-512");
		
        // Format output like a console log
        outputArea.value =
          "=== Checksum / CRC Calculator ===\n" +
          "File: " + loadedFile.name + "\n\n" +
          "CRC16   : " + crc16 + "\n" +
          "CRC32   : " + crc32 + "\n" +
          "MD5     : " + md5hash + "\n" +
          "SHA-1   : " + sha1 + "\n" +
          "SHA-256 : " + sha256 + "\n" +
		  "SHA-384 : " + sha384 + "\n" +
		  "SHA-512 : " + sha512 + "\n" +
          "=================================\n";
      };
      reader.readAsBinaryString(loadedFile);
    };
    input.click();
  });

  // === Save output ===
  saveBtn.addEventListener("click", () => {
    if (!loadedFile) {
      alert("No file loaded.");
      return;
    }
    const blob = new Blob([outputArea.value], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
	// new name = old name + ".txt"
    link.download = loadedFile.name + ".txt";
    link.click();
  });

  // === CRC32 implementation ===
  function crc32Calc(str) {
    let crc = 0 ^ (-1);
    for (let i = 0; i < str.length; i++) {
      crc = (crc >>> 8) ^ tableCRC32[(crc ^ str.charCodeAt(i)) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
  }

  // Precompute CRC32 table
  const tableCRC32 = (() => {
    let c, table = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[n] = c;
    }
    return table;
  })();

  // === CRC16 implementation (polynomial 0xA001) ===
  function crc16Calc(str) {
    let crc = 0xFFFF;
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i);
      for (let j = 0; j < 8; j++) {
        crc = (crc & 1) ? (crc >>> 1) ^ 0xA001 : (crc >>> 1);
      }
    }
    return crc & 0xFFFF;
  }

  // === Digest calculation (SHA-1, SHA-256 using Web Crypto API) ===
  async function digestCalc(str, algo) {
    const buf = new TextEncoder().encode(str);
    const digest = await crypto.subtle.digest(algo, buf);
    return hex(digest);
  }

  // === Convert ArrayBuffer to hex string ===
  function hex(buffer) {
    const hexCodes = [];
    const view = new DataView(buffer);
    for (let i = 0; i < view.byteLength; i++) {
      const value = view.getUint8(i).toString(16);
      hexCodes.push(value.padStart(2, "0"));
    }
    return hexCodes.join("");
  }

  // === Text size controls (apply to output area) ===
  document.getElementById("increaseText").addEventListener("click", () => {
    const currentSize = parseFloat(window.getComputedStyle(outputArea).fontSize);
    outputArea.style.fontSize = (currentSize + 2) + "px";
  });

  document.getElementById("decreaseText").addEventListener("click", () => {
    const currentSize = parseFloat(window.getComputedStyle(outputArea).fontSize);
    outputArea.style.fontSize = Math.max(8, currentSize - 2) + "px";
  });

})();


// -------------------- EOF --------------------