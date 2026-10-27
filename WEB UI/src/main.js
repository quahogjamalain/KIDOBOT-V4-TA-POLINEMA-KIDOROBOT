import "./styles.css";
import { RobotScene } from "./robot-scene.js";
import { DIRECTIONS, RobotController } from "./simulator.js";
import {
  Blockly,
  PALETTE_BLOCKS,
  createKidobotTheme,
  createStarterProgram,
  defineKidobotBlocks,
  javascriptGenerator,
  registerKidobotGenerators,
} from "./blocks.js";

const $ = (id) => document.getElementById(id);

const viewport = $("viewport");
const viewportShell = $("viewportShell");
const blockCatalog = $("blockCatalog");
const categoryTabs = $("categoryTabs");
const blockSearch = $("blockSearch");
const catalogCount = $("catalogCount");
const blockCount = $("blockCount");
const saveState = $("saveState");
const fileDot = $("fileDot");
const runButton = $("runButton");
const runButtonLabel = $("runButtonLabel");
const stopButton = $("stopButton");
const consoleText = $("consoleText");
const consoleDot = $("consoleDot");
const toast = $("toast");
const helpDialog = $("helpDialog");
const positionX = $("positionX");
const positionY = $("positionY");
const cellBadge = $("cellBadge");
const orientationText = $("orientationText");
const facingText = $("facingText");
const distanceValue = $("distanceValue");
const compassNeedle = $("compassNeedle");
const miniCompassNeedle = $("miniCompassNeedle");
const robotSpeech = $("robotSpeech");
const fpsValue = $("fpsValue");

const STORAGE_KEY = "kidobot-studio-workspace-v1";
const COLS = 8;
const ROWS = 8;
const ROBOT_MODEL_ASSET = {
  url: "",
  scale: 1,
  rotation: 0,
  position: { x: 0, y: 0, z: 0 },
};

let activeCategory = "semua";
let searchQuery = "";
let insertionOffset = 0;
let toastTimer = 0;
let speechTimer = 0;
let saveTimer = 0;
let isRunning = false;
let runToken = 0;
let booting = true;

const scene = new RobotScene(viewport, {
  cols: COLS,
  rows: ROWS,
  onFps: (fps) => {
    fpsValue.textContent = String(fps);
  },
});

const controller = new RobotController({
  scene,
  cols: COLS,
  rows: ROWS,
  home: { x: 3, y: 4 },
  onChange: updateTelemetry,
  onSay: showSpeech,
  onEvent: setConsole,
});

controller.syncScene();

if (ROBOT_MODEL_ASSET.url) {
  scene
    .loadRobotModel(ROBOT_MODEL_ASSET.url, ROBOT_MODEL_ASSET)
    .catch(() => showToast("Model robot 3D gagal dimuat. Placeholder tetap digunakan.", "warning"));
}

function setConsole(message, tone = "idle") {
  consoleText.textContent = message;
  consoleDot.className = "console-dot";
  if (tone && tone !== "idle") consoleDot.classList.add(tone);
}

function showToast(message, tone = "info") {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.dataset.tone = tone;
  toast.classList.add("visible");
  toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 3200);
}

function showSpeech(text) {
  clearTimeout(speechTimer);
  const message = String(text ?? "").trim();
  if (!message) {
    robotSpeech.hidden = true;
    robotSpeech.textContent = "";
    return;
  }
  robotSpeech.textContent = message;
  robotSpeech.hidden = false;
  speechTimer = window.setTimeout(() => {
    robotSpeech.hidden = true;
  }, 2800);
}

function updateTelemetry(state) {
  const direction = DIRECTIONS[state.heading] || DIRECTIONS.north;
  const x = state.position.x + 1;
  const y = state.position.y + 1;
  positionX.textContent = String(x).padStart(2, "0");
  positionY.textContent = String(y).padStart(2, "0");
  cellBadge.textContent = `${String(x).padStart(2, "0")} \u00b7 ${String(y).padStart(2, "0")}`;
  orientationText.textContent = `${direction.relative} \u00b7 ${direction.label}`;
  facingText.textContent = direction.relative;
  distanceValue.textContent = String(controller.getDistance("front"));
  compassNeedle.style.transform = `translate(-50%, -100%) rotate(${direction.angle}deg)`;
  miniCompassNeedle.style.transform = `translate(-50%, -100%) rotate(${direction.angle}deg)`;
}

function setRunningUi(running) {
  isRunning = running;
  runButton.disabled = running;
  stopButton.disabled = !running;
  runButtonLabel.textContent = running ? "Berjalan" : "Jalankan";
  document.body.classList.toggle("is-running", running);
}

defineKidobotBlocks();
registerKidobotGenerators();

