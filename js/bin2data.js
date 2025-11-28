/**
 * ------------------------------------------------------------
 *  Project : Nom du projet
 *  File    : bin2data.js
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

// script.js

let loadedFile = null;
let outputArea = document.getElementById("outputArea");
let filenameDisplay = document.getElementById("filename");

// === Load Button ===
document.getElementById("loadBtn").addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.onchange = e => {
    loadedFile = e.target.files[0];
    filenameDisplay.textContent = loadedFile ? loadedFile.name : "No file loaded";
  };
  input.click();
});

// === Encode Button ===
document.getElementById("encodeBtn").addEventListener("click", () => {
  if (!loadedFile) {
    alert("No file loaded!");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);

    // Options
    const mode = document.querySelector("input[name='encodingMode']:checked").value;
    const startLine = parseInt(document.getElementById("startLine").value, 10) || 10;
    const increment = parseInt(document.getElementById("lineIncrement").value, 10) || 10;

    let lines = [];
    let lineNumber = startLine;

    // Group data into 16-byte blocks
    for (let i = 0; i < data.length; i += 16) {
      let chunk = data.slice(i, i + 16);
      let hexValues = Array.from(chunk).map(b => b.toString(16).padStart(2, "0").toUpperCase());

      if (mode === "concat") {
        // Concatenated hex string
        lines.push(`${lineNumber} DATA ${hexValues.join("")}`);
      } else if (mode === "comma") {
        // Comma-separated hex values
        lines.push(`${lineNumber} DATA ${hexValues.join(",")}`);
      }

      lineNumber += increment;
    }

    outputArea.value = lines.join("\n");
  };

  reader.readAsArrayBuffer(loadedFile);
});

// === Save Button ===
document.getElementById("saveBtn").addEventListener("click", () => {
  if (!outputArea.value) {
    alert("Nothing to save!");
    return;
  }

  let baseName = loadedFile ? loadedFile.name.replace(/\.[^/.]+$/, "") : "output";
  let blob = new Blob([outputArea.value], { type: "text/plain" });
  let link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = baseName + ".bas";
  link.click();
});

// === Text Size Controls ===
document.getElementById("increaseText").addEventListener("click", () => {
  let currentSize = parseFloat(window.getComputedStyle(outputArea).fontSize);
  outputArea.style.fontSize = (currentSize + 2) + "px";
});

document.getElementById("decreaseText").addEventListener("click", () => {
  let currentSize = parseFloat(window.getComputedStyle(outputArea).fontSize);
  outputArea.style.fontSize = Math.max(8, currentSize - 2) + "px";
});



// -------------------- EOF --------------------