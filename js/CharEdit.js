// Global variables to store grid data
let cells = [];
let cols = 8;
let rows = 12;

// Function to create the grid dynamically
function createGrid() {
  // Get user input values
  cols = parseInt(document.getElementById("colsInput").value, 10);
  rows = parseInt(document.getElementById("rowsInput").value, 10);

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
    let byte = 0;
    row.forEach((cell, i) => {
      if (cell.classList.contains("active")) {
        // Set bit if cell is active
        byte |= (1 << (cols - 1 - i));
      }
    });
    // Convert to hex string
    return byte.toString(16).padStart(2, '0').toUpperCase();
  });

  document.getElementById("output").innerText =
    `Hexadecimal code (${cols}x${rows}):\n` + hexLines.join(" ");
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
