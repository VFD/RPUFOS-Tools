/**
 * ------------------------------------------------------------
 *  Project : Build your own graphic (text)
 *  File    : CharEdit.js
 *  Author  : VincentD
 *  Date    : 2025-11-26
 *  License : CC BY-NC 4.0 International
 * ------------------------------------------------------------
 *  Description:
 *    This script handles the editing and creation
 *    of character grids for the application.
 *    I use it for the ROM 1.4 for the Sanyo PHC-25.
 *
 *  Notes:
 *    - Uses window.onload to initialize the grid.
 *    - Compatible with GitHub Pages.
 * ------------------------------------------------------------
 */


// Global variables to store grid data
let cells = [];
let cols = 8;
let rows = 12;

// Function to create the grid dynamically
function createGrid() {
  // Get user input values
  let inputCols = parseInt(document.getElementById("colsInput").value, 10);
  let inputRows = parseInt(document.getElementById("rowsInput").value, 10);

  // Force cols to be a multiple of 8
  if (inputCols % 8 !== 0) {
    // Round up to the next multiple of 8
    inputCols = Math.ceil(inputCols / 8) * 8;
    alert(`Number of columns must be a multiple of 8.\nAdjusted to ${inputCols}.`);
  }

  cols = inputCols;
  rows = inputRows;

  const grid = document.getElementById("grid");
  grid.innerHTML = ""; // Clear previous grid
  cells = [];

  // Reset output area when creating a new grid
  document.getElementById("output").innerText = "";

  // Apply CSS grid dimensions
  grid.style.gridTemplateColumns = `repeat(${cols}, 30px)`;
  grid.style.gridTemplateRows = `repeat(${rows}, 30px)`;

  // Build grid cells
  for (let y = 0; y < rows; y++) {
    cells[y] = [];
    for (let x = 0; x < cols; x++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      cell.dataset.x = x;
      cell.dataset.y = y;

      // Toggle active state on click
      cell.onclick = () => {
        cell.classList.toggle("active");
      };

      grid.appendChild(cell);
      cells[y][x] = cell;
    }
  }
}


// Function to generate hexadecimal representation of the grid
function generateHex() {
  const hexLines = cells.map(row => {
    const bytes = [];
    for (let block = 0; block < cols; block += 8) {
      let byte = 0;
      for (let i = 0; i < 8; i++) {
        const cell = row[block + i];
        if (cell.classList.contains("active")) {
          // Set bit if cell is active
          byte |= (1 << (7 - i)); // bit order: leftmost = MSB
        }
      }
      bytes.push(byte.toString(16).padStart(2, '0').toUpperCase());
    }
    return bytes.join(" ");
  });

  document.getElementById("output").innerText =
    `Hexadecimal code (${cols}x${rows}):\n` + hexLines.join("\n");
}


// Function to reset the grid (clear all active cells)
function resetGrid() {
  cells.flat().forEach(cell => cell.classList.remove("active"));
  document.getElementById("output").innerText = "";
}

// Function to invert the grid (toggle all cells)
function invertGrid() {
  cells.flat().forEach(cell => {
    cell.classList.toggle("active");
  });
}

// Create default grid on page load
console.log("Page fully loaded, creating grid...");
window.onload = createGrid;
console.log("grid ok");


// -------------------- EOF --------------------