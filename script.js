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
const quizQaFileInput = document.getElementById("quiz-qa-file");

let quizItems = [];

function normalizeQuizText(text) {
  return text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

function splitQuizLines(text) {
  return normalizeQuizText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseNumberPrefix(line) {
  const bracketMatch = line.match(/^\s*\[(?:[QqAa]\s*)?(\d+)\]\s*(.*)$/);

  if (bracketMatch) {
    return {
      number: bracketMatch[1],
      text: bracketMatch[2].trim(),
    };
  }

  const prefixMatch = line.match(/^\s*(?:[QqAa]\s*)?(\d+)\s*[\).\]:：-]\s*(.*)$/);

  if (!prefixMatch) {
    return null;
  }

  return {
    number: prefixMatch[1],
    text: prefixMatch[2].trim(),
  };
}

function parseQuestions(text) {
  return splitQuizLines(text).map((line, index) => {
    const numberedQuestion = parseNumberPrefix(line);

    if (numberedQuestion) {
      return {
        number: numberedQuestion.number,
        question: numberedQuestion.text,
        hasExplicitNumber: true,
      };
    }

    return {
      number: String(index + 1),
      question: line,
      hasExplicitNumber: false,
    };
  });
}

function trimBlankEdges(lines) {
  const trimmed = [...lines];

  while (trimmed.length > 0 && trimmed[0].trim() === "") {
    trimmed.shift();
  }

  while (trimmed.length > 0 && trimmed[trimmed.length - 1].trim() === "") {
    trimmed.pop();
  }

  return trimmed;
}

function splitAnswerBlocks(text) {
  const blocks = [];
  let currentBlock = [];

  normalizeQuizText(text)
    .split("\n")
    .forEach((line) => {
      if (/^\s*---+\s*$/.test(line)) {
        const trimmedBlock = trimBlankEdges(currentBlock);

        if (trimmedBlock.length > 0) {
          blocks.push(trimmedBlock);
        }

        currentBlock = [];
        return;
      }

      currentBlock.push(line);
    });

  const trimmedBlock = trimBlankEdges(currentBlock);

  if (trimmedBlock.length > 0) {
    blocks.push(trimmedBlock);
  }

  return blocks;
}

function parseAnswers(text) {
  const normalizedText = normalizeQuizText(text);
  const lines = splitQuizLines(normalizedText);
  const hasSeparators = normalizedText
    .split("\n")
    .some((line) => /^\s*---+\s*$/.test(line));
  const numberedLines = lines.map((line) => parseNumberPrefix(line));
  const canUseLineAnswers =
    !hasSeparators &&
    (numberedLines.every(Boolean) || numberedLines.every((numberedLine) => !numberedLine));

  if (canUseLineAnswers) {
    return lines.map((line, index) => {
      const numberedAnswer = parseNumberPrefix(line);

      return {
        number: numberedAnswer ? numberedAnswer.number : String(index + 1),
        answer: numberedAnswer ? numberedAnswer.text : line,
        hasExplicitNumber: Boolean(numberedAnswer),
      };
    });
  }

  return splitAnswerBlocks(normalizedText).map((block, index) => {
    const [firstLine = "", ...restLines] = block;
    const numberedAnswer = parseNumberPrefix(firstLine);
    const answerLines = numberedAnswer
      ? [numberedAnswer.text, ...restLines]
      : block;

    return {
      number: numberedAnswer ? numberedAnswer.number : String(index + 1),
      answer: answerLines.join("\n").trim(),
      hasExplicitNumber: Boolean(numberedAnswer),
    };
  });
}

function formatNumbers(numbers) {
  return [...new Set(numbers)].join(", ");
}

