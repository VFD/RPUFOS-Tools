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

let loadedFile = null;
let filenameDisplay = document.getElementById("filename");
//let leftArea = document.getElementById("leftArea");
//let rightArea = document.getElementById("rightArea");

// === Load Button ===
document.getElementById("loadBtn").addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".bin,*/*";
  input.onchange = e => {
    loadedFile = e.target.files[0];
    filenameDisplay.textContent = loadedFile ? loadedFile.name : "No file loaded";

    if (loadedFile) {
      const reader = new FileReader();
      reader.onload = function (ev) {
        const data = new Uint8Array(ev.target.result);
        // Affichage brut hexadécimal dans la zone gauche
        leftArea.value = bytesToHex(data);
      };
      reader.readAsArrayBuffer(loadedFile);
    }
  };
  input.click();
});

// === Encode Button ===
document.getElementById("buildBtn").addEventListener("click", () => {
  if (!loadedFile) {
    alert("No file loaded!");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);

    // Options depuis le dropdown
    const modeValue = document.getElementById("encodingMode").value;
    const [blockSizeStr, mode] = modeValue.split("-");
    const blockSize = parseInt(blockSizeStr, 10);

    const startLine = parseInt(document.getElementById("startLine").value, 10) || 10;
    const increment = parseInt(document.getElementById("lineIncrement").value, 10) || 10;

    let lines = [];
    let lineNumber = startLine;

    // Group data into blocks
    for (let i = 0; i < data.length; i += blockSize) {
      let chunk = data.slice(i, i + blockSize);
      let hexValues = Array.from(chunk).map(b => b.toString(16).padStart(2, "0").toUpperCase());

      if (mode === "concat") {
        lines.push(`${lineNumber} DATA ${hexValues.join("")}`);
      } else {
        lines.push(`${lineNumber} DATA ${hexValues.join(",")}`);
      }

      lineNumber += increment;
    }

    document.getElementById("rightArea").value = lines.join("\n");
  };

  reader.readAsArrayBuffer(loadedFile);
});


// === Save Button ===
document.getElementById("saveBtn").addEventListener("click", () => {
  if (!rightArea.value) {
    alert("Nothing to save!");
    return;
  }

  let baseName = loadedFile ? loadedFile.name.replace(/\.[^/.]+$/, "") : "output";
  let blob = new Blob([rightArea.value], { type: "text/plain" });
  let link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = baseName + ".bas";
  link.click();
});






// -------------------- EOF --------------------