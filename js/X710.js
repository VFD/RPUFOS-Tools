/**
 * ------------------------------------------------------------
 *  Project : Nom du projet
 *  File    : plotter.js
 *  Author  : VincentD
 *  Date    : 2026-03-31
 *  License : CC BY-NC 4.0 International
 * ------------------------------------------------------------
 *  Description:
 *    - X710 emulator (standard commands only)
 *
 *  Notes:
 *    - ...
 *    - ...
 * ------------------------------------------------------------
 */

(function () {

const state = {
	// --- Pen state ---
	x: 0,					// Current pen X position (D,I,J,M,P,R)
	y: 0,					// Current pen Y position (D,I,J,M,P,R)
	penDown: false,			// Pen down (D) or up (M)
	pen: 1,					// Current pen number (C)

	// --- Drawing context ---
	ctx: null,				// Canvas 2D context
	svgPaths: [],			// Buffer of SVG path strings (for export)
	loadedFileName: null,	// Name of loaded file

	// --- Scaling & rotation ---
	scale: 1.0,				// Global scale factor (SC, IP)
	p1: { x: 0, y: 0 },		// Input scaling point 1 (IP)
	p2: { x: 1, y: 1 },		// Input scaling point 2 (IP)
	scaleWindow: {			// Input window (IW, SC)
	xmin: 0, xmax: 1,
	ymin: 0, ymax: 1
	},
	scaleX: 1.0,			// X scaling factor (SU, DU)
	scaleY: 1.0,			// Y scaling factor (SU, DU)
	userUnitX: 1.0,			// User unit scaling X (DU)
	userUnitY: 1.0,			// User unit scaling Y (DU)
	variables: {},			// Custom variables (DV)
	rotation: 0,			// Rotation angle (Q: 0/90/180/270)

	// --- Text settings ---
	charWidth: 1.0,			// Character width scale (S)
	charHeight: 1.0,		// Character height scale (S)
	charSpacing: 1.0,		// Character spacing ratio (SR)
	symbolMode: false,		// Symbol mode (LB with symbol mode)
	textAngle: 0,			// Text rotation angle (Q)
	labelLength: null,		// Max label length (SL)
	textTerminator: null,	// Label terminator (DT)
	labelOrigin: 0,			// Label origin alignment (LO: 0=left,1=center,2=right)
	extraSpace: 0,			// Extra spacing between characters (ES)
	bufferedLabel: null,	// Buffered label string (BL)
	charSet: 0,				// Character set ID (CS)
	charAssignments: {},	// Custom character definitions (CA)
	font: "sans-serif",		// Current font family (SS, SA)

	// --- Fill settings ---
	fillType: 0,			// Fill type (FT: 0=solid,1=hatch,2=cross-hatch,3=shading)
	fillSpacing: 10,		// Hatch spacing (FT)
	fillAngle: 0,			// Hatch angle (FT)

	// --- Polygon mode ---
	inPolygonMode: false,	// Polygon mode active (PM)
	polygon: [],			// Current polygon vertices (PM, EP, FP)
	polygonBuffer: [],		// Polygon buffer storage (PB)

	// --- Page & plotter control ---
	notReady: false,		// NR: plotter readiness flag
	pageSize: {				// PS: current page size
	width: 480,
	height: 2048
	},
	pageCount: 0			// PG/AF: number of pages advanced
};

// ==================================================
// GUI interface
// ==================================================

// Pen dropdowns
function getPenColor(penIndex) {
	const map = {
		1: document.getElementById('pen1Color')?.value,
		2: document.getElementById('pen2Color')?.value,
		3: document.getElementById('pen3Color')?.value,
		4: document.getElementById('pen4Color')?.value,
	};
	
  const color = map[penIndex] || '#000000';
  console.log("getPenColor:", penIndex, "=>", color);
  return color;
}



// ==================================================
// --------------------------------------------------
// Commands
// --------------------------------------------------
// ==================================================

function drawLine(x1, y1, x2, y2) {
  const ctx = state.ctx;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = getPenColor(state.pen);
  ctx.stroke();
}


// --------------------------------------------------
// Setup of plotter
// --------------------------------------------------
//
// Helper: reset drawing styles and text attributes
//
function resetDrawingDefaults() {
	// Pen state
	state.penDown = false;
	state.pen = 1;
	// Drawing styles
	if (state.ctx) {
		state.ctx.setLineDash([]);
		state.ctx.lineWidth = 1;
		state.ctx.strokeStyle = getPenColor(state.pen);
	}
	// Scaling & rotation
	state.scale = 1.0;
	state.scaleX = 1.0;
	state.scaleY = 1.0;
	state.rotation = 0;
	// Text defaults
	state.charWidth = 1.0;
	state.charHeight = 1.0;
	state.charSpacing = 1.0;
	state.symbolMode = false;
	state.textAngle = 0;
	state.labelLength = null;
	state.textTerminator = null;
	state.labelOrigin = 0;
	state.extraSpace = 0;
	state.font = "sans-serif";
	state.charSet = 0;
	state.charAssignments = {};
}
//
// IN: Full initialization to factory defaults
// to check if necessary
function cmdIN() {
  // Position & pen
  state.x = 0;
  state.y = 0;
  // Reset drawing defaults
  resetDrawingDefaults();
  // Buffers & files
  state.svgPaths = [];
  state.loadedFileName = null;
  // Input window & scaling points
  state.p1 = { x: 0, y: 0 };
  state.p2 = { x: 480, y: 2048 };
  state.scaleWindow = { xmin: 0, xmax: 480, ymin: 0, ymax: 2048 };
  // Fill settings
  state.fillType = 0;
  state.fillSpacing = 10;
  state.fillAngle = 0;
  // Polygon mode
  state.inPolygonMode = false;
  state.polygon = [];
  state.polygonBuffer = [];
  //
  console.log("IN command: full initialization to factory defaults");
}


// ==================================================
// ==================================================
// ==================================================
//  !!!!! PARSER !!!!!
// ==================================================
// ==================================================
// ==================================================
function parseCommandToken(token) {
	// Handle special CHR$() commands (no parameters)
	const chrMatch = token.match(/^CHR\$\(\d+\)$/);
	if (chrMatch) {
		return { cmd: token, args: '' };
	}
	
	// Handle single character commands with optional parameters
	const cmd = token.slice(0, 1).toUpperCase();
	const rest = token.slice(1).trim();
	const args = rest;
	return { cmd, args };
}

// ==================================================
// Setup of plotter
// ==================================================
// --------------------------------------------------
//
// --------------------------------------------------
function cmd17() {
	console.log("Text Mode, not implemented");
	
	return
}

// --------------------------------------------------
//
// --------------------------------------------------
function cmd18() {
	console.log("Graphic Mode, not implemented");
	
	return
}

// --------------------------------------------------
//
// --------------------------------------------------
function cmdA() {
	// Position reset
	state.x = 0;
	state.y = 0;
	// Reset drawing defaults
	resetDrawingDefaults();
	cmd17();
	//
	console.log("A command: drawing defaults restored, return to Text Mode.");
	return
}

// ==================================================
// Character Plot Commands
// ==================================================
// --------------------------------------------------
//
// --------------------------------------------------
function cmd8() {
	// 1 character to left
	console.log("Char left, not implemented");
	return
}

// --------------------------------------------------
//
// --------------------------------------------------
function cmd10() {
	// Line Feed
	console.log("Line feed, not implemented");
	return
}

// --------------------------------------------------
//
// --------------------------------------------------
function cmd11() {
	// Previous line
	console.log("Previous line, not implemented");
	return
}

// --------------------------------------------------
//
// --------------------------------------------------
function cmd13() {
	// Carriage return
	console.log("Carriage return, not implemented");
	return
}

// ==================================================
//  Plot Commands
// ==================================================
// --------------------------------------------------
//
// --------------------------------------------------
function cmdC(args) {
	// args = 0 or 1 or 2 or 3 [0-3]
	// example: C2
	
	if (args >= '0' && args <= '3') {
		state.pen = parseInt(args, 10);
		return true;
	}
	return false;
}

// --------------------------------------------------
//
// --------------------------------------------------
function cmdD(args) {
	const coords = args.split(',');
	console.log("D Draw Line.");
	for (let i = 0; i < coords.length; i += 2) {
		const x = parseInt(coords[i], 10);
		const y = parseInt(coords[i + 1], 10);
		
		state.penDown = true;
		drawLine(state.x, state.y, x, y);
		
		state.x = x;
		state.y = y;
	}
	
	return true;
}

// --------------------------------------------------
//
// --------------------------------------------------
function cmdF() {
	//
	console.log("F, not implemented");
	return
}

// --------------------------------------------------
//
// --------------------------------------------------
function cmdH() {
	// Go to origin
	console.log("Go to origin, not implemented");
	return
}

// --------------------------------------------------
//
// --------------------------------------------------
function cmdI() {
	// Set origin
	console.log("I: Set Origin, not implemented");
	
	return
}

// --------------------------------------------------
// Draw line relative
// --------------------------------------------------
function cmdJ(args) {
	// args = x,y...
	// example: J100,100,150,150
	console.log("J Draw Line Relative.");
	const coords = args.split(',');
	if (coords.length < 2) {
		return false;
	}
	for (let i = 0; i < coords.length; i += 2) {
		const dx = parseInt(coords[i], 10);
		const dy = parseInt(coords[i + 1], 10);
		state.penDown = true;
		drawLine(state.x, state.y, state.x + dx, state.y + dy);
		state.x += dx;
		state.y += dy;
	}
	return true;
}

// --------------------------------------------------
//
// --------------------------------------------------
function cmdL(args) {
	// args = [0-15]
	// example: L2
	console.log("Line type, not implemented");
	return
}

// --------------------------------------------------
// Move To
// --------------------------------------------------
function cmdM(args) {
	// args = x,y
	// example: M100,100
	console.log("M Move To.");
	const coords = args.split(',');
	if (coords.length < 2) {
		console.log("M without parameters: Mx,y");
		return false;
	}
	const x = parseInt(coords[0], 10);
	const y = parseInt(coords[1], 10);
	state.penDown = false;
	state.x = x;
	state.y = y;
	return true;
}

// --------------------------------------------------
//
// --------------------------------------------------
function cmdP(args) {
	// args: P[Characters]
	// example PHello World!
	console.log("P, not implemented");
	return
}

// --------------------------------------------------
//
// --------------------------------------------------
function cmdQ(args) {
	// args = 0 or 1 or 2 or 3 [0-3]
	// example: Q3
	console.log("Q, not implemented");
	return
}


// --------------------------------------------------
// Move relative to x,y
// --------------------------------------------------
function cmdR(args) {
	// args = x,y
	// example: R100,100
	console.log("R Move To Relative.");
	const coords = args.split(',');
	if (coords.length < 2) {
		console.log("R without parameters: Rx,y");
		return false;
	}
	const dx = parseInt(coords[0], 10);
	const dy = parseInt(coords[1], 10);
	state.penDown = false;
	state.x += dx;
	state.y += dy;
	return true;
}

// --------------------------------------------------
//
// --------------------------------------------------
function cmdS(args) {
	// args = [0-15]
	// example: S5
	console.log("S, not implemented");
	return
}

// --------------------------------------------------
// Parse to execute the right command
// --------------------------------------------------
function executeCommand(parsed) {
    switch (parsed.cmd) {
	  // Setup of plotter
      case "CHR$(17)": cmd17(); break;
	  case "CHR$(18)": cmd18(); break;
	  case "A": cmdA(); break;
      // Character Plot Commands
      case "CHR$(8)": cmd8(); break;
	  case "CHR$(10)": cmd10(); break;
	  case "CHR$(11)": cmd11(); break;
	  case "CHR$(13)": cmd13(); break;
	  //  Plot Commands
	  case "C": cmdC(parsed.args); break;
	  case "D": cmdD(parsed.args); break;
	  case "F": cmdF(); break;
	  case "H": cmdSU(parsed.args); break;
	  case "I": cmdI(); break;
	  case "J": cmdJ(parsed.args); break;
	  case "L": cmdL(parsed.args); break;
	  case "M": cmdM(parsed.args); break;
	  case "P": cmdP(parsed.args); break;
	  case "Q": cmdQ(parsed.args); break;
	  case "R": cmdR(parsed.args); break;
	  case "S": cmdS(parsed.args); break;
	  
      default: console.warn('Unknown Command:', parsed.cmd, parsed.args);
    }
  }

// --------------------------------------------------
// 
// --------------------------------------------------
function runCommands(text) {
	const lines = text.split('\n');
	lines.forEach(line => {
		const trimmedLine = line.trim();
		if (trimmedLine) {
			const parsed = parseCommandToken(trimmedLine);
			if (parsed.cmd) executeCommand(parsed);
		}
	});
}



// ---------------- file  management ----------------
async function loadFile(file) {
  if (!file) return;
  const text = await file.text();
  document.getElementById('commandsArea').value = text;
  state.loadedFileName = file.name;
  document.getElementById('filename').textContent = file.name;

  // Nom sans extension dans plotterName
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  document.getElementById('plotterName').value = baseName;

  // ✅ Autoplay : si la case est cochée, lancer le tracé
  if (document.getElementById('autoplay').checked) {
    runCommands(text);
  }
}


  function saveCommands() {
    const baseName = document.getElementById('plotterName').value || 'Plotter';
    const fileName = `${baseName}.plt`;
    const text = document.getElementById('commandsArea').value;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = fileName; a.click();
    URL.revokeObjectURL(url);
  }

  function savePNG() {
    const canvas = state.ctx.canvas;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a'); a.href = url; a.download = 'plot.png'; a.click();
  }

  function saveSVG() {
    const canvas = state.ctx.canvas;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}"></svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'plot.svg'; a.click();
  }



// Init canvas
function initCanvas() {
  const canvas = document.getElementById('plotCanvas');
  
  // IMPORTANT : définir les dimensions du canvas
  canvas.width = 480;   // Largeur du X710
  canvas.height = 2048; // Hauteur du X710
  
  state.ctx = canvas.getContext('2d');
  clearCanvas();
  console.log("Init Canvas - Dimensions: 480x2048");
}

// Clear canvas
function clearCanvas() {
  const canvas = state.ctx.canvas;
  
  // Effacer tout
  state.ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Remplir de blanc
  state.ctx.fillStyle = '#fff';
  state.ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  state.svgPaths = [];
  console.log("Clear Canvas");
}

  // ---------------- Bind UI ----------------
  function bindUI() {
    document.getElementById('btnTrace')?.addEventListener('click', () => runCommands(document.getElementById('commandsArea').value));
    document.getElementById('btnSaveCommands')?.addEventListener('click', saveCommands);
    document.getElementById('btnNew')?.addEventListener('click', () => { clearCanvas(); cmdIN(); });
    document.getElementById('btnSavePNG')?.addEventListener('click', savePNG);
    document.getElementById('btnSaveSVG')?.addEventListener('click', saveSVG);
    document.getElementById('fileInput')?.addEventListener('change', e => loadFile(e.target.files[0]));

    // Écoute des événements venant de com.js (autoplay)
    window.addEventListener('plotter:run', e => runCommands(e.detail));
  }

	window.addEventListener('DOMContentLoaded', () => { initCanvas(); bindUI(); });
  
})();


// -------------------- EOF --------------------