function parseQaText(text) {
  return splitAnswerBlocks(text).map((block, index) => {
    let number = String(index + 1);
    let question = "";
    const answerLines = [];
    let activeField = "";

    block.forEach((line) => {
      const fieldMatch = line.match(/^\s*([QqAa])\s*[:：]\s*(.*)$/);

      if (fieldMatch) {
        activeField = fieldMatch[1].toUpperCase();

        if (activeField === "Q") {
          const numberedQuestion = parseNumberPrefix(fieldMatch[2]);
          number = numberedQuestion ? numberedQuestion.number : number;
          question = numberedQuestion ? numberedQuestion.text : fieldMatch[2].trim();
          return;
        }

        if (activeField === "A") {
          const numberedAnswer = parseNumberPrefix(fieldMatch[2]);

          if (numberedAnswer) {
            number = numberedAnswer.number;
            answerLines.push(numberedAnswer.text);
          } else {
            answerLines.push(fieldMatch[2]);
          }

          return;
        }
      }

      if (activeField === "Q") {
        question = question ? `${question}\n${line}` : line.trim();
        return;
      }

      if (activeField === "A") {
        answerLines.push(line);
      }
    });

    return {
      number,
      question: question.trim(),
      answer: trimBlankEdges(answerLines).join("\n").trim(),
      answerNumber: number,
    };
  });
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

  if (isOpen) {
    answer.querySelectorAll('img[loading="lazy"]').forEach((image) => {
      image.loading = "eager";
    });
  }
}

function getQuizImageMatch(line) {
  return line.match(/^\s*!\[([^\]]*)\]\(([^)\s]+)\)\s*$/);
}

function isSafeQuizImageSource(source) {
  const trimmedSource = source.trim();
  const protocolMatch = trimmedSource.match(/^([a-z][a-z\d+.-]*):/i);

  if (!trimmedSource || /[\u0000-\u001f\u007f]/.test(trimmedSource)) {
    return false;
  }

  if (trimmedSource.startsWith("//")) {
    return false;
  }

  return !protocolMatch || ["http", "https"].includes(protocolMatch[1].toLowerCase());
}

function appendQuizTextLine(container, line, options = {}) {
  const imageMatch = getQuizImageMatch(line);

  if (imageMatch) {
    const [, altText, rawSource] = imageMatch;
    const source = rawSource.trim();

    if (isSafeQuizImageSource(source)) {
      const image = document.createElement("img");

      image.className = options.imageClassName || "quiz-content-image";
      image.src = source;
      image.alt = altText.trim();
      image.loading = "lazy";
      image.decoding = "async";

      container.append(image);
      return;
    }
  }

  container.append(document.createTextNode(line));
}

