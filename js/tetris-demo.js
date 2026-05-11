const boardCanvas = document.querySelector("#tetris-board");
const startButton = document.querySelector("#tetris-start");
const scoreOutput = document.querySelector("#tetris-score");
const linesOutput = document.querySelector("#tetris-lines");
const statusOutput = document.querySelector("#tetris-status");

if (boardCanvas && startButton && scoreOutput && linesOutput && statusOutput) {
  initTetrisDemo();
}

function initTetrisDemo() {
  const context = boardCanvas.getContext("2d");
  const columns = 10;
  const rows = 20;
  const cell = boardCanvas.width / columns;
  const empty = 0;
  const scoreByLines = [0, 100, 300, 500, 800];
  const fallInterval = 700;
  const softDropInterval = 70;
  const colors = [
    null,
    "#66d9c7",
    "#f5df6c",
    "#b989ff",
    "#f2b84b",
    "#6aa9ff",
    "#7ed957",
    "#ff7a7a",
  ];
  const pieces = [
    { type: 1, blocks: [[0, 1], [1, 1], [2, 1], [3, 1]] },
    { type: 2, blocks: [[1, 0], [2, 0], [1, 1], [2, 1]] },
    { type: 3, blocks: [[1, 0], [0, 1], [1, 1], [2, 1]] },
    { type: 4, blocks: [[2, 0], [0, 1], [1, 1], [2, 1]] },
    { type: 5, blocks: [[0, 0], [0, 1], [1, 1], [2, 1]] },
    { type: 6, blocks: [[1, 0], [2, 0], [0, 1], [1, 1]] },
    { type: 7, blocks: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  ];

  let grid = createGrid();
  let currentPiece = null;
  let score = 0;
  let lines = 0;
  let isRunning = false;
  let lastTime = 0;
  let dropCounter = 0;
  let isSoftDropping = false;
  let animationId = null;

  draw();

  startButton.addEventListener("click", startGame);

  document.addEventListener("keydown", (event) => {
    if (!isRunning || !currentPiece) return;

    if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
    }

    if (event.key === "ArrowLeft") {
      movePiece(-1, 0);
    } else if (event.key === "ArrowRight") {
      movePiece(1, 0);
    } else if (event.key === "ArrowDown") {
      isSoftDropping = true;
      updateGame();
    } else if (event.key === "ArrowUp") {
      rotatePiece();
    }
  });

  document.addEventListener("keyup", (event) => {
    if (event.key === "ArrowDown") {
      isSoftDropping = false;
    }
  });

  function startGame() {
    grid = createGrid();
    score = 0;
    lines = 0;
    isRunning = true;
    isSoftDropping = false;
    dropCounter = 0;
    currentPiece = createPiece();
    startButton.textContent = "Restart";
    statusOutput.textContent = "Playing. This demo mirrors the WinForms controls and adds smoother wall rotation.";
    syncStats();
    draw();
    lastTime = performance.now();
    cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(tick);
  }

  function tick(time = 0) {
    if (!isRunning) return;

    const delta = time - lastTime;
    lastTime = time;
    dropCounter += delta;

    if (dropCounter > (isSoftDropping ? softDropInterval : fallInterval)) {
      updateGame();
    }

    draw();
    animationId = requestAnimationFrame(tick);
  }

  function updateGame() {
    if (!movePiece(0, 1)) {
      lockPiece();
      clearLines();
      currentPiece = createPiece();

      if (collides(currentPiece.x, currentPiece.y, currentPiece.blocks)) {
        endGame();
      }
    }

    dropCounter = 0;
    syncStats();
    draw();
  }

  function createGrid() {
    return Array.from({ length: rows }, () => Array(columns).fill(empty));
  }

  function createPiece() {
    const template = pieces[Math.floor(Math.random() * pieces.length)];
    return {
      type: template.type,
      blocks: template.blocks.map(([x, y]) => [x, y]),
      x: Math.floor(columns / 2) - 2,
      y: 0,
    };
  }

  function movePiece(dx, dy) {
    const nextX = currentPiece.x + dx;
    const nextY = currentPiece.y + dy;

    if (collides(nextX, nextY, currentPiece.blocks)) {
      return false;
    }

    currentPiece.x = nextX;
    currentPiece.y = nextY;
    draw();
    return true;
  }

  function rotatePiece() {
    const rotated = currentPiece.blocks.map(([x, y]) => [y, -x]);
    const wallKickOffsets = [0, -1, 1, -2, 2];

    for (const offset of wallKickOffsets) {
      if (!collides(currentPiece.x + offset, currentPiece.y, rotated)) {
        currentPiece.x += offset;
        currentPiece.blocks = rotated;
        draw();
        return;
      }
    }
  }

  function collides(originX, originY, blocks) {
    return blocks.some(([x, y]) => {
      const boardX = originX + x;
      const boardY = originY + y;
      const outside = boardX < 0 || boardX >= columns || boardY >= rows;
      const occupied = boardY >= 0 && grid[boardY]?.[boardX] !== empty;
      return outside || occupied;
    });
  }

  function lockPiece() {
    currentPiece.blocks.forEach(([x, y]) => {
      const boardX = currentPiece.x + x;
      const boardY = currentPiece.y + y;

      if (boardY >= 0 && grid[boardY]) {
        grid[boardY][boardX] = currentPiece.type;
      }
    });
  }

  function clearLines() {
    let cleared = 0;

    for (let y = rows - 1; y >= 0; y--) {
      if (grid[y].every((cellValue) => cellValue !== empty)) {
        grid.splice(y, 1);
        grid.unshift(Array(columns).fill(empty));
        cleared += 1;
        y += 1;
      }
    }

    if (!cleared) return;

    lines += cleared;
    score += scoreByLines[cleared] ?? 0;
  }

  function endGame() {
    isRunning = false;
    statusOutput.textContent = "Game over. Press Restart to try again.";
    cancelAnimationFrame(animationId);
  }

  function syncStats() {
    scoreOutput.textContent = String(score);
    linesOutput.textContent = String(lines);
  }

  function draw() {
    context.fillStyle = "#0b1117";
    context.fillRect(0, 0, boardCanvas.width, boardCanvas.height);
    drawGrid();

    grid.forEach((row, y) => {
      row.forEach((cellValue, x) => {
        if (cellValue !== empty) {
          drawBlock(x, y, colors[cellValue]);
        }
      });
    });

    if (!currentPiece) return;

    currentPiece.blocks.forEach(([x, y]) => {
      drawBlock(currentPiece.x + x, currentPiece.y + y, colors[currentPiece.type]);
    });
  }

  function drawGrid() {
    context.strokeStyle = "rgba(243, 239, 230, 0.07)";
    context.lineWidth = 1;

    for (let x = 0; x <= columns; x++) {
      context.beginPath();
      context.moveTo(x * cell, 0);
      context.lineTo(x * cell, boardCanvas.height);
      context.stroke();
    }

    for (let y = 0; y <= rows; y++) {
      context.beginPath();
      context.moveTo(0, y * cell);
      context.lineTo(boardCanvas.width, y * cell);
      context.stroke();
    }
  }

  function drawBlock(x, y, color) {
    context.fillStyle = color;
    context.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
    context.fillStyle = "rgba(255, 255, 255, 0.20)";
    context.fillRect(x * cell + 3, y * cell + 3, cell - 6, 3);
  }
}
