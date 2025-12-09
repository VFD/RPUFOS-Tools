/**
 * ------------------------------------------------------------
 *  Project : Nom du projet
 *  File    : general.js
 *  Author  : VincentD
 *  Date    : 2025-12-09
 *  License : CC BY-NC 4.0 International
 * ------------------------------------------------------------
 *  Description:
 *		- Global elements to manage them all.
 *
 *  Notes:
 *		- 
 *
 * ------------------------------------------------------------
 */

// --------------------------------------------------
// collapsible zone
// --------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".collapsible").forEach(trigger => {
    trigger.addEventListener("click", () => {
      trigger.classList.toggle("is-open");
    });
  });
});


// --------------------------------------------------
// const for sizing textarea.
// --------------------------------------------------
const leftArea  = document.getElementById('leftArea');
const rightArea = document.getElementById('rightArea');

// --------------------------------------------------
// Font size controls
// --------------------------------------------------
function adjustFont(textarea, delta) {
	const style = window.getComputedStyle(textarea);
	const current = parseFloat(style.fontSize);
	textarea.style.fontSize = (current + delta) + "px";
}
// --------------------------------------------------
// add listeners
// --------------------------------------------------
document.getElementById('leftFontInc').addEventListener('click', () => adjustFont(leftArea, 2));
document.getElementById('leftFontDec').addEventListener('click', () => adjustFont(leftArea, -2));
document.getElementById('rightFontInc').addEventListener('click', () => adjustFont(rightArea, 2));
document.getElementById('rightFontDec').addEventListener('click', () => adjustFont(rightArea, -2));


// --------------------------------------------------
// UI wiring - general
// --------------------------------------------------
const loadBtn    = document.getElementById('loadBtn');
const convertBtn = document.getElementById('buildBtn');
const saveBtn    = document.getElementById('saveBtn');

// --------------------------------------------------
// for the Name of the file loaded
// --------------------------------------------------
const filenameEl = document.getElementById('filename');


// --------------------------------------------------
// To show hexa format
// --------------------------------------------------
  function bytesToHex(bytes) {
    const lines = [];
    for (let i = 0; i < bytes.length; i += 16) {
      const slice = bytes.subarray(i, Math.min(i + 16, bytes.length));
      const hex = Array.from(slice).map(b => b.toString(16).padStart(2, '0')).join(' ');
      lines.push(hex);
    }
    return lines.join('\n');
  }

// --------------------------------------------------
/**
 * Convert a byte array into a hexadecimal string.
 * Each byte is printed as two hex digits.
 * Bytes are separated by spaces, and a newline is inserted every 16 bytes.
 * Example: [0x00, 0x01, ...] → "00 01 ...\n..."
 */
// --------------------------------------------------
function toHexString(byteArray) {
  return byteArray
    .map((b, i) => {
      const hex = b.toString(16).padStart(2, '0');
      // Add a newline before every 16th byte except the first
      return (i > 0 && i % 16 === 0 ? '\n' : '') + hex;
    })
    .join(' ');
}

// State
let loadedFilename = ""; // full filename (e.g., myprog.bas)

// --------------------------------------------------
// Update filename display
// --------------------------------------------------
function setFilename(name) {
	loadedFilename = name || "";
	// 
	if (filenameEl) {
		filenameEl.textContent = loadedFilename ? loadedFilename : "No file loaded";
	}
}


// --------------------------------------------------
// Derive basename (without extension)
// --------------------------------------------------
function getBaseName() {
  if (!loadedFilename) return "program";
  return loadedFilename.replace(/\.[^/.]+$/, "") || "program";
}


// -------------------- EOF --------------------