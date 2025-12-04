/**
 * ------------------------------------------------------------
 *  Project : Nom du projet
 *  File    : plotter.js
 *  Author  : VincentD
 *  Date    : 2025-11-26
 *  License : CC BY-NC 4.0 International
 * ------------------------------------------------------------
 *  Description:
 *    - HP-GL emulator (standard commands only)
 *
 *  Notes:
 *    - Compatible with GitHub Pages.
 *    - 
 * ------------------------------------------------------------
 */

(function () {

const state = {
	// --- Pen state ---
	x: 0,					// Current pen X position (PA, PR, PU, PD)
	y: 0,					// Current pen Y position (PA, PR, PU, PD)
	penDown: false,			// Pen down (PD) or up (PU)
	pen: 1,					// Current pen number (SP)

	// --- Drawing context ---
	ctx: null,				// Canvas 2D context
	svgPaths: [],			// Buffer of SVG path strings (for export)
	loadedFileName: null,	// Name of loaded HPGL file

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
	rotation: 0,			// Rotation angle (RO: 0/90/180/270)

	// --- Text settings ---
	charWidth: 1.0,			// Character width scale (SI)
	charHeight: 1.0,		// Character height scale (SI)
	charSpacing: 1.0,		// Character spacing ratio (SR)
	symbolMode: false,		// Symbol mode (LB with symbol mode)
	textAngle: 0,			// Text rotation angle (DI, DR)
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
	width: 800,
	height: 600
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
// Commands HP-GL
// --------------------------------------------------
// ==================================================

function drawLine(x1, y1, x2, y2) {
  const ctx = state.ctx;
  const p1 = toCanvas(x1, y1);
  const p2 = toCanvas(x2, y2);
  ctx.beginPath();
  ctx.moveTo(p1.cx, p1.cy);
  ctx.lineTo(p2.cx, p2.cy);
  ctx.strokeStyle = getPenColor(state.pen);
  ctx.stroke();
}


function toCanvas(hpglX, hpglY) {
  const { xmin, xmax, ymin, ymax } = state.scaleWindow;

  const nx = (hpglX - xmin) / (xmax - xmin);
  const ny = (hpglY - ymin) / (ymax - ymin);

  const cx = nx * state.ctx.canvas.width;
  const cy = (1 - ny) * state.ctx.canvas.height; // inversion Y

  let rx = cx, ry = cy;
  switch (state.rotation) {
    case 90:
      rx = cy;
      ry = state.ctx.canvas.width - cx;
      break;
    case 180:
      rx = state.ctx.canvas.width - cx;
      ry = state.ctx.canvas.height - cy;
      break;
    case 270:
      rx = state.ctx.canvas.height - cy;
      ry = cx;
      break;
  }

  return { cx: rx, cy: ry };
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
//
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
  state.p2 = { x: 800, y: 600 };
  state.scaleWindow = { xmin: 0, xmax: 800, ymin: 0, ymax: 600 };
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

//
// DF: Reset drawing defaults only
//
function cmdDF() {
	// Position reset
	state.x = 0;
	state.y = 0;
	// Reset drawing defaults
	resetDrawingDefaults();
	//
	console.log("DF command: drawing defaults restored");
}
//
// IP:
//
function cmdIP(args) {
	if (args.length < 4) {
		console.warn("IP: besoin de 4 arguments (x1,y1,x2,y2)", args);
		return;
	}
	//
	const x1 = parseFloat(args[0]);
	const y1 = parseFloat(args[1]);
	const x2 = parseFloat(args[2]);
	const y2 = parseFloat(args[3]);
	//
	if ([x1, y1, x2, y2].some(v => isNaN(v))) {
		console.warn("IP: arguments invalides", args);
		return;
	}
	//
	state.p1 = { x: x1, y: y1 };
	state.p2 = { x: x2, y: y2 };
	//
	console.log("IP command: P1=", state.p1, "P2=", state.p2);
}
//
// SC: Scale - SC xmin, xmax, ymin, ymax;
//
function cmdSC(args) {
	if (!args || args.length < 4) {
		console.warn("SC: need 4 arguments (xmin, xmax, ymin, ymax)", args);
		return;
	}
	//
	const xmin = parseFloat(args[0]);
	const xmax = parseFloat(args[1]);
	const ymin = parseFloat(args[2]);
	const ymax = parseFloat(args[3]);
	//
	if ([xmin, xmax, ymin, ymax].some(v => isNaN(v))) {
		console.warn("SC: invalid arguments", args);
		return;
	}
	//
	state.scaleWindow = { xmin, xmax, ymin, ymax };
	console.log("SC command: scale window set", state.scaleWindow);
}

// --------------------------------------------------
// Basic Plot Command
// --------------------------------------------------
//
// SP:
//
function cmdSP(arg) {
	// If no argument → deselect pen
	if (arg == null || arg === "") {
		state.pen = 0; // 0 = no pen selected
		state.penDown = false;
		console.log("SP command: no pen selected");
		return;
	}

	const n = parseInt(arg, 10);
	if (!isNaN(n) && n >= 0) {
	state.pen = n;
		if (state.ctx) {
			state.ctx.strokeStyle = getPenColor(state.pen);
		}
		console.log("SP command: pen selected =", n);
		} else {
			console.warn("SP: invalid pen number", arg);
		}
}
//
// Core coordinate processor used by PA, PR, PU, PD
//
function processCoords(args, isRelative, penDown) {
  if (!args || args.length < 2) return;

  const ctx = state.ctx;
  ctx.beginPath();

  // start at the current position if pen is down
  if (penDown) {
    const startPt = toCanvas(state.x, state.y);
    ctx.moveTo(startPt.cx, startPt.cy);
  }

  for (let i = 0; i < args.length; i += 2) {
    const dx = parseFloat(args[i]);
    const dy = parseFloat(args[i + 1]);
    if (isNaN(dx) || isNaN(dy)) continue;

    let newX = isRelative ? state.x + dx : dx;
    let newY = isRelative ? state.y + dy : dy;

    if (state.inPolygonMode) {
      state.polygon.push({ x: newX, y: newY });
    } else {
      const pt = toCanvas(newX, newY);
      if (penDown) {
        ctx.lineTo(pt.cx, pt.cy);
        state.svgPaths.push(`L${pt.cx},${pt.cy}`);
      } else {
        ctx.moveTo(pt.cx, pt.cy);
        state.svgPaths.push(`M${pt.cx},${pt.cy}`);
      }
    }

    state.x = newX;
    state.y = newY;
  }

  if (penDown) {
    ctx.strokeStyle = getPenColor(state.pen);
    ctx.stroke();
  }
}

//
// Pen Up: lift pen and move to coordinates
//
function cmdPU(args) {
	state.penDown = false;
	processCoords(args, state.plotMode === "PR", false);
	console.log("PU command: pen up, moved to", state.x, state.y);
}
//
// Pen Down: lower pen and draw to coordinates
//
function cmdPD(args) {
  state.penDown = true;
  const ctx = state.ctx;
  ctx.beginPath();

  // move to current pen position first
  const startPt = toCanvas(state.x, state.y);
  ctx.moveTo(startPt.cx, startPt.cy);

  for (let i = 0; i < args.length; i += 2) {
    const dx = parseFloat(args[i]);
    const dy = parseFloat(args[i + 1]);
    if (isNaN(dx) || isNaN(dy)) continue;

    const newX = state.plotMode === "PR" ? state.x + dx : dx;
    const newY = state.plotMode === "PR" ? state.y + dy : dy;

    const pt = toCanvas(newX, newY);
    ctx.lineTo(pt.cx, pt.cy);

    state.x = newX;
    state.y = newY;

    // Ajout des sommets si on est en mode polygone
    if (state.inPolygonMode && state.polygon) {
      state.polygon.push({ x: newX, y: newY });
    }
  }

  ctx.strokeStyle = getPenColor(state.pen);
  ctx.stroke();
}



//
// Plot Absolute: switch to absolute mode and move/draw
//
function cmdPA(args) {
	state.plotMode = "PA"; // absolute mode
	processCoords(args, false, state.penDown);
	console.log("PA command: absolute plotting, now at", state.x, state.y);
}
//
// Plot Relative: switch to relative mode and move/draw
//
function cmdPR(args) {
	state.plotMode = "PR"; // relative mode
	processCoords(args, true, state.penDown);
	console.log("PR command: relative plotting, now at", state.x, state.y);
}
//
// LT:
//
function toCanvasLength(len) {
	// Convert a user length into canvas units (x-axis scaling)
	const pt = toCanvas(len, 0);
	return pt.cx;
}
//
function cmdLT(args) {
	const pattern = args && args.length > 0 ? parseInt(args[0], 10) : 0;
	const userLength = args && args.length > 1 ? parseFloat(args[1]) : 10; // default length
	const dashLen = toCanvasLength(userLength);

	switch (pattern) {
		case 0: // solid line
			state.ctx.setLineDash([]);
			break;
		case 1: // dashed
			state.ctx.setLineDash([dashLen, dashLen]);
			break;
		case 2: // dotted
			state.ctx.setLineDash([1, dashLen]); // short dot, long gap
			break;
		case 3: // dash-dot
			state.ctx.setLineDash([dashLen, dashLen / 2, 1, dashLen / 2]);
			break;
		case 4: // long dash
			state.ctx.setLineDash([dashLen * 2, dashLen]);
			break;
		case 5: // short dash
			state.ctx.setLineDash([dashLen / 2, dashLen / 2]);
			break;
		case 6: // dash-dot-dot
			state.ctx.setLineDash([dashLen, dashLen / 2, 1, dashLen / 2, 1, dashLen / 2]);
			break;
		case 7: // complex pattern (approximation)
			state.ctx.setLineDash([dashLen, dashLen / 2, 2, dashLen / 2, dashLen / 2, dashLen]);
			break;
		default:
			console.warn("LT: unknown pattern", pattern);
			state.ctx.setLineDash([]);
	}
	//
	console.log("LT command:", { pattern, userLength, dashLen });
}

// --------------------------------------------------
// Plot of Circle, Arc and Polygon
// --------------------------------------------------
//
// CT
//
function cmdCT(args) {
	if (!args || args.length < 1) {
	console.warn("CT: missing argument");
	return;
	}
	//
	const type = parseInt(args[0], 10);
	if (isNaN(type)) {
	console.warn("CT: invalid argument", args[0]);
	return;
	}
	// Store character type in state
	state.charType = type;
	// Apply to canvas context (approximation)
	switch (type) {
		case 0: // standard
			state.ctx.font = `${state.charHeight * 10}px sans-serif`;
			break;
		case 1: // italic
			state.ctx.font = `italic ${state.charHeight * 10}px sans-serif`;
			break;
		case 2: // bold
			state.ctx.font = `bold ${state.charHeight * 10}px sans-serif`;
			break;
		default:
			console.warn("CT: unknown type", type);
			state.ctx.font = `${state.charHeight * 10}px sans-serif`;
	}
	//
	console.log("CT command: character type set to", type);
}
//
// CI: Circle
//
function cmdCI(args) {
  if (!args || args.length < 1) return;

  const r = parseFloat(args[0]);
  if (isNaN(r) || r <= 0) return;

  const segments = args.length > 1 ? parseInt(args[1], 10) : 360;
  const radius = toCanvasLength ? toCanvasLength(r) : r;
  const center = toCanvas(state.x, state.y);

  state.ctx.beginPath();

  for (let i = 0; i <= segments; i++) {
    const angle = (2 * Math.PI * i) / segments;
    const cx = center.cx + radius * Math.cos(angle);
    const cy = center.cy + radius * Math.sin(angle);

    if (i === 0) {
      state.ctx.moveTo(cx, cy);
      state.svgPaths.push(`M${cx},${cy}`);
    } else {
      state.ctx.lineTo(cx, cy);
      state.svgPaths.push(`L${cx},${cy}`);
    }
  }

  // toujours tracer le cercle
  state.ctx.strokeStyle = getPenColor(state.pen);
  state.ctx.stroke();

  console.log("CI command: circle radius", r, "segments", segments);
}

//
// AA x,y,angle[,chord];
//
function cmdAA(args) {
  if (!args || args.length < 3) {
    console.warn("AA: missing arguments");
    return;
  }

  const cx = parseFloat(args[0]); // center X in user units
  const cy = parseFloat(args[1]); // center Y in user units
  const angleDeg = parseFloat(args[2]); // sweep angle in degrees
  const segments = args.length > 3 ? parseInt(args[3], 10) : 90; // default chord count

  if (isNaN(cx) || isNaN(cy) || isNaN(angleDeg)) {
    console.warn("AA: invalid arguments", args);
    return;
  }

  // Convert center and start point to canvas coordinates
  const center = toCanvas(cx, cy);
  const start = toCanvas(state.x, state.y);

  // Compute radius in canvas units
  const radius = Math.hypot(start.cx - center.cx, start.cy - center.cy);

  // Compute start and end angles in radians
  const startAngle = Math.atan2(start.cy - center.cy, start.cx - center.cx);
  const endAngle = startAngle + (angleDeg * Math.PI / 180);

  state.ctx.beginPath();
  state.ctx.moveTo(start.cx, start.cy);

  // Approximate arc with line segments so it integrates with PU/PD path logic
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const theta = startAngle + t * (endAngle - startAngle);
    const x = center.cx + radius * Math.cos(theta);
    const y = center.cy + radius * Math.sin(theta);

    state.ctx.lineTo(x, y);
    state.svgPaths.push(`L${x},${y}`);
  }

  if (state.penDown) {
    state.ctx.strokeStyle = getPenColor(state.pen);
    state.ctx.stroke();
  }

  // Update current pen position in user coordinates
  const endX = cx + Math.cos(endAngle) * (radius / (state.ctx.canvas.width / 1000));
  const endY = cy + Math.sin(endAngle) * (radius / (state.ctx.canvas.height / 1000));
  state.x = endX;
  state.y = endY;

  console.log("AA command: arc center", cx, cy, "angle", angleDeg, "segments", segments);
}
//
// AR dx,dy,angle[,chord];
//
function cmdAR(args) {
  if (!args || args.length < 3) {
    console.warn("AR: missing arguments");
    return;
  }

  const dx = parseFloat(args[0]); // relative X offset
  const dy = parseFloat(args[1]); // relative Y offset
  const angleDeg = parseFloat(args[2]); // sweep angle in degrees
  const segments = args.length > 3 ? parseInt(args[3], 10) : 90; // default chord count

  if (isNaN(dx) || isNaN(dy) || isNaN(angleDeg)) {
    console.warn("AR: invalid arguments", args);
    return;
  }

  // Compute arc center in user coordinates
  const cx = state.x + dx;
  const cy = state.y + dy;

  // Convert center and start point to canvas coordinates
  const center = toCanvas(cx, cy);
  const start = toCanvas(state.x, state.y);

  // Compute radius in canvas units
  const radius = Math.hypot(start.cx - center.cx, start.cy - center.cy);

  // Compute start and end angles in radians
  const startAngle = Math.atan2(start.cy - center.cy, start.cx - center.cx);
  const endAngle = startAngle + (angleDeg * Math.PI / 180);

  state.ctx.beginPath();
  state.ctx.moveTo(start.cx, start.cy);

  // Approximate arc with line segments so it integrates with PU/PD path logic
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const theta = startAngle + t * (endAngle - startAngle);
    const x = center.cx + radius * Math.cos(theta);
    const y = center.cy + radius * Math.sin(theta);

    state.ctx.lineTo(x, y);
    state.svgPaths.push(`L${x},${y}`);
  }

  if (state.penDown) {
    state.ctx.strokeStyle = getPenColor(state.pen);
    state.ctx.stroke();
  }

  // Update current pen position in user coordinates
  const endX = cx + Math.cos(endAngle) * (radius / (state.ctx.canvas.width / 1000));
  const endY = cy + Math.sin(endAngle) * (radius / (state.ctx.canvas.height / 1000));
  state.x = endX;
  state.y = endY;

  console.log("AR command: arc center (relative)", dx, dy, "angle", angleDeg, "segments", segments);
}
//
// FT fillType[,spacing[,angle]];
//
function cmdFT(args) {
  if (!args || args.length < 1) {
    console.warn("FT: missing arguments");
    return;
  }

  const fillType = parseInt(args[0], 10);
  const spacing = args.length > 1 ? parseFloat(args[1]) : 10; // default spacing
  const angle = args.length > 2 ? parseFloat(args[2]) : 0;    // default angle

  if (isNaN(fillType)) {
    console.warn("FT: invalid fillType", args[0]);
    return;
  }

  // Store fill settings in state for later use by RA, CI, polygon fills, etc.
  state.fillType = fillType;
  state.fillSpacing = spacing;
  state.fillAngle = angle;

  // Apply to canvas context (approximation)
  switch (fillType) {
    case 0: // solid fill
      state.ctx.fillStyle = getPenColor(state.pen);
      break;
    case 1: // hatch (simulate with pattern)
      state.ctx.fillStyle = createHatchPattern(spacing, angle, getPenColor(state.pen));
      break;
    case 2: // cross-hatch
      state.ctx.fillStyle = createCrossHatchPattern(spacing, getPenColor(state.pen));
      break;
    case 3: // shading (approximate with semi-transparent fill)
      state.ctx.fillStyle = `${getPenColor(state.pen)}80`; // add alpha
      break;
    default:
      console.warn("FT: unknown fillType", fillType);
      state.ctx.fillStyle = getPenColor(state.pen);
  }

  console.log("FT command:", { fillType, spacing, angle });
}

// Example helper to build hatch pattern
function createHatchPattern(spacing, angle, color) {
  const patternCanvas = document.createElement("canvas");
  patternCanvas.width = spacing;
  patternCanvas.height = spacing;
  const pctx = patternCanvas.getContext("2d");

  pctx.strokeStyle = color;
  pctx.beginPath();
  pctx.moveTo(0, 0);
  pctx.lineTo(spacing, spacing);
  pctx.stroke();

  return state.ctx.createPattern(patternCanvas, "repeat");
}

function createCrossHatchPattern(spacing, color) {
  const patternCanvas = document.createElement("canvas");
  patternCanvas.width = spacing;
  patternCanvas.height = spacing;
  const pctx = patternCanvas.getContext("2d");

  pctx.strokeStyle = color;
  pctx.beginPath();
  pctx.moveTo(0, 0);
  pctx.lineTo(spacing, spacing);
  pctx.moveTo(spacing, 0);
  pctx.lineTo(0, spacing);
  pctx.stroke();

  return state.ctx.createPattern(patternCanvas, "repeat");
}

//
// PT
//
function cmdPT(args) {
  if (!args || args.length < 1) {
    console.warn("PT: missing thickness argument");
    return;
  }

  const thickness = parseFloat(args[0]);
  if (isNaN(thickness) || thickness <= 0) {
    console.warn("PT: invalid thickness argument", args[0]);
    return;
  }

  // Convert HPGL thickness into canvas units using your scaling function
  const lineWidth = toCanvasLength(thickness);

  // Apply thickness
  state.ctx.lineWidth = lineWidth;
  state.penThickness = thickness; // store in state for reference

  console.log("PT command:", {
    thicknessHPGL: thickness,
    thicknessCanvas: lineWidth
  });
}

//
// WG x,y,radius,startAngle,endAngle;
//
function cmdWG(args) {
  if (!args || args.length < 5) {
    console.warn("WG: missing arguments");
    return;
  }

  const cx = parseFloat(args[0]);
  const cy = parseFloat(args[1]);
  const radiusHPGL = parseFloat(args[2]);
  const startDeg = parseFloat(args[3]);
  const endDeg = parseFloat(args[4]);

  if ([cx, cy, radiusHPGL, startDeg, endDeg].some(v => isNaN(v))) {
    console.warn("WG: invalid numeric arguments", args);
    return;
  }

  // Convert center and radius into canvas units
  const center = toCanvas(cx, cy);
  const radius = toCanvasLength(radiusHPGL);

  // Convert angles to radians
  const startRad = (startDeg * Math.PI) / 180;
  const endRad = (endDeg * Math.PI) / 180;

  state.ctx.beginPath();
  state.ctx.moveTo(center.cx, center.cy);
  state.ctx.arc(center.cx, center.cy, radius, startRad, endRad, false);
  state.ctx.closePath();

  if (state.penDown) {
    // Apply fill style based on FT
    switch (state.fillType) {
      case 0: // solid
        state.ctx.fillStyle = getPenColor(state.pen);
        state.ctx.fill();
        break;
      case 1: // hatch
        state.ctx.fillStyle = createHatchPattern(state.fillSpacing, state.fillAngle, getPenColor(state.pen));
        state.ctx.fill();
        break;
      case 2: // cross-hatch
        state.ctx.fillStyle = createCrossHatchPattern(state.fillSpacing, getPenColor(state.pen));
        state.ctx.fill();
        break;
      case 3: // shading
        state.ctx.fillStyle = `${getPenColor(state.pen)}80`; // semi-transparent
        state.ctx.fill();
        break;
      default:
        state.ctx.fillStyle = getPenColor(state.pen);
        state.ctx.fill();
    }

    // Record into SVG path buffer
    state.svgPaths.push(
      `M${center.cx},${center.cy} A${radius},${radius} ${endDeg - startDeg} 0,1 ${center.cx + radius * Math.cos(endRad)},${center.cy + radius * Math.sin(endRad)} Z`
    );
  }

  console.log("WG command: wedge drawn", { cx, cy, radiusHPGL, startDeg, endDeg });
}


//
// RA x1,y1,x2,y2;
//
function cmdRA(args) {
  let x1, y1, x2, y2;

  if (args.length === 2) {
    // One corner = current position, other = args
    x1 = state.x;
    y1 = state.y;
    x2 = parseFloat(args[0]);
    y2 = parseFloat(args[1]);
  } else if (args.length === 4) {
    // Two corners given
    x1 = parseFloat(args[0]);
    y1 = parseFloat(args[1]);
    x2 = parseFloat(args[2]);
    y2 = parseFloat(args[3]);
  } else {
    console.warn("RA: invalid arguments", args);
    return;
  }

  if ([x1, y1, x2, y2].some(v => isNaN(v))) {
    console.warn("RA: invalid numeric values", args);
    return;
  }

  const pt1 = toCanvas(x1, y1);
  const pt2 = toCanvas(x2, y2);

  state.ctx.beginPath();
  state.ctx.rect(
    Math.min(pt1.cx, pt2.cx),
    Math.min(pt1.cy, pt2.cy),
    Math.abs(pt2.cx - pt1.cx),
    Math.abs(pt2.cy - pt1.cy)
  );

  if (state.penDown) {
    state.ctx.fillStyle = getPenColor(state.pen);
    state.ctx.fill();

    // Record into SVG path buffer
    state.svgPaths.push(
      `M${pt1.cx},${pt1.cy} L${pt2.cx},${pt1.cy} L${pt2.cx},${pt2.cy} L${pt1.cx},${pt2.cy} Z`
    );
  }

  console.log("RA command: filled rectangle drawn", { x1, y1, x2, y2 });
}

//
// EA
//
function cmdEA(args) {
  let x1, y1, x2, y2;

  if (args.length === 2) {
    // One corner = current position, other = args
    x1 = state.x;
    y1 = state.y;
    x2 = parseFloat(args[0]);
    y2 = parseFloat(args[1]);
  } else if (args.length === 4) {
    // Two corners given
    x1 = parseFloat(args[0]);
    y1 = parseFloat(args[1]);
    x2 = parseFloat(args[2]);
    y2 = parseFloat(args[3]);
  } else {
    console.warn("EA: invalid arguments", args);
    return;
  }

  if ([x1, y1, x2, y2].some(v => isNaN(v))) {
    console.warn("EA: invalid numeric values", args);
    return;
  }

  const pt1 = toCanvas(x1, y1);
  const pt2 = toCanvas(x2, y2);

  state.ctx.beginPath();
  state.ctx.rect(
    Math.min(pt1.cx, pt2.cx),
    Math.min(pt1.cy, pt2.cy),
    Math.abs(pt2.cx - pt1.cx),
    Math.abs(pt2.cy - pt1.cy)
  );

  if (state.penDown) {
    state.ctx.strokeStyle = getPenColor(state.pen);
    state.ctx.lineWidth = state.ctx.lineWidth || 1;
    state.ctx.stroke();

    // Record into SVG path buffer
    state.svgPaths.push(
      `M${pt1.cx},${pt1.cy} L${pt2.cx},${pt1.cy} L${pt2.cx},${pt2.cy} L${pt1.cx},${pt2.cy} Z`
    );
  }

  console.log("EA command: rectangle drawn", { x1, y1, x2, y2 });
}
//
// RR
//
function cmdRR(args) {
  let dx1, dy1, dx2, dy2;

  if (args.length === 2) {
    // One corner = current position, other = relative offset
    dx1 = 0;
    dy1 = 0;
    dx2 = parseFloat(args[0]);
    dy2 = parseFloat(args[1]);
  } else if (args.length === 4) {
    // Two corners given as relative offsets
    dx1 = parseFloat(args[0]);
    dy1 = parseFloat(args[1]);
    dx2 = parseFloat(args[2]);
    dy2 = parseFloat(args[3]);
  } else {
    console.warn("RR: invalid arguments", args);
    return;
  }

  if ([dx1, dy1, dx2, dy2].some(v => isNaN(v))) {
    console.warn("RR: invalid numeric values", args);
    return;
  }

  // Compute absolute coordinates
  const x1 = state.x + dx1;
  const y1 = state.y + dy1;
  const x2 = state.x + dx2;
  const y2 = state.y + dy2;

  const pt1 = toCanvas(x1, y1);
  const pt2 = toCanvas(x2, y2);

  state.ctx.beginPath();
  state.ctx.rect(
    Math.min(pt1.cx, pt2.cx),
    Math.min(pt1.cy, pt2.cy),
    Math.abs(pt2.cx - pt1.cx),
    Math.abs(pt2.cy - pt1.cy)
  );

  if (state.penDown) {
    state.ctx.fillStyle = getPenColor(state.pen);
    state.ctx.fill();

    // Record into SVG path buffer
    state.svgPaths.push(
      `M${pt1.cx},${pt1.cy} L${pt2.cx},${pt1.cy} L${pt2.cx},${pt2.cy} L${pt1.cx},${pt2.cy} Z`
    );
  }

  console.log("RR command: relative filled rectangle drawn", { x1, y1, x2, y2 });
}



//
// ER
//
function cmdER(args) {
  let dx1, dy1, dx2, dy2;

  if (args.length === 2) {
    // One corner = current position, other = relative offset
    dx1 = 0;
    dy1 = 0;
    dx2 = parseFloat(args[0]);
    dy2 = parseFloat(args[1]);
  } else if (args.length === 4) {
    // Two corners given as relative offsets
    dx1 = parseFloat(args[0]);
    dy1 = parseFloat(args[1]);
    dx2 = parseFloat(args[2]);
    dy2 = parseFloat(args[3]);
  } else {
    console.warn("ER: invalid arguments", args);
    return;
  }

  if ([dx1, dy1, dx2, dy2].some(v => isNaN(v))) {
    console.warn("ER: invalid numeric values", args);
    return;
  }

  // Compute absolute coordinates
  const x1 = state.x + dx1;
  const y1 = state.y + dy1;
  const x2 = state.x + dx2;
  const y2 = state.y + dy2;

  const pt1 = toCanvas(x1, y1);
  const pt2 = toCanvas(x2, y2);

  state.ctx.beginPath();
  state.ctx.rect(
    Math.min(pt1.cx, pt2.cx),
    Math.min(pt1.cy, pt2.cy),
    Math.abs(pt2.cx - pt1.cx),
    Math.abs(pt2.cy - pt1.cy)
  );

  if (state.penDown) {
    state.ctx.strokeStyle = getPenColor(state.pen);
    state.ctx.lineWidth = state.ctx.lineWidth || 1;
    state.ctx.stroke();

    // Record into SVG path buffer
    state.svgPaths.push(
      `M${pt1.cx},${pt1.cy} L${pt2.cx},${pt1.cy} L${pt2.cx},${pt2.cy} L${pt1.cx},${pt2.cy} Z`
    );
  }

  console.log("ER command: relative edge rectangle drawn", { x1, y1, x2, y2 });
}
//
// PM
//
function cmdPM(args) {
  if (!args || args.length < 1) {
    console.warn("PM: missing mode argument");
    return;
  }

  const mode = parseInt(args[0], 10);
  if (isNaN(mode)) {
    console.warn("PM: invalid mode argument", args[0]);
    return;
  }

  switch (mode) {
    case 0: // Begin polygon mode
      state.polygon = [];
      state.inPolygonMode = true;
      console.log("PM0: Polygon mode started");
      break;

    case 2: // End polygon mode
      if (state.inPolygonMode) {
        state.inPolygonMode = false;
        console.log("PM2: Polygon mode ended, vertices:", state.polygon);
      } else {
        console.warn("PM2: Polygon mode not active");
      }
      break;

    case 1: // Add current point
      if (state.inPolygonMode && state.polygon) {
        state.polygon.push({ x: state.x, y: state.y });
        console.log("PM1: Point added", { x: state.x, y: state.y });
      } else {
        console.warn("PM1: Polygon mode not active, point ignored");
      }
      break;

    default:
      console.warn("PM: Unknown mode", mode);
  }
}



//
// EP
//
function cmdEP() {
  // Si un polygone existe, on le clôt
  if (state.polygon && state.polygon.length >= 3) {
    console.log("EP command: polygon closed");
    state.polygon = [];
  } else {
    // Sinon, on ignore silencieusement
    console.log("EP command: nothing to close");
  }
  state.inPolygonMode = false;
}



//
// FP
//
function cmdFP() {
  if (!state.polygon || state.polygon.length < 3) {
    console.warn("FP: no valid polygon to fill");
    return;
  }
  console.log("Polygon vertices:", state.polygon);
  state.ctx.beginPath();
  const first = toCanvas(state.polygon[0].x, state.polygon[0].y);
  state.ctx.moveTo(first.cx, first.cy);
  for (let i = 1; i < state.polygon.length; i++) {
    const pt = toCanvas(state.polygon[i].x, state.polygon[i].y);
    state.ctx.lineTo(pt.cx, pt.cy);
  }
  state.ctx.closePath();
  state.ctx.fillStyle = getPenColor(state.pen);
  state.ctx.fill();
  console.log("FP command: polygon filled");
  state.polygon = [];
}




// --------------------------------------------------
// Character Plot Commands
// --------------------------------------------------
//
// LB
//
function cmdLB(raw) {
  if (!raw) return;

  // Apply DT terminator if defined
  let text = raw;
  if (state.textTerminator) {
    const idx = text.indexOf(state.textTerminator);
    if (idx >= 0) {
      text = text.substring(0, idx);
    }
  }
  if (!text) return;

  // Apply SL (Label Length) if defined
  if (state.labelLength && text.length > state.labelLength) {
    text = text.substring(0, state.labelLength);
  }

  // Convert current pen position to canvas coordinates
  const pt = toCanvas(state.x, state.y);

  // Base font size (HPGL units → px scaling)
  const baseSize = 16;
  const fontSize = baseSize * (state.charHeight || 1.0);

  // Set baseline for consistent vertical alignment
  state.ctx.textBaseline = "top";

  // Choose font based on SS/SA and symbol mode
  let fontFamily = "sans-serif";
  if (state.font) fontFamily = state.font; // SS/SA sets this
  if (state.symbolMode) fontFamily = "monospace"; // overrides

  state.ctx.font = `${fontSize}px ${fontFamily}`;
  state.ctx.fillStyle = getPenColor(state.pen);

  // Measure total text width for alignment
  let totalWidth = 0;
  for (const ch of text) {
    const charWidth = state.ctx.measureText(ch).width * (state.charWidth || 1.0);
    const spacing = (state.charSpacing || 0) * fontSize + (state.extraSpace || 0);
    totalWidth += charWidth + spacing;
  }

  // Adjust starting X based on LO (0=left, 1=center, 2=right)
  let x = pt.cx;
  if (state.labelOrigin === 1) {
    x -= totalWidth / 2;
  } else if (state.labelOrigin === 2) {
    x -= totalWidth;
  }

  // Draw characters
  for (const ch of text) {
    state.ctx.fillText(ch, x, pt.cy);

    const charWidth = state.ctx.measureText(ch).width * (state.charWidth || 1.0);
    const spacing = (state.charSpacing || 0) * fontSize + (state.extraSpace || 0);
    x += charWidth + spacing;
  }

  // Update pen position in HPGL coordinates
  const advanceCanvas = totalWidth;
  const advanceHPGL = advanceCanvas / (state.ctx.canvas.width / 1000);
  state.x += advanceHPGL;

  console.log("LB command:", {
    mode: state.symbolMode ? "symbol" : "text",
    text,
    position: { x: state.x, y: state.y },
    size: { w: state.charWidth, h: state.charHeight },
    spacing: state.charSpacing,
    extraSpace: state.extraSpace,
    origin: state.labelOrigin,
    font: fontFamily,
    terminator: state.textTerminator || "default (ETX)"
  });
}



//
// DT c;    c:Terminator caracter;  DT @; LB Hello World@;
//
function cmdDT(args) {
  if (!args || args.length < 1) {
    console.warn("DT: missing terminator argument");
    return;
  }

  const terminator = args[0];
  if (typeof terminator !== "string" || terminator.length !== 1) {
    console.warn("DT: invalid terminator", args[0]);
    return;
  }

  // Store in state
  state.textTerminator = terminator;

  console.log("DT command: text terminator set to", JSON.stringify(terminator));
}
//
// SI
//
function cmdSI(args) {
  if (!args || args.length < 2) {
    console.warn("SI: missing arguments", args);
    return;
  }

  const w = parseFloat(args[0]); // width scaling factor
  const h = parseFloat(args[1]); // height scaling factor

  if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
    console.warn("SI: invalid numeric values", args);
    return;
  }

  // Store scaling factors in state
  state.charWidth = w;
  state.charHeight = h;

  console.log("SI command: set character size", { widthScale: w, heightScale: h });
}
//
// SR
//
function cmdSR(args) {
  if (!args || args.length < 1) {
    console.warn("SR: missing argument", args);
    return;
  }

  const s = parseFloat(args[0]); // spacing ratio

  if (isNaN(s)) {
    console.warn("SR: invalid spacing value", args[0]);
    return;
  }

  // Store spacing ratio in state
  state.charSpacing = s;

  console.log("SR command: set character spacing ratio", s);
}

// SU: Set Units (scaling factors)
function cmdSU(args) {
  if (!args || args.length < 2) {
    console.warn("SU: missing arguments", args);
    return;
  }
  const sx = parseFloat(args[0]);
  const sy = parseFloat(args[1]);
  if (isNaN(sx) || isNaN(sy) || sx <= 0 || sy <= 0) {
    console.warn("SU: invalid values", args);
    return;
  }
  state.scaleX = sx;
  state.scaleY = sy;
  console.log("SU command: set units scaling", { sx, sy });
}

// SL: Set Label Length
function cmdSL(args) {
  if (!args || args.length < 1) {
    console.warn("SL: missing argument", args);
    return;
  }
  const length = parseInt(args[0], 10);
  if (isNaN(length) || length <= 0) {
    console.warn("SL: invalid label length", args[0]);
    return;
  }
  state.labelLength = length;
  console.log("SL command: set label length", length);
}

// DI: Absolute Direction
function cmdDI(args) {
  if (!args || args.length < 1) {
    console.warn("DI: missing argument", args);
    return;
  }
  const angle = parseFloat(args[0]);
  if (isNaN(angle)) {
    console.warn("DI: invalid angle", args[0]);
    return;
  }
  state.textAngle = angle;
  console.log("DI command: set absolute text angle", angle);
}

// DR: Relative Direction
function cmdDR(args) {
  if (!args || args.length < 1) {
    console.warn("DR: missing argument", args);
    return;
  }
  const delta = parseFloat(args[0]);
  if (isNaN(delta)) {
    console.warn("DR: invalid angle delta", args[0]);
    return;
  }
  state.textAngle = (state.textAngle || 0) + delta;
  console.log("DR command: rotate text angle by", delta, "→ new angle", state.textAngle);
}

// DU: Define User Units
function cmdDU(args) {
  if (!args || args.length < 2) {
    console.warn("DU: missing arguments", args);
    return;
  }
  const ux = parseFloat(args[0]);
  const uy = parseFloat(args[1]);
  if (isNaN(ux) || isNaN(uy) || ux <= 0 || uy <= 0) {
    console.warn("DU: invalid user units", args);
    return;
  }
  state.userUnitX = ux;
  state.userUnitY = uy;
  console.log("DU command: define user units", { ux, uy });
}

// DV: Define Variables (generic scaling variables)
function cmdDV(args) {
  if (!args || args.length < 2) {
    console.warn("DV: missing arguments", args);
    return;
  }
  const varName = args[0];
  const value = parseFloat(args[1]);
  if (typeof varName !== "string" || isNaN(value)) {
    console.warn("DV: invalid arguments", args);
    return;
  }
  if (!state.variables) state.variables = {};
  state.variables[varName] = value;
  console.log("DV command: define variable", varName, "=", value);
}
// LO: Label Origin (alignment)
function cmdLO(args) {
  const origin = parseInt(args[0], 10);
  if (isNaN(origin)) {
    console.warn("LO: invalid origin", args);
    return;
  }
  // 0=left, 1=center, 2=right
  state.labelOrigin = origin;
  console.log("LO command: set label origin", origin);
}

// CP: Character Plot (advance cursor)
function cmdCP(args) {
  const advance = parseFloat(args[0] || 1.0);
  if (isNaN(advance)) {
    console.warn("CP: invalid advance", args);
    return;
  }
  state.x += advance;
  console.log("CP command: advance cursor by", advance, "→ new x", state.x);
}

// ES: Extra Space
function cmdES(args) {
  const extra = parseFloat(args[0]);
  if (isNaN(extra)) {
    console.warn("ES: invalid spacing", args);
    return;
  }
  state.extraSpace = extra;
  console.log("ES command: set extra character spacing", extra);
}

// BL: Buffer Label
function cmdBL(args) {
  const text = args.join(" ");
  state.bufferedLabel = text;
  console.log("BL command: buffered label stored", text);
}

// PB: Polygon Buffer
function cmdPB(args) {
  if (!state.polygonBuffer) state.polygonBuffer = [];
  state.polygonBuffer.push({ x: state.x, y: state.y });
  console.log("PB command: point added to polygon buffer", state.x, state.y);
}

// CS: Character Set
function cmdCS(args) {
  const set = parseInt(args[0], 10);
  if (isNaN(set)) {
    console.warn("CS: invalid character set", args);
    return;
  }
  state.charSet = set;
  console.log("CS command: set character set", set);
}

// CA: Character Assign
function cmdCA(args) {
  const char = args[0];
  const definition = args.slice(1).join(" ");
  if (!char) {
    console.warn("CA: missing character", args);
    return;
  }
  if (!state.charAssignments) state.charAssignments = {};
  state.charAssignments[char] = definition;
  console.log("CA command: assign character", char, "→", definition);
}

// SS: Select Standard Font
function cmdSS() {
  state.font = "sans-serif";
  console.log("SS command: standard font selected");
}

// SA: Select Alternate Font
function cmdSA() {
  state.font = "monospace";
  console.log("SA command: alternate font selected");
}


// --------------------------------------------------
// Change of Plot Area
// --------------------------------------------------
//
// IW xmin,ymin,xmax,ymax;
//
// IW: Input Window
function cmdIW(args) {
  if (!args || args.length < 4) {
    console.warn("IW: missing arguments", args);
    return;
  }

  const xmin = parseFloat(args[0]);
  const ymin = parseFloat(args[1]);
  const xmax = parseFloat(args[2]);
  const ymax = parseFloat(args[3]);

  if ([xmin, ymin, xmax, ymax].some(v => isNaN(v))) {
    console.warn("IW: invalid numeric values", args);
    return;
  }

  state.scaleWindow = { xmin, xmax, ymin, ymax };
  console.log("IW command: input window set", state.scaleWindow);
}

// RO: Rotate
function cmdRO(args) {
  if (!args || args.length < 1) {
    console.warn("RO: missing argument", args);
    return;
  }

  const angle = parseInt(args[0], 10);
  if (isNaN(angle)) {
    console.warn("RO: invalid angle", args[0]);
    return;
  }

  // HPGL typically supports 0, 90, 180, 270 rotations
  const validAngles = [0, 90, 180, 270];
  if (!validAngles.includes(angle)) {
    console.warn("RO: unsupported angle, must be 0/90/180/270", angle);
    return;
  }

  state.rotation = angle;
  console.log("RO command: rotation set to", angle, "degrees");
}

// --------------------------------------------------
// Plotter Control
// --------------------------------------------------
//
// PG: Page Advance (clear canvas)
//
function cmdPG() {
  if (state.ctx) {
    state.ctx.clearRect(0, 0, state.ctx.canvas.width, state.ctx.canvas.height);
  }
  state.svgPaths = [];
  console.log("PG command: page advanced (canvas cleared)");
}

// AF: Advance Form (alias of PG)
function cmdAF() {
  cmdPG();
  console.log("AF command: form advanced (same as PG)");
}

// NR: Not Ready (pause drawing)
function cmdNR() {
  state.notReady = true;
  console.log("NR command: plotter set to not ready");
}

// PS: Page Size
function cmdPS(args) {
  if (!args || args.length < 2) {
    console.warn("PS: missing arguments", args);
    return;
  }

  const width = parseInt(args[0], 10);
  const height = parseInt(args[1], 10);

  if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
    console.warn("PS: invalid page size", args);
    return;
  }

  if (state.ctx) {
    state.ctx.canvas.width = width;
    state.ctx.canvas.height = height;
  }

  state.pageSize = { width, height };
  console.log("PS command: page size set", state.pageSize);
}
// ==================================================
// ==================================================
// ==================================================
//  !!!!! PARSER !!!!!
// ==================================================
// ==================================================
// ==================================================
function parseCommandToken(token) {
  const cmd = token.slice(0, 2).toUpperCase();
  const rest = token.slice(2).trim();

  if (cmd === "LB") {
    return { cmd, raw: rest };
  }

  const args = rest ? rest.split(',') : [];
  return { cmd, args };
}

