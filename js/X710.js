/**
 * ------------------------------------------------------------
 *  Project : Nom du projet
 *  File    : X710.js
 *  Author  : VincentD
 *  Date    : 2026-04-01
 *  License : CC BY-NC 4.0 International
 * ------------------------------------------------------------
 *  Description:
 *    - X710 emulator (standard commands only)
 *
 *  Notes:
 *    - BUG Y, need -y
 *    - ...
 * ------------------------------------------------------------
 */

(function () {

const state = {
	// --- Pen state ---
	x: 0,					// Current pen X position (D,I,J,M,P,R)
	y: 0,					// Current pen Y position (D,I,J,M,P,R)
	penDown: false,			// Pen down (D) or up (M)
	pen: 0,					// Current pen number (C)
	// --- origin ---
	xo: 0,
	yo: 0,
	// --- Drawing context ---
	ctx: null,				// Canvas 2D context
	svgPaths: [],			// Buffer of SVG path strings (for export)
	loadedFileName: null,	// Name of loaded file
	// --- Text settings ---
	charWidth: 1.0,			// Character width scale (S)
	charHeight: 1.0,		// Character height scale (S)
	charSpacing: 1.0,		// Character spacing ratio (S)
	textAngle: 0,			// Text rotation angle (Q)
	font: "sans-serif",		// Current font family (P)
	// --- Canvas ---
	width: 480,
	height: 2048
};

// ==================================================
// GUI interface
// ==================================================

// Pen dropdowns
function getPenColor(penIndex) {
	const map = {
		0: document.getElementById('pen1Color')?.value,
		1: document.getElementById('pen2Color')?.value,
		2: document.getElementById('pen3Color')?.value,
		3: document.getElementById('pen4Color')?.value,
	};
  const color = map[penIndex] || '#000000';
  console.log("getPenColor:", penIndex, "=>", color);
  return color;
}

// Display origin
function displayOrigin() {
	document.getElementById('originXY').textContent = state.xo + "," + state.yo ;
	return
}

// Display Last x,y
function displayLastPosition() {
	document.getElementById('lastXY').textContent = state.x + "," + (-state.y) ;
	return
}

// Display Pen
function displayPen() {
	document.getElementById('penStatus').textContent = state.pen ;
	return
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
	//
	state.ctx.resetTransform();
	// Pen state
	state.penDown = false;
	state.pen = 0;
	// Drawing styles
	if (state.ctx) {
		state.ctx.setLineDash([]);
		state.ctx.lineWidth = 1;
		state.ctx.strokeStyle = getPenColor(state.pen);
	}
	// Text defaults - S2 default
	const defaultSize = 2;
	state.charWidth = 6 + (defaultSize * 6);  // = 18px
	state.charHeight = state.charWidth * 1.5;
	state.charSpacing = 1.0;
	state.textAngle = 0;
	state.font = "sans-serif";
	//
	imageSmoothingEnabled = false;
	state.ctx.lineWidth = 1;

	//
	displayOrigin();
	displayLastPosition();
	displayPen();
}

//
// IN: initialization
// to check if necessary
function cmdIN() {
	// Position & pen
	state.x = 0;
	state.y = 0;
	state.xo = 0;
	state.yo = 0;
	// Reset drawing defaults
	resetDrawingDefaults();
	// S2
	cmdS("2");
	// Buffers & files
	state.svgPaths = [];
	state.loadedFileName = null;
	// Input window & scaling points
	state.p1 = { x: 0, y: 0 };
	state.p2 = { x: 480, y: 2048 };
	state.scaleWindow = { xmin: 0, xmax: 480, ymin: 0, ymax: 2048 };
	// reverse Y
	state.ctx.scale(1, -1);
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
// to text mode
// --------------------------------------------------
function cmd17() {
	console.log("Text Mode, not implemented");
	return
}

// --------------------------------------------------
// To Graphic mode
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
	state.pen = 0;
	// Reset drawing defaults
	resetDrawingDefaults();
	cmd17();
	//
	displayOrigin();
	displayLastPosition();
	displayPen();
	//
	console.log("A command: drawing defaults restored, return to Text Mode.");
	return
}

// ==================================================
// Character Plot Commands
// ==================================================
// --------------------------------------------------
// 1 char to the left
// --------------------------------------------------
function cmd8() {
	// 1 character to left
	penDown: false;
	//
	displayLastPosition();
	console.log("Char left: not implemented");
	return
}

// --------------------------------------------------
// Line feed = new line
// --------------------------------------------------
function cmd10() {
	// Line Feed
	penDown: false;
	//
	displayLastPosition();
	console.log("Line feed: not implemented");
	return
}

// --------------------------------------------------
// Previous line
// --------------------------------------------------
function cmd11() {
	// Previous line
	penDown: false;
	//
	displayLastPosition();
	console.log("Previous line: not implemented");
	return
}

// --------------------------------------------------
// Carriage return = go to the left
// --------------------------------------------------
function cmd13() {
	// Carriage return
	penDown: false;
	state.x = 0;
	displayLastPosition();
	console.log("Carriage return: in test");
	return
}

// ==================================================
//  Plot Commands
// ==================================================
// --------------------------------------------------
// Change PEN
// --------------------------------------------------
function cmdC(args) {
	// args = 0 or 1 or 2 or 3 [0-3]
	// example: C2
	if (args >= '0' && args <= '3') {
		console.log("C: change pen.");
		state.pen = parseInt(args, 10);		// args -> decimal
		displayPen();
		return true;
	}
	return false;
}

// --------------------------------------------------
// Draw Line
// --------------------------------------------------
function cmdD(args) {
	const coords = args.split(',');
	
	for (let i = 0; i < coords.length; i += 2) {
		const x = parseInt(coords[i], 10);
		//reverse Y
		const y = -parseInt(coords[i + 1], 10);
		state.penDown = true;
		drawLine(state.x, state.y, x, y);
		console.log("D: Draw Line. " + x + "," + y);
		state.x = x;
		state.y = y;
		displayLastPosition();
	}
	return true;
}

// --------------------------------------------------
// 
// --------------------------------------------------
function cmdF() {
	//
	console.log("F: not implemented");
	return
}

// --------------------------------------------------
// Return to origin
// --------------------------------------------------
function cmdH() {
	state.penDown = false;
	// Go to origin, (0,0 in relative coordinates)
	state.x = 0;
	state.y = 0;
	displayLastPosition();
	console.log("H: Go to origin, 0,0");
	return
}

// --------------------------------------------------
// Set the new origin
// --------------------------------------------------
function cmdI() {
	// Reset transform
	state.ctx.resetTransform();
	// New origin
	state.xo = state.x;
	state.yo = state.y;
	// new translate
	state.ctx.translate(state.x, -state.y);
	//
	state.x = 0;
	state.y = 0;
	//
	displayOrigin();
	displayLastPosition();
	console.log("I: Set Origin at ("+state.xo+","+state.yo+")" + "- reset x,y ("+state.x+","+state.y+")");
	return
}

// --------------------------------------------------
// Draw line relative
// --------------------------------------------------
function cmdJ(args) {
	// args = x,y...
	// example: J100,100,150,150
	console.log("J: Draw Line Relative.");
	const coords = args.split(',');
	if (coords.length < 2) {
		return false;
	}
	for (let i = 0; i < coords.length; i += 2) {
		const dx = parseInt(coords[i], 10);
		// reverse Y
		const dy = -parseInt(coords[i + 1], 10);
		state.penDown = true;
		drawLine(state.x, state.y, state.x + dx, state.y + dy);
		state.x += dx;
		state.y += dy;
		displayLastPosition();
	}
	return true;
}

// --------------------------------------------------
// Line type
// --------------------------------------------------
function cmdL(args) {
	// args = [0-15]
	// example: L2
	console.log("Line type, not implemented");
	return
}

// --------------------------------------------------
// Move To, Bug
// --------------------------------------------------
function cmdM(args) {
	// args = x,y
	// example: M100,100
	const coords = args.split(',');
	if (coords.length < 2) {
		console.log("M: invalide parameters, Mx,y");
		return false;
	}
	const x = parseInt(coords[0], 10);
	// reverse Y?
	const y = parseInt(coords[1], 10);
	state.penDown = false;
	// bug on prend pas en compte I si set
	state.x = x;  // 
	state.y = y;  // 
	if (state.yo != 0) { state.y = -y;}
	console.log("M Move To." + state.x + "," + state.y);
	displayLastPosition();
	return true;
}

// --------------------------------------------------
// Print text
// --------------------------------------------------
function cmdP(args) {
	// args: P[Characters]
	// example: PHello World!
	
	if (!args || args.length === 0) {
		console.log("P: no text to print");
		return false;
	}
	
	// Utiliser state.charWidth et state.charHeight définis par cmdS()
	const ctx = state.ctx;
	ctx.font = `${state.charHeight}px ${state.font}`;
	ctx.fillStyle = getPenColor(state.pen);
	ctx.textBaseline = 'top';
	
	// Écrire le texte
	ctx.fillText(args, state.x, state.y);
	
	// Avancer la position X (largeur totale du texte)
	state.x += args.length * state.charWidth * state.charSpacing;
	
	displayLastPosition();
	console.log("P: Print text '" + args + "'");
	return true;
}

// --------------------------------------------------
// text angle (in °)
// --------------------------------------------------
function cmdQ(args) {
	// args = 0 or 1 or 2 or 3 [0-3]
	// example: Q3
	const a = parseInt(args[0], 10);
	if (a == 0) { state.textAngle = 0; }
	if (a == 1) { state.textAngle = -90; }
	if (a == 2) { state.textAngle = 180; }
	if (a == 3) { state.textAngle = 90; }
	// 
	console.log("Q: ", state.textAngle ," - not functional");
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
	// reverse Y
	const dy = -parseInt(coords[1], 10);
	state.penDown = false;
	state.x += dx;
	state.y += dy;
	displayLastPosition();
	return true;
}

// --------------------------------------------------
// Text size
// --------------------------------------------------
function cmdS(args) {
	// args = [0-15]
	// example: S5
	const size = parseInt(args, 10);
	
	if (size < 0 || size > 15) {
		console.log("S: invalid size (0-15)");
		return false;
	}
	
	// Progression : S0 = 80 chars (6px), S15 = 5 chars (96px)
	// Formule : charWidth = 6 + (size * 6)
	state.charWidth = 6 + (size * 6);
	state.charHeight = state.charWidth * 1.5;
	
	console.log("S: Text size " + size + " - charWidth: " + state.charWidth + "px");
	return true;
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
	  case "H": cmdH(parsed.args); break;
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
// parse text area and split commands, then execute
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


// --------------------------------------------------
// ---------------- file  management ----------------
// --------------------------------------------------
async function loadFile(file) {
	//
	if (!file) return;
	//
	const text = await file.text();
	document.getElementById('commandsArea').value = text;
	state.loadedFileName = file.name;
	document.getElementById('filename').textContent = file.name;
	// No extension in plotterName
	const baseName = file.name.replace(/\.[^/.]+$/, '');
	document.getElementById('plotterName').value = baseName;
	// ✅ Autoplay : if yes, launch commands
	if (document.getElementById('autoplay').checked) {
		runCommands(text);
	}
}

// --------------------------------------------------
// Save the text area as .plt file
// --------------------------------------------------
function saveCommands() {
	const baseName = document.getElementById('plotterName').value || 'Plotter';
	const fileName = `${baseName}.plt`;
	const text = document.getElementById('commandsArea').value;
	const blob = new Blob([text], { type: 'text/plain' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a'); a.href = url; a.download = fileName; a.click();
	URL.revokeObjectURL(url);
}

// --------------------------------------------------
// Save canvas as PNG file
// --------------------------------------------------
function savePNG() {
	const canvas = state.ctx.canvas;
	const url = canvas.toDataURL('image/png');
	const a = document.createElement('a'); a.href = url; a.download = 'plot.png'; a.click();
}

// --------------------------------------------------
// Save canvas as SVG file
// --------------------------------------------------
function saveSVG() {
	const canvas = state.ctx.canvas;
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}"></svg>`;
	const blob = new Blob([svg], { type: 'image/svg+xml' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a'); a.href = url; a.download = 'plot.svg'; a.click();
}

// --------------------------------------------------
// Init canvas
// --------------------------------------------------
function initCanvas() {
	const canvas = document.getElementById('plotCanvas');
	// IMPORTANT : canvas dimensions
	canvas.width = 480;   // width du X710
	canvas.height = 2048; // height X710
	//
	state.ctx = canvas.getContext('2d');
	clearCanvas();
	//
	displayOrigin();
	displayLastPosition();
	displayPen();
	//
	cmdS("2");
	//
	state.ctx.scale(1, -1);
	//
	console.log("Init Canvas - Dimensions: 480x2048");
}

// --------------------------------------------------
// Clear canvas
// --------------------------------------------------
function clearCanvas() {
	const canvas = state.ctx.canvas;
	// reset transform (I)
	state.ctx.resetTransform();
	// Clear
	state.ctx.clearRect(0, 0, canvas.width, canvas.height);
	// in white
	state.ctx.fillStyle = '#fff';
	state.ctx.fillRect(0, 0, canvas.width, canvas.height);
	//  
	state.svgPaths = [];
	console.log("Canvas Cleared");
	//
	state.ctx.scale(1, -1);
}

// --------------------------------------------------
// -------------------- Bind  UI --------------------
// --------------------------------------------------
function bindUI() {
	document.getElementById('btnTrace')?.addEventListener('click', () => runCommands(document.getElementById('commandsArea').value));
	document.getElementById('btnSaveCommands')?.addEventListener('click', saveCommands);
	document.getElementById('btnNew')?.addEventListener('click', () => { clearCanvas(); cmdIN(); });
	document.getElementById('btnSavePNG')?.addEventListener('click', savePNG);
	document.getElementById('btnSaveSVG')?.addEventListener('click', saveSVG);
	document.getElementById('fileInput')?.addEventListener('change', e => loadFile(e.target.files[0]));
	// (autoplay)
	//window.addEventListener('plotter:run', e => runCommands(e.detail));
}

window.addEventListener('DOMContentLoaded', () => { initCanvas(); bindUI(); });
  
})();


// -------------------- EOF --------------------