/**
 * ------------------------------------------------------------
 *  Project : Nom du projet
 *  File    : CharEdit.js
 *  Author  : VincentD
 *  Date    : 2025-12-04
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

// bin2phc.js
(() => {
  const PHC_HEADER = new Uint8Array(10).fill(0xA5);
  const NAME_LEN = 6;
  const PHC_FOOTER = new Uint8Array([
    0x00,0x00,0x01,0xC0,0x0A,0x00,0x00,0xFF,0xFF,0xFF,
    0xFF,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00
  ]);

  let binBytes = null;
  let loadedFilename = "";

  function bytesToHex(bytes) {
    const lines = [];
    for (let i = 0; i < bytes.length; i += 16) {
      const slice = bytes.subarray(i, Math.min(i + 16, bytes.length));
      const hex = Array.from(slice).map(b => b.toString(16).padStart(2, '0')).join(' ');
      lines.push(hex);
    }
    return lines.join('\n');
  }

  function buildProgramName(filename) {
    const base = filename.replace(/\.[^/.]+$/, "");
    const name = base.slice(0, NAME_LEN);
    const out = new Uint8Array(NAME_LEN);
    for (let i = 0; i < NAME_LEN; i++) {
      out[i] = i < name.length ? name.charCodeAt(i) : 0x20;
    }
    return out;
  }

  function buildBootloader(addrHex) {
    let addr = parseInt(addrHex, 16);
    const hexStr = addr.toString(16).toUpperCase().padStart(4, '0');
    const arr = [];
    arr.push(0xA5); // marker
    arr.push(0x26); // CALL token
    arr.push(0x48); // 'H'
    arr.push(0x43); // 'C'
    for (const ch of hexStr) arr.push(ch.charCodeAt(0));
    arr.push(0x00); // end
    return new Uint8Array(arr);
  }

  function buildPHC(bin, filename, startAddr) {
    const nameBytes = buildProgramName(filename);
    const boot = buildBootloader(startAddr);
    const payloadLen = boot.length + bin.length + PHC_FOOTER.length;
    const needsPadFF = (payloadLen % 2) !== 0;

    const totalLen =
      PHC_HEADER.length +
      nameBytes.length +
      boot.length +
      bin.length +
      (needsPadFF ? 1 : 0) +
      PHC_FOOTER.length;

    const out = new Uint8Array(totalLen);
    let off = 0;
    out.set(PHC_HEADER, off); off += PHC_HEADER.length;
    out.set(nameBytes, off);  off += nameBytes.length;
    out.set(boot, off);       off += boot.length;
    out.set(bin, off);        off += bin.length;
    if (needsPadFF) out[off++] = 0xFF;
    out.set(PHC_FOOTER, off); off += PHC_FOOTER.length;
    return out;
  }

  // UI wiring
  const loadBtn    = document.getElementById('loadBtn');
  const convertBtn = document.getElementById('convertBtn');
  const saveBtn    = document.getElementById('saveBtn');
  const filenameEl = document.getElementById('filename');
  const startAddrEl= document.getElementById('startAddr');
  const binHexTA   = document.getElementById('binHex');
  const phcHexTA   = document.getElementById('phcHex');

  // Font size controls
  function adjustFont(textarea, delta) {
    const style = window.getComputedStyle(textarea);
    const current = parseFloat(style.fontSize);
    textarea.style.fontSize = (current + delta) + "px";
  }
  document.getElementById('binFontInc').addEventListener('click', () => adjustFont(binHexTA, 2));
  document.getElementById('binFontDec').addEventListener('click', () => adjustFont(binHexTA, -2));
  document.getElementById('phcFontInc').addEventListener('click', () => adjustFont(phcHexTA, 2));
  document.getElementById('phcFontDec').addEventListener('click', () => adjustFont(phcHexTA, -2));

  loadBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.bin';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      loadedFilename = file.name;
      filenameEl.textContent = loadedFilename;
      const buf = await file.arrayBuffer();
      binBytes = new Uint8Array(buf);
      binHexTA.value = bytesToHex(binBytes);
      phcHexTA.value = "";
    };
    input.click();
  });

  convertBtn.addEventListener('click', () => {
    if (!binBytes || !loadedFilename) {
      alert('Load a BIN file first.');
      return;
    }
    const phc = buildPHC(binBytes, loadedFilename, startAddrEl.value);
    phcHexTA.value = bytesToHex(phc);
  });

  saveBtn.addEventListener('click', () => {
    if (!binBytes || !loadedFilename) {
      alert('Nothing to save. Load and convert first.');
      return;
    }
    const phc = buildPHC(binBytes, loadedFilename, startAddrEl.value);
    const blob = new Blob([phc], { type: 'application/octet-stream' });
    const a = document.createElement('a');
    const base = loadedFilename.replace(/\.[^/.]+$/, "");
    a.href = URL.createObjectURL(blob);
    a.download = `${base}.phc`;
    a.click();
  });
})();



// -------------------- EOF --------------------