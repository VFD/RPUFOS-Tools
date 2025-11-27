/**
 * ------------------------------------------------------------
 *  Project : Convert BIN to WAV file
 *  File    : bin2wav.js
 *  Author  : VincentD
 *  Date    : 2025-11-27
 *  License : CC BY-NC 4.0 International
 * ------------------------------------------------------------
 *  Description:
 *    - JavaScript for <main> app
 *    - Handles file upload, display, WAV export see wav.js
 *
 *  Notes:
 *    - Compatible with GitHub Pages.
 *    - 
 * ------------------------------------------------------------
 */

/* ============================================================
   load.js
   - Handles file upload
   - Displays hex dump with ASCII + 6-digit offset
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  console.log("Load.js initialized.");

  const fileInput = document.getElementById("fileInput");
  const fileDisplay = document.getElementById("file-display");
  const fileContent = document.getElementById("fileContent");
  const clearBtn = document.getElementById("clearBtn");

  fileInput.addEventListener("change", () => {
    console.log("File input change event triggered.");
    const file = fileInput.files[0];
    if (!file) {
      console.log("No file selected.");
      return;
    }

    console.log("Selected file:", file.name, "size:", file.size, "bytes");
    fileDisplay.textContent = file.name;

    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = new Uint8Array(e.target.result);
      console.log("First 32 bytes:", buffer.slice(0, 32));
      fileContent.value = toHexDump(buffer);
    };
    reader.readAsArrayBuffer(file);
  });

  clearBtn.addEventListener("click", () => {
    console.log("Clear button clicked.");
    fileInput.value = "";
    fileDisplay.textContent = "No file selected";
    fileContent.value = "";
  });

  // Hex dump function
  function toHexDump(bytes) {
    let lines = [];
    for (let i = 0; i < bytes.length; i += 16) {
      const chunk = bytes.slice(i, i + 16);
      const offset = i.toString(16).padStart(6, "0") + ":";

      const hex = Array.from(chunk)
        .map(b => b.toString(16).padStart(2, "0"))
        .join(" ");

      const ascii = Array.from(chunk)
        .map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : ".")
        .join("");

      lines.push(offset + " " + hex.padEnd(16 * 3 - 1, " ") + "  " + ascii);
    }
    return lines.join("\n");
  }
});




// -------------------- EOF --------------------