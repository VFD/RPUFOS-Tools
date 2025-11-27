const keyWords = [
  "END","FOR","NEXT","DATA","INPUT","DIM","READ","LET","GOTO","RUN",
  "IF","RESTORE","GOSUB","RETURN","REM","STOP","OUT","ON","LPRINT","DEF",
  "POKE","PRINT","CONT","LIST","LLIST","CLEAR","COLOR","PSET","PRESET","LINE",
  "PAINT","SCREEN","CLS","LOCATE","CONSOLE","CLOAD","CSAVE","EXEC","SOUND","PLAY",
  "KEY","LCOPY","NEW","CTON","CTOFF","SLOAD","SSAVE","ELSE",
  "undoc1","undoc2","undoc3","undoc4","undoc5","undoc6","undoc7","undoc8","undoc9","undoc10",
  "undoc11","undoc12","undoc13","undoc14","undoc15","undoc16","undoc17","undoc18",
  "TAB(","TO","FN","SPC(","INKEY$","THEN","NOT","STEP",
  "+","-","*","/","^","AND","OR",">","=","<",
  "SGN","INT","ABS","USR","FRE","INP","LPOS","POS","SQR","RND","LOG","EXP","COS",
  "SIN","TAN","PEEK","LEN","SCRIN","STR$","VAL","ASC","CHR$","LEFT$","RIGHT$","MID$",
  "POINT","CSRLIN","STICK","STRIG","TIME"
];

let phcFilename = "PROGRAM";

function decodeLine(bytes, start, hardEnd) {
  let pos = start;
  let s = "";
  let inString = false;

  while (pos < hardEnd) {
    // Stop if we reached the line terminator
    const b = bytes[pos++];
    if (b === 0x00) break;

    // Toggle string state on "
    if (b === 0x22) {
      inString = !inString;
      s += '"';
      continue;
    }

    // Token vs ASCII
    if (!inString && b >= 0x80) {
      const idx = b - 0x80;
      const kw = keyWords[idx];
      s += (kw ?? `{TOK:${b.toString(16)}}`);
    } else {
      s += String.fromCharCode(b);
    }
  }
  return { text: s, nextPos: pos };
}

function phcToBas(phcBytes) {
  const bytes = Array.from(phcBytes);
  let pos = 0;

  // 10 bytes sync
  pos += 10;

  // 6 bytes filename
  const nameBytes = bytes.slice(pos, pos + 6);
  pos += 6;
  phcFilename = "";
  for (let b of nameBytes) if (b !== 0x00) phcFilename += String.fromCharCode(b);
  if (!phcFilename) phcFilename = "PROGRAM";

  // Find 00 00 00 separator (start of index table)
  let sepPos = -1;
  for (let i = pos; i < bytes.length - 2; i++) {
    if (bytes[i] === 0x00 && bytes[i + 1] === 0x00 && bytes[i + 2] === 0x00) {
      sepPos = i;
      break;
    }
  }
  if (sepPos < 0) throw new Error("Séparateur 00 00 00 introuvable");

  // Decode lines safely without over-reading: stop before 00 00 00
  const lines = [];
  let scan = pos;
  while (scan < sepPos) {
    // If next 3 bytes are the separator, stop right now (no extra line)
    if (
      scan + 2 <= sepPos &&
      bytes[scan] === 0x00 &&
      bytes[scan + 1] === 0x00 &&
      bytes[scan + 2] === 0x00
    ) {
      break;
    }
    const { text, nextPos } = decodeLine(bytes, scan, sepPos);
    // Avoid pushing accidental empty lines (e.g., lone 0x00)
    if (text.length > 0) lines.push(text);
    scan = nextPos;
  }

  // Find trailer FF FF FF FF after index start
  const indexStart = sepPos + 3;
  let trailerPos = -1;
  for (let i = indexStart; i < bytes.length - 3; i++) {
    if (
      bytes[i] === 0xFF &&
      bytes[i + 1] === 0xFF &&
      bytes[i + 2] === 0xFF &&
      bytes[i + 3] === 0xFF
    ) {
      trailerPos = i;
      break;
    }
  }
  if (trailerPos < 0) throw new Error("Trailer FF FF FF FF introuvable");

  // Read index entries: [addrLo][addrHi][numLo][numHi], collect only line numbers
  const allLineNumbers = [];
  for (let i = indexStart; i < trailerPos; i += 4) {
    const numLo = bytes[i + 2];
    const numHi = bytes[i + 3];
    const num = numLo + (numHi << 8);
    // Table is inverse order: last line first
    allLineNumbers.unshift(num);
  }

  // Align the index to the actual number of decoded lines (fix off-by-one)
  const needed = lines.length;
  const lineNumbers = allLineNumbers.slice(-needed);

  // Reconstruct BAS text
  let basText = "";
  for (let i = 0; i < lines.length; i++) {
    const num = lineNumbers[i] ?? ((i + 1) * 10);
    basText += num + " " + lines[i] + "\n";
  }

  return basText.trim();
}

// UI
document.getElementById("loadBtnPhc").addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".phc";
  input.onchange = e => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const bytes = new Uint8Array(reader.result);
        const basText = phcToBas(bytes);
        document.getElementById("basOutput").value = basText;
        document.getElementById("phcName").textContent = phcFilename;
        document.getElementById("lineCount").textContent = basText.split("\n").length;
        document.getElementById("saveBtnBas").disabled = false;
      } catch (err) {
        document.getElementById("basOutput").value = "Erreur: " + err.message;
      }
    };
    reader.readAsArrayBuffer(file);
  };
  input.click();
});

document.getElementById("saveBtnBas").addEventListener("click", () => {
  const basText = document.getElementById("basOutput").value;
  if (!basText) return;
  const blob = new Blob([basText], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = phcFilename + ".bas";
  link.click();
});
