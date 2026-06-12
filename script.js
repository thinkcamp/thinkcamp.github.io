const canvas = document.getElementById("hero-canvas");
const context = canvas.getContext("2d");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let width = 0;
let height = 0;
let ratio = 1;
let animationFrame = null;
let blocks = [];

const palette = ["#2457ff", "#138a8a", "#c8503a", "#c98b1a", "#eef3ff"];

function addReducedMotionListener(listener) {
  if (typeof prefersReducedMotion.addEventListener === "function") {
    prefersReducedMotion.addEventListener("change", listener);
    return;
  }

  if (typeof prefersReducedMotion.addListener === "function") {
    prefersReducedMotion.addListener(listener);
  }
}

function roundedRectPath(x, y, blockWidth, blockHeight, radius) {
  if (typeof context.roundRect === "function") {
    context.roundRect(x, y, blockWidth, blockHeight, radius);
    return;
  }

  const safeRadius = Math.min(radius, blockWidth / 2, blockHeight / 2);

  context.moveTo(x + safeRadius, y);
  context.lineTo(x + blockWidth - safeRadius, y);
  context.arcTo(x + blockWidth, y, x + blockWidth, y + safeRadius, safeRadius);
  context.lineTo(x + blockWidth, y + blockHeight - safeRadius);
  context.arcTo(
    x + blockWidth,
    y + blockHeight,
    x + blockWidth - safeRadius,
    y + blockHeight,
    safeRadius,
  );
  context.lineTo(x + safeRadius, y + blockHeight);
  context.arcTo(x, y + blockHeight, x, y + blockHeight - safeRadius, safeRadius);
  context.lineTo(x, y + safeRadius);
  context.arcTo(x, y, x + safeRadius, y, safeRadius);
  context.closePath();
}

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

function getBlockDrift(block, time) {
  return prefersReducedMotion.matches ? 0 : Math.sin(time + block.phase) * 8;
}

