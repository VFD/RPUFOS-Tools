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

let loadedFile = null;
const filenameDisplay = document.getElementById("filename");
const inputArea = document.getElementById("inputArea");
const outputArea = document.getElementById("outputArea");

// === Load Button ===
document.getElementById("loadBtn").addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".txt";
  input.onchange = e => {
    loadedFile = e.target.files[0];
    if (!loadedFile) {
      filenameDisplay.textContent = "No file loaded";
      return;
    }
    filenameDisplay.textContent = loadedFile.name;

    const reader = new FileReader();
    reader.onload = (ev) => {
      inputArea.value = ev.target.result || "";
    };
    reader.readAsText(loadedFile);
  };
  input.click();
});

// === Encode Button ===
document.getElementById("encodeBtn").addEventListener("click", () => {
  const text = inputArea.value;
  if (!text.trim()) {
    alert("No ASCII Art provided!");
    return;
  }

  const data = new TextEncoder().encode(text);
  const mode = document.querySelector("input[name='encodingMode']:checked").value;
  const startLine = parseInt(document.getElementById("startLine").value, 10) || 10;
  const increment = parseInt(document.getElementById("lineIncrement").value, 10) || 10;

  let lines = [];
  let lineNumber = startLine;

  for (let i = 0; i < data.length; i += 16) {
    const chunk = data.slice(i, i + 16);
    const hexValues = Array.from(chunk).map(b => b.toString(16).padStart(2, "0").toUpperCase());
    if (mode === "concat") {
      lines.push(`${lineNumber} DATA ${hexValues.join("")}`);
    } else {
      lines.push(`${lineNumber} DATA ${hexValues.join(",")}`);
    }
    lineNumber += increment;
  }

  outputArea.value = lines.join("\n");
});

// === Save Button ===
document.getElementById("saveBtn").addEventListener("click", () => {
  if (!outputArea.value) {
    alert("Nothing to save!");
    return;
  }
  const baseName = loadedFile ? loadedFile.name.replace(/\.[^/.]+$/, "") : "asciiart";
  const blob = new Blob([outputArea.value], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = baseName + ".bas";
  link.click();
});

// === Text Size Controls (apply to both input and output areas) ===
document.getElementById("increaseText").addEventListener("click", () => {
  [inputArea, outputArea].forEach(area => {
    const currentSize = parseFloat(window.getComputedStyle(area).fontSize);
    area.style.fontSize = (currentSize + 2) + "px";
  });
});

document.getElementById("decreaseText").addEventListener("click", () => {
  [inputArea, outputArea].forEach(area => {
    const currentSize = parseFloat(window.getComputedStyle(area).fontSize);
    area.style.fontSize = Math.max(8, currentSize - 2) + "px";
  });
});


// -------------------- EOF --------------------