const workspace = Blockly.inject("blocklyDiv", {
  theme: createKidobotTheme(),
  renderer: "zelos",
  media: "/blockly-media/",
  sounds: false,
  trashcan: true,
  grid: {
    spacing: 24,
    length: 3,
    colour: "#21385f",
    snap: true,
  },
  zoom: {
    controls: true,
    wheel: true,
    startScale: 0.92,
    maxScale: 1.6,
    minScale: 0.45,
    scaleSpeed: 1.12,
  },
  move: {
    scrollbars: true,
    drag: true,
    wheel: true,
  },
});

workspace.addChangeListener((event) => {
  if (booting || event.isUiEvent) return;
  updateBlockCount();
  scheduleSave();
});

const resizeObserver = new ResizeObserver(() => {
  Blockly.svgResize(workspace);
});
resizeObserver.observe($("blocklyDiv"));

function updateBlockCount() {
  const count = workspace.getAllBlocks(false).length;
  blockCount.textContent = String(count);
}

function setSaveStatus(mode, label) {
  saveState.className = `save-state ${mode}`.trim();
  const icon = mode === "error" ? "close" : "check";
  saveState.innerHTML = `<svg><use href="#icon-${icon}"></use></svg> ${label}`;
}

function scheduleSave() {
  fileDot.classList.add("visible");
  setSaveStatus("saving", "Menyimpan...");
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      const data = Blockly.serialization.workspaces.save(workspace);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setSaveStatus("", "Tersimpan");
      fileDot.classList.remove("visible");
    } catch {
      setSaveStatus("error", "Gagal menyimpan");
      showToast("Workspace tidak dapat disimpan ke browser.", "error");
    }
  }, 450);
}

function loadWorkspace() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const data = JSON.parse(raw);
      Blockly.serialization.workspaces.load(data, workspace);
      booting = false;
      updateBlockCount();
      window.setTimeout(() => {
        workspace.scrollCenter();
        Blockly.svgResize(workspace);
      }, 60);
      return;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  createStarterProgram(workspace);
  booting = false;
  updateBlockCount();
  setSaveStatus("", "Tersimpan");
  window.setTimeout(() => Blockly.svgResize(workspace), 60);
}