function renderQuizText(container, text, options = {}) {
  const lines = String(text || "").split("\n");

  container.replaceChildren();

  lines.forEach((line, index) => {
    if (index > 0) {
      container.append(document.createElement("br"));
    }

    appendQuizTextLine(container, line, options);
  });
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
  number.textContent = String(item.number || index + 1).padStart(2, "0");

  question.className = "quiz-question-text";
  renderQuizText(question, item.question, { imageClassName: "quiz-question-image" });

  answer.className = "quiz-answer";
  answer.id = answerId;
  answer.setAttribute("aria-hidden", "true");

  answerInner.className = "quiz-answer-inner";

  answerLabel.className = "quiz-answer-label";
  answerLabel.textContent = item.answerNumber ? `정답 ${item.answerNumber}` : "정답";

  answerText.className = "quiz-answer-text";
  renderQuizText(answerText, item.answer);

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
  const questions = parseQuestions(questionText);
  const answers = parseAnswers(answerText);
  const usesNumberMatching =
    questions.some((question) => question.hasExplicitNumber) ||
    answers.some((answer) => answer.hasExplicitNumber);
  const missingAnswerNumbers = [];
  const extraAnswerNumbers = [];
  const duplicateAnswerNumbers = [];

  if (usesNumberMatching) {
    const answersByNumber = new Map();
    const questionNumbers = new Set(questions.map((question) => question.number));

    answers.forEach((answer) => {
      if (answersByNumber.has(answer.number)) {
        duplicateAnswerNumbers.push(answer.number);
        return;
      }

      answersByNumber.set(answer.number, answer);
    });

    answers.forEach((answer) => {
      if (!questionNumbers.has(answer.number)) {
        extraAnswerNumbers.push(answer.number);
      }
    });

    quizItems = questions.map((question) => {
      const answer = answersByNumber.get(question.number);

      if (!answer) {
        missingAnswerNumbers.push(question.number);
      }

      return {
        number: question.number,
        question: question.question,
        answer: answer ? answer.answer : "연결된 정답이 없습니다.",
        answerNumber: answer ? answer.number : "",
      };
    });
  } else {
    const itemCount = Math.min(questions.length, answers.length);

    quizItems = questions.slice(0, itemCount).map((question, index) => ({
      number: question.number,
      question: question.question,
      answer: answers[index].answer,
      answerNumber: answers[index].number,
    }));
  }

  renderQuiz(quizItems);

  if (quizItems.length === 0) {
    setQuizStatus("표시할 문제가 없습니다.");
    setQuizControlsEnabled(false);
    return;
  }

  setQuizControlsEnabled(true);

  if (usesNumberMatching) {
    const notes = [];

    if (missingAnswerNumbers.length > 0) {
      notes.push(`답 없음: ${formatNumbers(missingAnswerNumbers)}`);
    }

    if (extraAnswerNumbers.length > 0) {
      notes.push(`문제 없음: ${formatNumbers(extraAnswerNumbers)}`);
    }

    if (duplicateAnswerNumbers.length > 0) {
      notes.push(`중복 답 번호: ${formatNumbers(duplicateAnswerNumbers)}`);
    }

    setQuizStatus(
      notes.length > 0
        ? `${quizItems.length}개 문제를 불러왔습니다. ${notes.join(" / ")}.`
        : `${quizItems.length}개 문제를 불러왔습니다.`,
    );
    return;
  }

  if (questions.length !== answers.length) {
    setQuizStatus(
      `${quizItems.length}개 문제를 불러왔습니다. 질문과 정답 수가 달라 같은 번호만 표시합니다.`,
    );
    return;
  }

  setQuizStatus(`${quizItems.length}개 문제를 불러왔습니다.`);
}

function loadQuizFromQaText(qaText) {
  quizItems = parseQaText(qaText).filter((item) => item.question || item.answer);

  renderQuiz(quizItems);

  if (quizItems.length === 0) {
    setQuizStatus("표시할 문제가 없습니다.");
    setQuizControlsEnabled(false);
    return;
  }

  setQuizControlsEnabled(true);
  setQuizStatus(`${quizItems.length}개 문제를 불러왔습니다.`);
}

async function loadQuizFromSelectedFiles() {
  const qaFile = quizQaFileInput?.files?.[0];

  if (!qaFile) {
    setQuizControlsEnabled(false);
    setQuizStatus("Q&A.txt를 선택해 주세요.");
    return;
  }

  try {
    const qaText = await readSelectedFile(qaFile);

    loadQuizFromQaText(qaText);
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
    const qaText = await readQuizFile("Q&A.txt");
    loadQuizFromQaText(qaText);
  } catch (error) {
    try {
      const [questionText, answerText] = await Promise.all([
        readQuizFile("Question.txt"),
        readQuizFile("Answer.txt"),
      ]);
      loadQuizFromText(questionText, answerText);
    } catch (fallbackError) {
      setQuizControlsEnabled(false);
      setQuizFileLoaderVisible(true);
      setQuizStatus("자동으로 문제를 불러오지 못했습니다. Q&A.txt를 직접 선택해 주세요.");
      console.error(fallbackError);
    }
  }
}

quizControls.forEach((control) => {
  control.addEventListener("click", () => {
    handleQuizAction(control.dataset.quizAction);
  });
});

if (quizQaFileInput) {
  quizQaFileInput.addEventListener("change", loadQuizFromSelectedFiles);
}

loadQuiz();