function drawBlock(block, time) {
  const drift = getBlockDrift(block, time);
  const x = block.x + drift;
  const y = block.y;

  context.fillStyle = "rgba(255, 255, 255, 0.055)";
  context.strokeStyle = "rgba(255, 255, 255, 0.16)";
  context.lineWidth = 1;
  context.beginPath();
  roundedRectPath(x, y, block.width, block.height, 7);
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
    const currentDrift = getBlockDrift(current, time);
    const nextDrift = getBlockDrift(next, time);

    context.beginPath();
    context.moveTo(current.x + currentDrift + current.width, current.y + current.height / 2);
    context.lineTo(next.x + nextDrift, next.y + next.height / 2);
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
addReducedMotionListener(startCanvas);
startCanvas();

const quizList = document.getElementById("quiz-list");
const quizStatus = document.getElementById("quiz-status");
const quizControls = document.querySelectorAll("[data-quiz-action]");
const quizFileLoader = document.getElementById("quiz-file-loader");
const quizQuestionFileInput = document.getElementById("quiz-question-file");
const quizAnswerFileInput = document.getElementById("quiz-answer-file");

let quizItems = [];

function splitQuizFile(text) {
  return text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

async function readQuizFile(path) {
  const response = await fetch(path, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`${path} could not be loaded (${response.status})`);
  }

  return new TextDecoder("utf-8").decode(await response.arrayBuffer());
}

async function readSelectedFile(file) {
  return new TextDecoder("utf-8").decode(await file.arrayBuffer());
}

function setQuizStatus(message) {
  if (quizStatus) {
    quizStatus.textContent = message;
  }
}

function setQuizFileLoaderVisible(isVisible) {
  if (quizFileLoader) {
    quizFileLoader.hidden = !isVisible;
  }
}

function setQuizControlsEnabled(isEnabled) {
  quizControls.forEach((control) => {
    control.disabled = !isEnabled;
  });
}

function setCardOpen(card, isOpen) {
  const questionButton = card.querySelector(".quiz-question");
  const answer = card.querySelector(".quiz-answer");

  if (!questionButton || !answer) {
    return;
  }

  questionButton.setAttribute("aria-expanded", String(isOpen));
  answer.setAttribute("aria-hidden", String(!isOpen));
  card.classList.toggle("is-open", isOpen);
}

function createQuizCard(item, index) {
  const card = document.createElement("article");
  const questionButton = document.createElement("button");
  const number = document.createElement("span");
  const question = document.createElement("span");
  const answer = document.createElement("div");
  const answerInner = document.createElement("div");
  const answerLabel = document.createElement("p");
  const answerText = document.createElement("p");
  const answerId = `quiz-answer-${index + 1}`;

  card.className = "quiz-card";

  questionButton.className = "quiz-question";
  questionButton.type = "button";
  questionButton.setAttribute("aria-expanded", "false");
  questionButton.setAttribute("aria-controls", answerId);

  number.className = "quiz-number";
  number.textContent = String(index + 1).padStart(2, "0");

  question.textContent = item.question;

  answer.className = "quiz-answer";
  answer.id = answerId;
  answer.setAttribute("aria-hidden", "true");

  answerInner.className = "quiz-answer-inner";

  answerLabel.className = "quiz-answer-label";
  answerLabel.textContent = "정답";

  answerText.textContent = item.answer;

  questionButton.append(number, question);
  answerInner.append(answerLabel, answerText);
  answer.append(answerInner);
  card.append(questionButton, answer);

  questionButton.addEventListener("click", () => {
    setCardOpen(card, questionButton.getAttribute("aria-expanded") !== "true");
  });

  return card;
}

function renderQuiz(items) {
  if (!quizList) {
    return;
  }

  quizList.replaceChildren();

  items.forEach((item, index) => {
    quizList.append(createQuizCard(item, index));
  });
}

function shuffleItems(items) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function handleQuizAction(action) {
  const cards = document.querySelectorAll(".quiz-card");

  if (action === "show-all") {
    cards.forEach((card) => setCardOpen(card, true));
    return;
  }

  if (action === "hide-all") {
    cards.forEach((card) => setCardOpen(card, false));
    return;
  }

  if (action === "shuffle") {
    quizItems = shuffleItems(quizItems);
    renderQuiz(quizItems);
  }
}

function loadQuizFromText(questionText, answerText) {
  const questions = splitQuizFile(questionText);
  const answers = splitQuizFile(answerText);
  const itemCount = Math.min(questions.length, answers.length);

  quizItems = questions.slice(0, itemCount).map((question, index) => ({
    question,
    answer: answers[index],
  }));

  renderQuiz(quizItems);

  if (quizItems.length === 0) {
    setQuizStatus("표시할 문제가 없습니다.");
    setQuizControlsEnabled(false);
    return;
  }

  setQuizControlsEnabled(true);

  if (questions.length !== answers.length) {
    setQuizStatus(
      `${quizItems.length}개 문제를 불러왔습니다. 질문과 정답의 줄 수가 달라 같은 번호만 표시합니다.`,
    );
    return;
  }

  setQuizStatus(`${quizItems.length}개 문제를 불러왔습니다.`);
}

async function loadQuizFromSelectedFiles() {
  const questionFile = quizQuestionFileInput?.files?.[0];
  const answerFile = quizAnswerFileInput?.files?.[0];

  if (!questionFile || !answerFile) {
    setQuizControlsEnabled(false);
    setQuizStatus("Question.txt와 Answer.txt를 모두 선택해 주세요.");
    return;
  }

  try {
    const [questionText, answerText] = await Promise.all([
      readSelectedFile(questionFile),
      readSelectedFile(answerFile),
    ]);

    loadQuizFromText(questionText, answerText);
  } catch (error) {
    setQuizControlsEnabled(false);
    setQuizStatus("선택한 파일을 읽지 못했습니다. txt 파일인지 확인해 주세요.");
    console.error(error);
  }
}

async function loadQuiz() {
  if (!quizList || !quizStatus) {
    return;
  }

  try {
    setQuizFileLoaderVisible(false);
    const [questionText, answerText] = await Promise.all([
      readQuizFile("Question.txt"),
      readQuizFile("Answer.txt"),
    ]);
    loadQuizFromText(questionText, answerText);
  } catch (error) {
    setQuizControlsEnabled(false);
    setQuizFileLoaderVisible(true);
    setQuizStatus("자동으로 문제를 불러오지 못했습니다. Question.txt와 Answer.txt를 직접 선택해 주세요.");
    console.error(error);
  }
}

quizControls.forEach((control) => {
  control.addEventListener("click", () => {
    handleQuizAction(control.dataset.quizAction);
  });
});

if (quizQuestionFileInput && quizAnswerFileInput) {
  quizQuestionFileInput.addEventListener("change", loadQuizFromSelectedFiles);
  quizAnswerFileInput.addEventListener("change", loadQuizFromSelectedFiles);
}

loadQuiz();