function renderCatalog() {
  const query = searchQuery.trim().toLowerCase();
  const filtered = PALETTE_BLOCKS.filter((block) => {
    const categoryMatch = activeCategory === "semua" || block.category === activeCategory;
    const searchMatch =
      !query ||
      block.title.toLowerCase().includes(query) ||
      block.subtitle.toLowerCase().includes(query);
    return categoryMatch && searchMatch;
  });

  blockCatalog.replaceChildren();
  catalogCount.textContent = `${filtered.length} blok`;

  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "block-empty";
    empty.textContent = "Blok tidak ditemukan. Coba kata kunci lain.";
    blockCatalog.appendChild(empty);
    return;
  }

  for (const block of filtered) {
    const card = document.createElement("article");
    card.className = "block-card";
    card.draggable = true;
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Tambah blok ${block.title}`);
    card.dataset.type = block.type;
    card.style.setProperty("--block-colour", block.colour);
    card.innerHTML = `
      <span class="block-glyph">${block.glyph}</span>
      <span class="block-copy">
        <strong>${block.title}</strong>
        <small>${block.subtitle}</small>
      </span>
      <span class="block-add"><svg><use href="#icon-plus"></use></svg></span>
    `;
    blockCatalog.appendChild(card);
  }
}

function workspacePointFromClient(clientX, clientY) {
  return Blockly.utils.svgMath.screenToWsCoordinates(workspace, {
    x: clientX,
    y: clientY,
  });
}

function addBlockToWorkspace(type, x, y) {
  const block = workspace.newBlock(type);
  block.initSvg();
  block.render();
  block.moveBy(Math.round(x), Math.round(y));
  block.select();
  if (type !== "kidobot_start") {
    showToast(`${PALETTE_BLOCKS.find((item) => item.type === type)?.title ?? "Blok"} ditambahkan.`, "success");
  }
  return block;
}

function addBlockFromCenter(type) {
  const rect = $("blocklyDiv").getBoundingClientRect();
  const point = workspacePointFromClient(rect.left + rect.width / 2, rect.top + rect.height / 2);
  const offset = (insertionOffset % 5) * 16;
  insertionOffset += 16;
  addBlockToWorkspace(type, point.x - 70 + offset, point.y - 36 + offset);
}

blockCatalog.addEventListener("click", (event) => {
  const card = event.target.closest(".block-card");
  if (!card) return;
  addBlockFromCenter(card.dataset.type);
});

blockCatalog.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest(".block-card");
  if (!card) return;
  event.preventDefault();
  addBlockFromCenter(card.dataset.type);
});

blockCatalog.addEventListener("dragstart", (event) => {
  const card = event.target.closest(".block-card");
  if (!card) return;
  event.dataTransfer.effectAllowed = "copy";
  event.dataTransfer.setData("application/x-kidobot-block", card.dataset.type);
  event.dataTransfer.setData("text/plain", card.dataset.type);
  card.classList.add("dragging");
});

blockCatalog.addEventListener("dragend", (event) => {
  event.target.closest(".block-card")?.classList.remove("dragging");
});

$("blocklyDiv").addEventListener("dragover", (event) => {
  const types = Array.from(event.dataTransfer.types || []);
  if (!types.includes("application/x-kidobot-block")) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
});

$("blocklyDiv").addEventListener("drop", (event) => {
  const type =
    event.dataTransfer.getData("application/x-kidobot-block") ||
    event.dataTransfer.getData("text/plain");
  if (!PALETTE_BLOCKS.some((block) => block.type === type)) return;
  event.preventDefault();
  const point = workspacePointFromClient(event.clientX, event.clientY);
  addBlockToWorkspace(type, point.x - 70, point.y - 26);
});

categoryTabs.addEventListener("click", (event) => {
  const tab = event.target.closest(".category-tab");
  if (!tab) return;
  activeCategory = tab.dataset.category;
  for (const button of categoryTabs.querySelectorAll(".category-tab")) {
    const active = button === tab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  }
  renderCatalog();
});

blockSearch.addEventListener("input", () => {
  searchQuery = blockSearch.value;
  renderCatalog();
});

$("undoButton").addEventListener("click", () => {
  workspace.undo(false);
});

$("redoButton").addEventListener("click", () => {
  workspace.undo(true);
});

$("centerButton").addEventListener("click", () => {
  workspace.scrollCenter();
});

$("clearButton").addEventListener("click", () => {
  if (!workspace.getAllBlocks(false).length) return;
  if (!window.confirm("Kosongkan semua blok di workspace?")) return;
  workspace.clear();
  setConsole("Workspace dikosongkan. Tambahkan blok baru untuk memulai.", "idle");
});

$("resetRobotButton").addEventListener("click", async () => {
  if (isRunning) stopProgram();
  await controller.reset();
  setConsole("Posisi robot direset ke titik awal.", "idle");
});

$("resetCameraButton").addEventListener("click", () => {
  scene.resetCamera();
});

$("fullscreenButton").addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await viewportShell.requestFullscreen();
    }
  } catch {
    showToast("Layar penuh tidak didukung browser ini.", "warning");
  }
});

document.addEventListener("fullscreenchange", () => {
  window.setTimeout(() => scene.resize(), 80);
});

$("helpButton").addEventListener("click", () => {
  helpDialog.showModal();
});

$("closeHelpButton").addEventListener("click", () => {
  helpDialog.close();
});

helpDialog.addEventListener("click", (event) => {
  if (event.target !== helpDialog) return;
  const rect = helpDialog.getBoundingClientRect();
  const inside =
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom;
  if (!inside) helpDialog.close();
});

async function startProgram() {
  if (isRunning) return;

  const startBlocks = workspace.getTopBlocks(true).filter((block) => block.type === "kidobot_start");
  if (!startBlocks.length) {
    setConsole("Tambahkan blok \u201cKetika dijalankan\u201d terlebih dahulu.", "warning");
    showToast("Program membutuhkan blok \u201cKetika dijalankan\u201d.", "warning");
    return;
  }

  javascriptGenerator.init(workspace);
  const code = startBlocks.map((block) => javascriptGenerator.blockToCode(block)).join("\n");
  if (!code.trim()) {
    setConsole("Blok \u201cKetika dijalankan\u201d masih kosong.", "warning");
    showToast("Tambahkan blok aksi di bawah blok pembuka.", "warning");
    return;
  }

  hideSpeech();
  const token = controller.beginRun();
  runToken = token;
  setRunningUi(true);
  setConsole("Menjalankan program...", "running");
  const startedAt = performance.now();
  const api = controller.createApi(token);

  try {
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const execute = new AsyncFunction("api", code);
    await execute(api);
    if (runToken !== token) return;
    const seconds = ((performance.now() - startedAt) / 1000).toFixed(1);
    setConsole(`Program selesai dalam ${seconds} detik.`, "success");
  } catch (error) {
    if (error.name === "RobotStopped") {
      if (runToken === token) setConsole("Program dihentikan.", "warning");
      return;
    }
    const message = error?.message || "Terjadi kesalahan saat menjalankan program.";
    setConsole(message, "error");
    showToast(message, "error");
  } finally {
    if (runToken === token) {
      controller.finishRun();
      setRunningUi(false);
    }
  }
}

function stopProgram() {
  if (!isRunning) return;
  controller.stop();
  runToken = -1;
  setRunningUi(false);
  setConsole("Program dihentikan oleh pengguna.", "warning");
}

function hideSpeech() {
  clearTimeout(speechTimer);
  robotSpeech.hidden = true;
  robotSpeech.textContent = "";
}

runButton.addEventListener("click", startProgram);
stopButton.addEventListener("click", stopProgram);

window.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    startProgram();
  }
  if (event.key === "Escape" && isRunning) {
    stopProgram();
  }
});

const savedScaleObserver = new ResizeObserver(() => {
  if (workspace) Blockly.svgResize(workspace);
});
savedScaleObserver.observe(document.body);

renderCatalog();
loadWorkspace();
