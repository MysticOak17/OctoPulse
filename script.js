// ========================================
// Constants
// ========================================
const CELL_SIZE = 10;
const CELL_RADIUS = 2;
const GITHUB_COLORS = ["#9be9a8", "#40c463", "#30a14e", "#216e39"];
const DEFAULT_SPEED = 2; // generations per second
const RANDOM_DENSITY = 0.3; // 30% of cells will be alive

// ========================================
// DOM Elements
// ========================================
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const playPauseBtn = document.getElementById("playPause");
const stepBtn = document.getElementById("step");
const clearBtn = document.getElementById("clear");
const randomBtn = document.getElementById("random");
const speedSlider = document.getElementById("speed");
const speedValue = document.getElementById("speedValue");

// ========================================
// State
// ========================================
let cols = 0;
let rows = 0;
let grid = [];
let isPlaying = false;
let speed = DEFAULT_SPEED;
let lastUpdate = 0;

// ========================================
// Grid Management
// ========================================

/**
 * Creates an empty grid filled with zeros (dead cells)
 * @returns {number[][]} 2D array representing the grid
 */
function createEmptyGrid() {
  return Array(rows)
    .fill(null)
    .map(() => Array(cols).fill(0));
}

/**
 * Counts the number of alive neighbors for a given cell
 * Uses wrapping edges for a toroidal topology
 * @param {number} row - Row index of the cell
 * @param {number} col - Column index of the cell
 * @returns {number} Count of alive neighbors (0-8)
 */
function countNeighbors(row, col) {
  let count = 0;

  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      // Skip the cell itself
      if (i === 0 && j === 0) continue;

      // Wrap around edges (toroidal topology)
      const neighborRow = (row + i + rows) % rows;
      const neighborCol = (col + j + cols) % cols;

      if (grid[neighborRow][neighborCol] > 0) {
        count++;
      }
    }
  }

  return count;
}

/**
 * Computes the next generation based on Conway's Game of Life rules
 * - A live cell with 2-3 neighbors survives
 * - A dead cell with exactly 3 neighbors becomes alive
 * - All other cells die or stay dead
 * The cell's value represents its neighbor count for color coding
 */
function computeNextGeneration() {
  const newGrid = createEmptyGrid();

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const neighbors = countNeighbors(i, j);
      const isAlive = grid[i][j] > 0;

      // Conway's Game of Life rules
      if (isAlive && (neighbors === 2 || neighbors === 3)) {
        newGrid[i][j] = neighbors;
      } else if (!isAlive && neighbors === 3) {
        newGrid[i][j] = neighbors;
      }
    }
  }

  grid = newGrid;
}

/**
 * Populates the grid with random alive cells
 */
function randomizeGrid() {
  grid = createEmptyGrid();

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      // Set cell to alive (value 3) based on random density
      grid[i][j] = Math.random() > 1 - RANDOM_DENSITY ? 3 : 0;
    }
  }
}

/**
 * Toggles a cell between alive and dead states
 * @param {number} row - Row index
 * @param {number} col - Column index
 */
function toggleCell(row, col) {
  if (row >= 0 && row < rows && col >= 0 && col < cols) {
    grid[row][col] = grid[row][col] > 0 ? 0 : 3;
  }
}

// ========================================
// Canvas & Rendering
// ========================================

/**
 * Resizes the canvas to fill the available space
 * Preserves existing grid data when resizing
 */
function resizeCanvas() {
  const controlsHeight = document.getElementById("controls").offsetHeight;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - controlsHeight;

  const newCols = Math.floor(canvas.width / CELL_SIZE);
  const newRows = Math.floor(canvas.height / CELL_SIZE);

  // Preserve existing grid data
  const oldGrid = grid;
  cols = newCols;
  rows = newRows;
  grid = createEmptyGrid();

  // Copy old grid data to new grid (as much as fits)
  if (oldGrid.length > 0) {
    for (let i = 0; i < Math.min(rows, oldGrid.length); i++) {
      for (let j = 0; j < Math.min(cols, oldGrid[0].length); j++) {
        grid[i][j] = oldGrid[i][j];
      }
    }
  }

  draw();
}

/**
 * Draws a rounded rectangle on the canvas
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} width - Width of rectangle
 * @param {number} height - Height of rectangle
 * @param {number} radius - Corner radius
 */
function drawRoundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
  ctx.fill();
}

/**
 * Gets the GitHub-style color based on neighbor count
 * @param {number} neighborCount - Number of neighbors (1-4+)
 * @returns {string} Hex color code
 */
function getColorForNeighborCount(neighborCount) {
  const colorIndex = Math.min(neighborCount - 1, GITHUB_COLORS.length - 1);
  return GITHUB_COLORS[colorIndex];
}

/**
 * Renders the entire grid to the canvas
 */
function draw() {
  ctx.fillStyle = "#0d1117"; // use your desired background color
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw all alive cells
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const cellValue = grid[i][j];

      if (cellValue > 0) {
        ctx.fillStyle = getColorForNeighborCount(cellValue);
        drawRoundedRect(
          j * CELL_SIZE,
          i * CELL_SIZE,
          CELL_SIZE,
          CELL_SIZE,
          CELL_RADIUS
        );
      }
    }
  }
}

// ========================================
// Animation Loop
// ========================================

/**
 * Main animation loop using requestAnimationFrame
 * Updates the simulation at the specified speed when playing
 * @param {number} timestamp - Current timestamp from requestAnimationFrame
 */
function animate(timestamp) {
  if (isPlaying) {
    const interval = 1000 / speed;

    if (timestamp - lastUpdate >= interval) {
      computeNextGeneration();
      draw();
      lastUpdate = timestamp;
    }
  }

  requestAnimationFrame(animate);
}

// ========================================
// Event Handlers
// ========================================

/**
 * Toggles between play and pause states
 */
function handlePlayPause() {
  isPlaying = !isPlaying;
  playPauseBtn.textContent = isPlaying ? "Pause" : "Play";
}

/**
 * Advances the simulation by one generation
 */
function handleStep() {
  computeNextGeneration();
  draw();
}

/**
 * Clears the entire grid
 */
function handleClear() {
  grid = createEmptyGrid();
  draw();
}

/**
 * Generates a random pattern on the grid
 */
function handleRandom() {
  randomizeGrid();
  draw();
}

/**
 * Updates the simulation speed
 * @param {Event} event - Input event from speed slider
 */
function handleSpeedChange(event) {
  speed = parseInt(event.target.value);
  speedValue.textContent = speed;
}

/**
 * Handles canvas clicks to toggle cells
 * @param {MouseEvent} event - Mouse click event
 */
function handleCanvasClick(event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const col = Math.floor(x / CELL_SIZE);
  const row = Math.floor(y / CELL_SIZE);

  toggleCell(row, col);
  draw();
}

// ========================================
// Event Listeners
// ========================================
playPauseBtn.addEventListener("click", handlePlayPause);
stepBtn.addEventListener("click", handleStep);
clearBtn.addEventListener("click", handleClear);
randomBtn.addEventListener("click", handleRandom);
speedSlider.addEventListener("input", handleSpeedChange);
canvas.addEventListener("click", handleCanvasClick);
window.addEventListener("resize", resizeCanvas);

// ========================================
// Initialization
// ========================================
resizeCanvas();
requestAnimationFrame(animate);

