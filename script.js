const canvas = document.getElementById("hero-canvas");
const context = canvas.getContext("2d");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let width = 0;
let height = 0;
let ratio = 1;
let animationFrame = null;
let blocks = [];

const palette = ["#2457ff", "#138a8a", "#c8503a", "#c98b1a", "#eef3ff"];

function resizeCanvas() {
  ratio = Math.min(window.devicePixelRatio || 1, 2);
  width = canvas.clientWidth;
  height = canvas.clientHeight;
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  createBlocks();
}

function createBlocks() {
  const columns = Math.max(5, Math.ceil(width / 190));
  const rows = Math.max(4, Math.ceil(height / 130));
  const cellWidth = width / columns;
  const cellHeight = height / rows;

  blocks = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const offset = (row % 2) * cellWidth * 0.28;
      blocks.push({
        x: column * cellWidth + offset - 24,
        y: row * cellHeight + 16,
        width: Math.max(92, cellWidth * 0.64),
        height: 42 + ((row + column) % 3) * 18,
        color: palette[(row + column) % palette.length],
        phase: (row * 0.6 + column * 0.34) % Math.PI,
      });
    }
  }
}

function drawBlock(block, time) {
  const drift = prefersReducedMotion.matches ? 0 : Math.sin(time + block.phase) * 8;
  const x = block.x + drift;
  const y = block.y;

  context.fillStyle = "rgba(255, 255, 255, 0.055)";
  context.strokeStyle = "rgba(255, 255, 255, 0.16)";
  context.lineWidth = 1;
  context.beginPath();
  context.roundRect(x, y, block.width, block.height, 7);
  context.fill();
  context.stroke();

  context.fillStyle = block.color;
  context.globalAlpha = 0.76;
  context.fillRect(x + 14, y + 15, Math.max(28, block.width * 0.24), 5);
  context.globalAlpha = 0.42;
  context.fillRect(x + 14, y + 27, Math.max(52, block.width * 0.56), 5);
  context.globalAlpha = 1;
}

function drawConnections(time) {
  context.strokeStyle = "rgba(255, 255, 255, 0.11)";
  context.lineWidth = 1;

  for (let index = 0; index < blocks.length - 1; index += 1) {
    const current = blocks[index];
    const next = blocks[index + 1];
    const pulse = prefersReducedMotion.matches ? 0 : Math.sin(time + current.phase) * 3;

    context.beginPath();
    context.moveTo(current.x + current.width, current.y + current.height / 2);
    context.lineTo(next.x + pulse, next.y + next.height / 2);
    context.stroke();
  }
}

function drawPath(time) {
  const centerY = height * 0.72;
  const amplitude = Math.max(28, height * 0.08);

  context.strokeStyle = "rgba(141, 241, 232, 0.52)";
  context.lineWidth = 2;
  context.beginPath();

  for (let x = -20; x <= width + 20; x += 24) {
    const y = centerY + Math.sin(x * 0.018 + time) * amplitude;
    if (x === -20) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }

  context.stroke();
}

function draw(timestamp) {
  const time = timestamp * 0.0007;
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#101720";
  context.fillRect(0, 0, width, height);

  drawConnections(time);
  blocks.forEach((block) => drawBlock(block, time));
  drawPath(time);

  if (!prefersReducedMotion.matches) {
    animationFrame = requestAnimationFrame(draw);
  }
}

function startCanvas() {
  if (animationFrame !== null) {
    cancelAnimationFrame(animationFrame);
  }

  resizeCanvas();
  animationFrame = requestAnimationFrame(draw);
}

window.addEventListener("resize", startCanvas);
prefersReducedMotion.addEventListener("change", startCanvas);
startCanvas();