function executeCommand(parsed) {
    switch (parsed.cmd) {
	  // Setup of plotter
      case 'IN': cmdIN(); break;
	  case "DF": cmdDF(); break;
	  case 'IP': cmdIP(parsed.args); break;
	  case 'SC': cmdSC(parsed.args); break;
      // Basic Plot Commands
      case 'SP': cmdSP(parsed.args[0]); break;
      case 'PU': cmdPU(parsed.args); break;
      case 'PD': cmdPD(parsed.args); break;
      case 'PA': cmdPA(parsed.args); break;
      case 'PR': cmdPR(parsed.args); break;
  	  case "LT": cmdLT(parsed.args); break;    
	  // Plot of Circle, Arc and Polygon
	  case 'CT': cmdCT(parsed.args); break;
	  case 'CI': cmdCI(parsed.args); break;
	  case "AA": cmdAA(parsed.args); break;
	  case "AR": cmdAR(parsed.args); break;
	  case "FT": cmdFT(parsed.args); break;
	  case "PT": cmdPT(parsed.args); break;
	  case "WG": cmdWG(parsed.args); break;
	  case "RA": cmdRA(parsed.args); break;
	  case "EA": cmdEA(parsed.args); break;
	  case "RR": cmdRR(parsed.args); break;
	  case "ER": cmdER(parsed.args); break;
	  case "PM": cmdPM(parsed.args); break;
	  case "EP": cmdEP(); break;
	  case "FP": cmdFP(parsed.args); break;
	  // Character Plot Commands
	  case "LB": cmdLB(parsed.raw); break;
	  case "DT": cmdDT(parsed.args); break;
	  case "SI": cmdSI(parsed.args); break;
	  case "SR": cmdSR(parsed.args); break;
	  case "SU": cmdSU(parsed.args); break;
	  case "SL": cmdSL(parsed.args); break;
	  case "DI": cmdDI(parsed.args); break;
	  case "DR": cmdDR(parsed.args); break;
	  case "DU": cmdDU(parsed.args); break;
	  case "DV": cmdDV(parsed.args); break;
	  case "LO": cmdLO(parsed.args); break;
	  case "CP": cmdCP(parsed.args); break;
	  case "ES": cmdES(parsed.args); break;
	  case "BL": cmdBL(parsed.args); break;
	  case "PB": cmdPB(parsed.args); break;
	  case "CS": cmdCS(parsed.args); break;
	  case "CA": cmdCA(parsed.args); break;
	  case "SS": cmdSS(); break;
	  case "SA": cmdSA(); break;
	  // Change of Plot Area
	  case "IW": cmdIW(parsed.args); break;
	  case "RO": cmdRO(parsed.args); break;
      // Plotter Control
	  case "PG": cmdPG(); break;
	  case "AF": cmdAF(); break;
	  case "NR": cmdNR(); break;
	  case "PS": cmdPS(parsed.args); break;

      default: console.warn('Commande inconnue:', parsed.cmd, parsed.args);
    }
  }

  function runCommands(text) {
    const tokens = text.split(';');
    tokens.forEach(t => {
      const parsed = parseCommandToken(t.trim());
      if (parsed.cmd) executeCommand(parsed);
    });
  }

  // ---------------- Gestion fichiers ----------------
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

//
//
//
//
//


// Efface le canvas
function clearCanvas() {
	const canvas = state.ctx.canvas;
	state.ctx.clearRect(0, 0, canvas.width, canvas.height);
	state.ctx.fillStyle = '#fff';
	state.ctx.fillRect(0, 0, canvas.width, canvas.height);
	state.svgPaths = [];
	console.log("Clear Canvas");
}


// Init canvas
function initCanvas() {
	const canvas = document.getElementById('plotCanvas');
	state.ctx = canvas.getContext('2d');
	clearCanvas();
	console.log("Init Canvas");
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