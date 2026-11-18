/**
 * Stitchwright app shell.
 *
 * This file wires the editor together: load a local chart, create the store,
 * connect the canvas, panels, dialogs and keyboard shortcuts, and keep the
 * local autosave running. Business rules live in src/core; this file is the
 * browser-specific glue.
 */

import {
  addGroup,
  copySelection,
  createChart,
  eraseCell,
  getCell,
  getColor,
  groupAt,
  groupSpan,
  hasContent,
  insertColumn,
  insertRow,
  mirrorHorizontal,
  mirrorVertical,
  normalizeChart,
  paintCell,
  pasteFragment,
  removeGroup,
  resizeChart
} from "./core/chart.js";
import { createBrowserI18n, LANGUAGE_META } from "./core/i18n.js";
import { renderSvg } from "./core/render-svg.js";
import { DARK_THEME, LIGHT_THEME } from "./core/render-canvas.js";
import { MM_PER_INCH } from "./core/units.js";
import { groupLegend, symbolName } from "./core/symbols.js";
import { hasErrors, validateChart } from "./core/validate.js";
import { CanvasView } from "./ui/canvas-view.js";
import { renderInspector, renderLegend } from "./ui/inspector.js";
import { renderPalette } from "./ui/palette.js";
import * as storage from "./ui/persistence.js";
import { Store } from "./ui/store.js";
import { createDemoChart } from "./demo.js";

const $ = (id) => document.getElementById(id);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const q = (selector) => document.querySelector(selector);

let settings = storage.loadSettings();
let i18n = null;
let store = null;
let canvasView = null;
let clipboard = null;
let autosaveTimer = null;
let toastTimer = null;
let confirmResolve = null;
let saving = false;
let emptyHintDismissed = false;

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

async function init() {
  i18n = await createBrowserI18n(settings.language || "de");
  i18n.apply(document);
  applyTheme(settings.theme || "system", { persist: false });
  populateLanguages();
  emptyHintDismissed = localStorage.getItem("stitchwright.emptyHintDismissed") === "1";

  const chart = await loadInitialChart();
  store = new Store(chart, { settings });
  if (!chart.id) chart.id = storage.makeChartId(chart.title || "chart");
  canvasView = new CanvasView({
    canvas: $("chart-canvas"),
    wrap: $("canvas-wrap"),
    store,
    theme: canvasTheme(),
    onError: (error) => showToast(error.message || i18n.t("error.unknown"), "error")
  });

  store.subscribe(onStoreChange);
  setupTopbar();
  setupTools();
  setupChartSettings();
  setupDialogs();
  setupKeyboard();
  setupMedia();
  setupSidebar();

  renderAll();
  canvasView.mount();
  updateEmptyHint();
  registerServiceWorker();
}

async function loadInitialChart() {
  const lastId = localStorage.getItem("stitchwright.lastChart");
  try {
    if (lastId) {
      const saved = await storage.loadChart(lastId);
      if (saved) return normalizeChart(saved);
    }
    const recent = await storage.listCharts();
    if (recent.length) {
      const saved = await storage.loadChart(recent[0].id);
      if (saved) return normalizeChart(saved);
    }
  } catch (error) {
    console.warn("Local charts are unavailable", error);
  }
  const chart = createChart({ width: 40, height: 24, title: "" });
  chart.id = storage.makeChartId("chart");
  return chart;
}

/* ------------------------------------------------------------------ */
/* Store reactions                                                     */
/* ------------------------------------------------------------------ */

function onStoreChange(type) {
  if (type === "chart") {
    renderAll();
    scheduleAutosave();
    return;
  }
  if (type === "history") {
    updateHistoryButtons();
    updateSaveIndicator();
    scheduleAutosave();
    renderLegendPanel();
    return;
  }
  if (type === "paint") {
    updateStatus();
    updateEmptyHint();
    updateSaveIndicator();
    scheduleAutosave();
    return;
  }
  if (type === "selection") {
    renderInspectorPanel();
    updateStatus();
    return;
  }
  if (type === "tool") {
    updateToolUI();
    updateStatus();
    return;
  }
  if (type === "symbol") {
    renderPalettePanel();
    updateToolUI();
    return;
  }
  if (type === "color") {
    renderPalettePanel();
    return;
  }
  if (type === "view") {
    updateZoomUI();
    updateStatus();
    return;
  }
  if (type === "cursor") {
    updateStatus();
    return;
  }
  if (type === "saved") {
    updateSaveIndicator();
  }
}

function renderAll() {
  renderTitle();
  renderSettings();
  renderPalettePanel();
  renderInspectorPanel();
  renderLegendPanel();
  updateHistoryButtons();
  updateZoomUI();
  updateToolUI();
  updateStatus();
  updateEmptyHint();
  updateSaveIndicator();
}

/* ------------------------------------------------------------------ */
/* Rendering panels                                                    */
/* ------------------------------------------------------------------ */

function renderTitle() {
  const input = $("chart-title");
  if (document.activeElement !== input) input.value = store.chart.title || "";
  document.title = store.chart.title ? `${store.chart.title} – Stitchwright` : "Stitchwright";
}

function setIfIdle(id, value) {
  const element = $(id);
  if (document.activeElement !== element) element.value = value;
}

function renderSettings() {
  const chart = store.chart;
  const imperial = settings.units === "imperial";
  const cellUnit = imperial ? "in" : "mm";
  const cellLabel = $("opt-cell-mm").closest("label").querySelector(".field-label");
  if (cellLabel) cellLabel.textContent = `${i18n.t("chart.cellSize")} (${cellUnit})`;
  const cellValue = imperial ? chart.options.cellMm / MM_PER_INCH : chart.options.cellMm;
  setIfIdle("chart-width", String(chart.width));
  setIfIdle("chart-height", String(chart.height));
  setIfIdle("opt-rows-mode", chart.options.rowsMode);
  setIfIdle("opt-repeat-start", chart.options.repeat ? String(chart.options.repeat.start) : "");
  setIfIdle("opt-repeat-end", chart.options.repeat ? String(chart.options.repeat.end) : "");
  setIfIdle("opt-cell-mm", imperial ? cellValue.toFixed(2) : String(cellValue));
  $("opt-cell-mm").step = imperial ? "0.01" : "0.5";
  $("opt-cell-mm").min = imperial ? "0.08" : "2";
  $("opt-cell-mm").max = imperial ? "0.79" : "20";
  setIfIdle("opt-paper", chart.options.paper);
  setIfIdle("opt-subtitle", chart.options.subtitle || "");
  $("opt-row-numbers").checked = Boolean(chart.options.showRowNumbers);
  $("opt-stitch-numbers").checked = Boolean(chart.options.showStitchNumbers);
  $("opt-legend").checked = Boolean(chart.options.showLegend);

  const pill = $("rows-mode-pill");
  pill.textContent = chart.options.rowsMode === "rs" ? i18n.t("chart.rowsMode.rs") : i18n.t("chart.rowsMode.all");
  $("btn-rows-mode").textContent = chart.options.rowsMode === "rs"
    ? i18n.t("chart.rowsMode.all")
    : i18n.t("chart.rowsMode.rs");
  $("btn-row-above").textContent = `+ ${i18n.t("chart.rowAboveShort")}`;
  $("btn-row-below").textContent = `+ ${i18n.t("chart.rowBelowShort")}`;
  $("btn-col-left").textContent = `+ ${i18n.t("chart.colLeftShort")}`;
  $("btn-col-right").textContent = `+ ${i18n.t("chart.colRightShort")}`;
}

function renderPalettePanel() {
  const symbolsEl = $("palette");
  symbolsEl.dataset.query = $("symbol-search").value || "";
  renderPalette({
    symbolsEl,
    colorsEl: $("colors"),
    store,
    t: i18n.t,
    lang: i18n.language,
    onCustomGroup: () => openCableDialog(),
    onCustomLabel: () => openCustomGroupDialog(),
    onAddColor: () => openColorDialog()
  });
}

function renderInspectorPanel() {
  renderInspector({
    container: $("inspector"),
    store,
    t: i18n.t,
    lang: i18n.language,
    onUpdateGroup: (group, values) => updateGroup(group, values),
    onRemoveGroup: (group) => removeSelectedGroup(group),
    onFillSelection: () => fillSelection(),
    onClearSelection: () => clearSelection()
  });
}

function renderLegendPanel() {
  renderLegend({
    container: $("legend"),
    chart: store.chart,
    t: i18n.t,
    lang: i18n.language
  });
}

function updateHistoryButtons() {
  $("btn-undo").disabled = store.undoStack.length === 0;
  $("btn-redo").disabled = store.redoStack.length === 0;
}

function updateToolUI() {
  $$("[data-tool]").forEach((button) => {
    const active = button.dataset.tool === store.tool;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  $("chart-canvas").dataset.tool = store.tool;
}

function updateZoomUI() {
  const percent = Math.round((store.view.scale / 28) * 100);
  $("zoom-label").textContent = `${percent} %`;
  $("status-zoom").textContent = `${percent} %`;
}

function updateStatus() {
  const chart = store.chart;
  const cell = store.hover || store.cursor;
  if (cell) {
    const stitch = chart.width - cell.col + 1;
    $("status-cursor").textContent = `${i18n.t("status.row")} ${cell.row} · ${i18n.t("chart.stitchLabel")} ${stitch}`;
  } else {
    $("status-cursor").textContent = i18n.t("status.ready");
  }
  $("status-size").textContent = `${chart.width} × ${chart.height}`;
  updateZoomUI();
  updateSaveIndicator();
}

function updateSaveIndicator() {
  const text = store.dirty
    ? i18n.t("status.unsaved")
    : (store.savedAt ? i18n.t("status.saved") : "");
  $("save-indicator").textContent = text;
  $("status-save").textContent = store.dirty
    ? text
    : (store.savedAt ? i18n.t("status.autosaved") : "");
}

function updateEmptyHint() {
  $("empty-hint").hidden = emptyHintDismissed || hasContent(store.chart);
}

function dismissEmptyHint() {
  emptyHintDismissed = true;
  try {
    localStorage.setItem("stitchwright.emptyHintDismissed", "1");
  } catch {
    // Private mode can block storage; the hint still closes for this session.
  }
  updateEmptyHint();
}

/* ------------------------------------------------------------------ */
/* Top bar and tools                                                   */
/* ------------------------------------------------------------------ */

function setupTopbar() {
  $("chart-title").addEventListener("input", (event) => {
    store.chart.title = event.target.value;
    store.dirty = true;
    document.title = event.target.value ? `${event.target.value} – Stitchwright` : "Stitchwright";
    updateSaveIndicator();
    scheduleAutosave();
  });

  $("btn-undo").addEventListener("click", () => store.undo());
  $("btn-redo").addEventListener("click", () => store.redo());
  $("btn-new").addEventListener("click", () => openNewDialog());
  $("btn-open").addEventListener("click", () => openOpenDialog());
  $("btn-save").addEventListener("click", () => saveLocal(false));
  $("btn-export").addEventListener("click", () => openExportDialog());
  $("btn-settings").addEventListener("click", () => openSettingsDialog());
  $("btn-help").addEventListener("click", () => openHelpDialog());
  $("btn-table").addEventListener("click", () => openTableDialog());
  $("btn-mirror-h").addEventListener("click", () => mirrorH());
  $("btn-mirror-v")?.addEventListener("click", () => mirrorV());
  $("btn-rows-mode").addEventListener("click", () => toggleRowsMode());
  $("zoom-in").addEventListener("click", () => canvasView.zoomBy(1.2));
  $("zoom-out").addEventListener("click", () => canvasView.zoomBy(1 / 1.2));
  $("zoom-fit").addEventListener("click", () => canvasView.fit());
  $("btn-empty-start").addEventListener("click", () => {
    dismissEmptyHint();
    store.setTool("pencil");
    $("chart-canvas").focus();
  });
  $("btn-empty-close").addEventListener("click", dismissEmptyHint);
  $("chart-canvas").addEventListener("pointerdown", dismissEmptyHint, { passive: true });
  $("btn-empty-sample").addEventListener("click", () => loadChart(createDemoChart(), { save: true }));
  $("btn-add-row").addEventListener("click", addRowAtTop);
  $("btn-add-col").addEventListener("click", addColumnAtRight);
}

function setupTools() {
  $$("[data-tool]").forEach((button) => {
    button.addEventListener("click", () => store.setTool(button.dataset.tool));
  });
  $("symbol-search").addEventListener("input", () => renderPalettePanel());
}

function setupSidebar() {
  const left = $("left-panel");
  const right = $("right-panel");
  const overlay = $("overlay");
  const close = () => {
    left.classList.remove("open");
    right.classList.remove("open");
    overlay.hidden = true;
  };
  $("btn-sidebar-left").addEventListener("click", () => {
    left.classList.add("open");
    right.classList.remove("open");
    overlay.hidden = false;
  });
  $("btn-sidebar-right").addEventListener("click", () => {
    right.classList.add("open");
    left.classList.remove("open");
    overlay.hidden = false;
  });
  overlay.addEventListener("click", close);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
}

/* ------------------------------------------------------------------ */
/* Chart settings                                                      */
/* ------------------------------------------------------------------ */

function setupChartSettings() {
  $("chart-width").addEventListener("change", () => resizeFromInputs());
  $("chart-height").addEventListener("change", () => resizeFromInputs());
  $("opt-rows-mode").addEventListener("change", (event) => {
    store.edit("Rückreihen", (chart) => {
      chart.options.rowsMode = event.target.value === "rs" ? "rs" : "all";
    });
    canvasView.fit();
    const diagnostics = validateChart(store.chart);
    if (diagnostics.some((item) => item.code === "W_HIDDEN_WS")) {
      showToast(i18n.t("chart.hiddenWS.warning"), "error");
    }
  });
  for (const [id, key] of [
    ["opt-row-numbers", "showRowNumbers"],
    ["opt-stitch-numbers", "showStitchNumbers"],
    ["opt-legend", "showLegend"]
  ]) {
    $(id).addEventListener("change", (event) => {
      store.edit("Anzeige", (chart) => { chart.options[key] = event.target.checked; });
    });
  }
  $("opt-repeat-start").addEventListener("change", () => updateRepeat());
  $("opt-repeat-end").addEventListener("change", () => updateRepeat());
  $("opt-cell-mm").addEventListener("change", (event) => {
    const raw = Number(event.target.value);
    const value = settings.units === "imperial" ? raw * MM_PER_INCH : raw;
    if (!Number.isFinite(value) || value < 2 || value > 20) {
      showToast(i18n.t("error.fix"), "error");
      renderSettings();
      return;
    }
    store.edit("Zellgröße", (chart) => { chart.options.cellMm = Math.round(value * 100) / 100; });
    renderSettings();
  });
  $("opt-paper").addEventListener("change", (event) => {
    store.edit("Papier", (chart) => { chart.options.paper = event.target.value; });
  });
  $("opt-subtitle").addEventListener("change", (event) => {
    store.edit("Untertitel", (chart) => { chart.options.subtitle = event.target.value; });
  });

  $("btn-row-above").addEventListener("click", () => insertRowAt("above"));
  $("btn-row-below").addEventListener("click", () => insertRowAt("below"));
  $("btn-col-left").addEventListener("click", () => insertColumnAt("left"));
  $("btn-col-right").addEventListener("click", () => insertColumnAt("right"));
}

async function resizeFromInputs() {
  const width = Number($("chart-width").value);
  const height = Number($("chart-height").value);
  const chart = store.chart;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 1000 || height > 1000) {
    showToast(i18n.t("error.fix"), "error");
    renderSettings();
    return;
  }
  if (width === chart.width && height === chart.height) return;
  if (width < chart.width || height < chart.height) {
    const ok = await confirmDialog(i18n.t("chart.resize.confirm"));
    if (!ok) {
      renderSettings();
      return;
    }
  }
  store.edit("Größe", (current) => {
    resizeChart(current, width, height);
  });
  canvasView.fit();
}

function updateRepeat() {
  const start = Number($("opt-repeat-start").value);
  const end = Number($("opt-repeat-end").value);
  const chart = store.chart;
  if (!start && !end) {
    store.edit("Rapport", (current) => { current.options.repeat = null; });
    return;
  }
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end > chart.width || start > end) {
    showToast(i18n.t("error.fix"), "error");
    renderSettings();
    return;
  }
  store.edit("Rapport", (current) => { current.options.repeat = { start, end }; });
}

function toggleRowsMode() {
  const next = store.chart.options.rowsMode === "rs" ? "all" : "rs";
  store.edit("Rückreihen", (chart) => { chart.options.rowsMode = next; });
  canvasView.fit();
  if (next === "rs" && validateChart(store.chart).some((item) => item.code === "W_HIDDEN_WS")) {
    showToast(i18n.t("chart.hiddenWS.warning"), "error");
  }
}

function insertRowAt(side) {
  const row = store.cursor.row;
  dismissEmptyHint();
  try {
    store.edit("Reihe einfügen", (chart) => {
      insertRow(chart, row, side);
    });
    renderSettings();
  } catch (error) {
    showToast(error.message || i18n.t("error.unknown"), "error");
  }
}

function insertColumnAt(side) {
  const col = store.cursor.col;
  dismissEmptyHint();
  try {
    store.edit("Spalte einfügen", (chart) => {
      insertColumn(chart, col, side);
    });
    renderSettings();
  } catch (error) {
    showToast(error.message || i18n.t("error.unknown"), "error");
  }
}

function addRowAtTop() {
  dismissEmptyHint();
  try {
    store.edit("Reihe hinzufügen", (chart) => {
      insertRow(chart, chart.height, "above");
    });
    canvasView.fit();
  } catch (error) {
    showToast(error.message || i18n.t("error.unknown"), "error");
  }
}

function addColumnAtRight() {
  dismissEmptyHint();
  try {
    store.edit("Spalte hinzufügen", (chart) => {
      insertColumn(chart, chart.width, "right");
    });
    canvasView.fit();
  } catch (error) {
    showToast(error.message || i18n.t("error.unknown"), "error");
  }
}

function mirrorH() {
  store.edit("Horizontal spiegeln", (chart) => mirrorHorizontal(chart));
}

function mirrorV() {
  store.edit("Vertikal spiegeln", (chart) => mirrorVertical(chart));
}

/* ------------------------------------------------------------------ */
/* Inspector actions                                                   */
/* ------------------------------------------------------------------ */

function updateGroup(group, values) {
  try {
    store.edit("Gruppe ändern", (chart) => {
      const index = chart.groups.findIndex((item) => item.id === group.id);
      if (index === -1) return false;
      chart.groups.splice(index, 1);
      addGroup(chart, { ...values, id: group.id });
    });
    store.selectGroup(group.id);
  } catch (error) {
    showToast(error.message || i18n.t("error.unknown"), "error");
  }
}

function removeSelectedGroup(group) {
  store.edit("Gruppe entfernen", (chart) => {
    removeGroup(chart, group.id);
  });
}

function selectionBounds() {
  if (!store.selection) return null;
  return {
    top: Math.min(store.selection.row1, store.selection.row2),
    bottom: Math.max(store.selection.row1, store.selection.row2),
    left: Math.min(store.selection.col1, store.selection.col2),
    right: Math.max(store.selection.col1, store.selection.col2)
  };
}

function fillSelection() {
  const bounds = selectionBounds();
  if (!bounds) return;
  if (store.symbol.id !== "k" && !store.symbol.id) return;
  if (["cable", "custom", "k2tog", "ssk", "k3tog", "sk2p", "cdd"].includes(store.symbol.id)) {
    showToast(i18n.t("error.fillGroup"), "error");
    return;
  }
  store.begin("Auswahl füllen");
  for (let row = bounds.top; row <= bounds.bottom; row += 1) {
    for (let col = bounds.left; col <= bounds.right; col += 1) {
      paintCell(store.chart, row, col, store.symbol.id === "k" ? null : store.symbol.id, store.color);
    }
  }
  store.touch();
  store.commit();
}

function clearSelection() {
  const bounds = selectionBounds();
  if (!bounds) return;
  store.begin("Auswahl leeren");
  for (let row = bounds.top; row <= bounds.bottom; row += 1) {
    for (let col = bounds.left; col <= bounds.right; col += 1) {
      eraseCell(store.chart, row, col);
    }
  }
  store.touch();
  store.commit();
}

/* ------------------------------------------------------------------ */
/* Clipboard                                                           */
/* ------------------------------------------------------------------ */

function copyCurrentSelection() {
  const bounds = selectionBounds();
  if (!bounds) return;
  clipboard = copySelection(store.chart, bounds.top, bounds.left, bounds.bottom, bounds.right);
  showToast(i18n.t("app.copied"));
}

function pasteClipboard() {
  if (!clipboard) return;
  try {
    store.edit("Einfügen", (chart) => {
      pasteFragment(chart, clipboard, store.cursor.row, store.cursor.col);
    });
  } catch (error) {
    showToast(error.message || i18n.t("error.unknown"), "error");
  }
}

function cutSelection() {
  copyCurrentSelection();
  clearSelection();
}

/* ------------------------------------------------------------------ */
/* Dialogs                                                             */
/* ------------------------------------------------------------------ */

function setupDialogs() {
  for (const [dialogId, buttonId] of [
    ["dialog-new", "btn-create-chart"],
    ["dialog-custom-group", "btn-custom-add"],
    ["dialog-cable", "btn-cable-add"],
    ["dialog-color", "btn-color-add"]
  ]) {
    $(dialogId).addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        $(buttonId).click();
      }
    });
  }

  $("btn-create-chart").addEventListener("click", createNewChart);

  $("btn-export-download").addEventListener("click", () => exportChart("download"));
  $("btn-export-print").addEventListener("click", () => exportChart("print"));
  $("export-format").addEventListener("change", () => {
    $("export-scale-field").style.display = $("export-format").value === "png" ? "" : "none";
  });

  $("btn-open-file").addEventListener("click", async () => {
    const file = await storage.pickJsonFile();
    if (file) loadFromFile(file);
  });
  setupDropZone();

  $("settings-language").addEventListener("change", (event) => changeLanguage(event.target.value));
  $("settings-theme").addEventListener("change", (event) => applyTheme(event.target.value));
  $("settings-units").addEventListener("change", (event) => {
    settings.units = event.target.value === "imperial" ? "imperial" : "metric";
    storage.saveSettings(settings);
    renderSettings();
    renderLegendPanel();
  });
  $("settings-autosave").addEventListener("change", (event) => {
    settings.autosave = event.target.checked;
    storage.saveSettings(settings);
    if (settings.autosave) scheduleAutosave();
  });
  $("btn-settings-reset").addEventListener("click", async () => {    if (!(await confirmDialog(i18n.t("settings.reset.confirm")))) return;
    settings = {
      language: "de",
      theme: "system",
      units: "metric",
      autosave: true,
      density: "comfortable"
    };
    storage.saveSettings(settings);
    await i18n.setLanguage(settings.language);
    applyTheme(settings.theme, { persist: false });
    populateLanguages();
    renderAll();
  });

  $("btn-open-about").addEventListener("click", () => {
    $("dialog-settings").close();
    openAboutDialog();
  });

  $("btn-custom-add").addEventListener("click", addCustomGroup);
  $("btn-cable-add").addEventListener("click", addCustomCable);
  $("btn-color-add").addEventListener("click", addColor);
  $("btn-confirm-ok").addEventListener("click", () => {
    if (confirmResolve) confirmResolve(true);
    confirmResolve = null;
    $("dialog-confirm").close();
  });
  $("dialog-confirm").addEventListener("close", () => {
    if (confirmResolve) confirmResolve(false);
    confirmResolve = null;
  });
}

function openDialog(id) {
  const dialog = $(id);
  if (!dialog.open) dialog.showModal();
}

function openNewDialog() {
  $("new-width").value = "40";
  $("new-height").value = "24";
  $("new-title").value = "";
  openDialog("dialog-new");
}

function createNewChart() {
  const width = Number($("new-width").value);
  const height = Number($("new-height").value);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 1000 || height > 1000) {
    showToast(i18n.t("error.fix"), "error");
    return;
  }
  const title = $("new-title").value.trim();
  const chart = createChart({ width, height, title });
  chart.id = storage.makeChartId(title || "chart");
  $("dialog-new").close();
  loadChart(chart, { save: true, fit: true });
}

function openExportDialog() {
  $("export-scale-field").style.display = $("export-format").value === "png" ? "" : "none";
  $("export-legend").checked = store.chart.options.showLegend !== false;
  openDialog("dialog-export");
}

async function openOpenDialog() {
  openDialog("dialog-open");
  await renderRecent();
}

function openSettingsDialog() {
  $("settings-language").value = settings.language;
  $("settings-theme").value = settings.theme;
  $("settings-units").value = settings.units;
  $("settings-autosave").checked = Boolean(settings.autosave);
  openDialog("dialog-settings");
}

function openHelpDialog() {
  renderShortcuts();
  openDialog("dialog-help");
}

function openAboutDialog() {
  $("about-version").textContent = `${i18n.t("about.version")} 0.0.1 · ${i18n.t("about.license")}`;
  openDialog("dialog-about");
}

function openTableDialog() {
  renderTable();
  openDialog("dialog-table");
}

function openCustomGroupDialog() {
  $("custom-label").value = "";
  $("custom-span").value = "3";
  openDialog("dialog-custom-group");
}

function openCableDialog() {
  $("cable-left").value = "2";
  $("cable-right").value = "2";
  $("cable-direction").value = "front";
  openDialog("dialog-cable");
}

function openColorDialog() {
  $("color-name").value = "";
  $("color-hex").value = "#b3261e";
  openDialog("dialog-color");
}

function addCustomGroup() {
  const label = $("custom-label").value.trim();
  const span = Number($("custom-span").value);
  if (!label || !Number.isInteger(span) || span < 1 || span > 12) {
    showToast(i18n.t("error.fix"), "error");
    return;
  }
  store.setSymbol({ id: "custom", span, label });
  store.setTool("pencil");
  $("dialog-custom-group").close();
  showToast(i18n.t("message.clickToPlace"));
}

function addCustomCable() {
  const left = Number($("cable-left").value);
  const right = Number($("cable-right").value);
  const direction = $("cable-direction").value === "back" ? "back" : "front";
  if (!Number.isInteger(left) || !Number.isInteger(right) || left < 1 || right < 1 || left > 12 || right > 12) {
    showToast(i18n.t("error.fix"), "error");
    return;
  }
  store.setSymbol({ id: "cable", left, right, direction });
  store.setTool("pencil");
  $("dialog-cable").close();
  showToast(i18n.t("message.clickToPlace"));
}

function addColor() {
  const name = $("color-name").value.trim() || $("color-hex").value;
  const hex = $("color-hex").value;
  if (!/^#[0-9a-f]{6}$/i.test(hex)) {
    showToast(i18n.t("error.fix"), "error");
    return;
  }
  const used = new Set(store.chart.palette.map((entry) => entry.id));
  let id = "A";
  for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    if (!used.has(letter)) { id = letter; break; }
  }
  if (used.has(id) && store.chart.palette.length >= 26) id = `C${store.chart.palette.length + 1}`;
  store.edit("Farbe hinzufügen", (chart) => {
    chart.palette.push({ id, name, hex });
  });
  store.setColor(id);
  $("dialog-color").close();
}

function confirmDialog(message) {
  return new Promise((resolve) => {
    confirmResolve = resolve;
    $("confirm-text").textContent = message;
    openDialog("dialog-confirm");
  });
}

/* ------------------------------------------------------------------ */
/* Open / save / export                                                */
/* ------------------------------------------------------------------ */

function loadChart(chart, { save = false, fit = true } = {}) {
  emptyHintDismissed = true;
  try {
    localStorage.setItem("stitchwright.emptyHintDismissed", "1");
  } catch {
    // Ignore storage failures; the current session still dismisses the hint.
  }
  store.replace(chart);
  if (fit) canvasView.fit();
  if (save) saveLocal(true);
  updateEmptyHint();
}

async function loadFromFile(file) {
  try {
    const text = await storage.readFileText(file);
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      showToast(i18n.t("error.file.parse"), "error");
      return;
    }
    const chart = normalizeChart(data);
    const diagnostics = validateChart(chart);
    if (hasErrors(diagnostics)) {
      const first = diagnostics.find((item) => item.severity === "error");
      showToast(`${i18n.t("error.validation")} ${first.path}: ${first.message}`, "error");
      return;
    }
    loadChart(chart, { save: true, fit: true });
    $("dialog-open").close();
    showToast(i18n.t("dialog.import.success"));
  } catch (error) {
    console.error(error);
    showToast(i18n.t("error.file.read"), "error");
  }
}

async function renderRecent() {
  const list = $("recent-list");
  list.replaceChildren();
  try {
    const charts = await storage.listCharts();
    if (!charts.length) {
      const p = document.createElement("p");
      p.className = "muted";
      p.textContent = i18n.t("dialog.open.empty");
      list.append(p);
      return;
    }
    for (const chart of charts) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "recent-item";
      const strong = document.createElement("strong");
      strong.textContent = chart.title || i18n.t("chart.untitled");
      const meta = document.createElement("span");
      meta.textContent = `${chart.width} × ${chart.height} · ${storage.formatDate(chart.savedAt, i18n.language)}`;
      button.append(strong, meta);
      button.addEventListener("click", async () => {
        const loaded = await storage.loadChart(chart.id);
        if (loaded) {
          loadChart(normalizeChart(loaded), { fit: true });
          $("dialog-open").close();
        }
      });
      list.append(button);
    }
  } catch (error) {
    console.warn(error);
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = i18n.t("dialog.open.empty");
    list.append(p);
  }
}

function setupDropZone() {
  const zone = $("drop-zone");
  for (const eventName of ["dragenter", "dragover"]) {
    zone.addEventListener(eventName, (event) => {
      event.preventDefault();
      zone.classList.add("dragover");
    });
  }
  for (const eventName of ["dragleave", "drop"]) {
    zone.addEventListener(eventName, (event) => {
      event.preventDefault();
      zone.classList.remove("dragover");
    });
  }
  zone.addEventListener("drop", (event) => {
    const file = event.dataTransfer?.files?.[0];
    if (file) loadFromFile(file);
  });
}

async function saveLocal(silent = false) {
  if (!store || saving) return;
  saving = true;
  try {
    await storage.saveChart(store.chart);
    localStorage.setItem("stitchwright.lastChart", store.chart.id);
    store.markSaved();
    if (!silent) showToast(i18n.t("message.savedLocal"));
  } catch (error) {
    console.warn(error);
    if (!silent) showToast(i18n.t("error.save"), "error");
  } finally {
    saving = false;
  }
}

function scheduleAutosave() {
  if (!settings.autosave) return;
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => saveLocal(true), 700);
}

async function exportChart(mode) {
  const format = $("export-format").value;
  const includeLegend = $("export-legend").checked;
  const base = safeName(store.chart.title || "strickschrift");
  try {
    if (format === "json") {
      const text = `${JSON.stringify(store.chart, null, 2)}\n`;
      await storage.saveTextFile(`${base}.strickschrift.json`, text, "application/json");
      $("dialog-export").close();
      return;
    }
    const svg = renderSvg(store.chart, {
      lang: i18n.language,
      unit: settings.units,
      includeLegend
    });
    if (mode === "print") {
      printSvg(svg);
      return;
    }
    if (format === "svg") {
      await storage.saveTextFile(`${base}.svg`, svg, "image/svg+xml");
    } else if (format === "png") {
      const scale = Number($("export-scale").value) || 2;
      const blob = await svgToPngBlob(svg, scale);
      storage.downloadBlob(`${base}.png`, blob);
    }
    $("dialog-export").close();
  } catch (error) {
    console.error(error);
    showToast(i18n.t("dialog.export.error"), "error");
  }
}

function printSvg(svg) {
  const win = window.open("", "_blank");
  if (!win) {
    showToast(i18n.t("error.export"), "error");
    return;
  }
  win.document.open();
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Stitchwright</title><style>
    @page { margin: 10mm; }
    html, body { margin: 0; padding: 0; background: #fff; }
    svg { display: block; max-width: 100%; height: auto; margin: 0 auto; }
  </style></head><body>${svg}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 250);
}

function svgToPngBlob(svg, scale) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const viewBox = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
      const baseWidth = image.naturalWidth || Number(viewBox?.[1]) || 1200;
      const baseHeight = image.naturalHeight || Number(viewBox?.[2]) || 800;
      const factor = Math.min(scale, 8000 / Math.max(baseWidth, baseHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(baseWidth * factor));
      canvas.height = Math.max(1, Math.round(baseHeight * factor));
      const context = canvas.getContext("2d");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((png) => {
        if (png) resolve(png);
        else reject(new Error("PNG encoding failed"));
      }, "image/png");
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("SVG could not be loaded as an image"));
    };
    image.src = url;
  });
}

function safeName(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "strickschrift";
}

/* ------------------------------------------------------------------ */
/* Table view                                                          */
/* ------------------------------------------------------------------ */

function renderTable() {
  const wrap = $("table-view");
  wrap.replaceChildren();
  const chart = store.chart;
  const rows = [];
  for (let row = 1; row <= chart.height; row += 1) {
    for (let col = 1; col <= chart.width; col += 1) {
      const group = groupAt(chart, row, col);
      if (group) {
        rows.push({
          row,
          stitch: chart.width - col + 1,
          symbol: groupLegend(group, i18n.language),
          color: getColor(chart, row, col) ? colorLabel(getColor(chart, row, col)) : "–"
        });
        col += groupSpan(chart, group) - 1;
        continue;
      }
      const cell = getCell(chart, row, col);
      const color = getColor(chart, row, col);
      if (!cell && !color) continue;
      rows.push({
        row,
        stitch: chart.width - col + 1,
        symbol: cell ? symbolName(cell, i18n.language) : "–",
        color: color ? colorLabel(color) : "–"
      });
    }
  }

  if (!rows.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = i18n.t("dialog.table.empty");
    wrap.append(p);
    return;
  }

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  for (const key of ["dialog.table.row", "dialog.table.stitch", "dialog.table.symbol", "dialog.table.color"]) {
    const th = document.createElement("th");
    th.textContent = i18n.t(key);
    headRow.append(th);
  }
  thead.append(headRow);
  table.append(thead);
  const tbody = document.createElement("tbody");
  for (const item of rows) {
    const tr = document.createElement("tr");
    for (const value of [item.row, item.stitch, item.symbol, item.color]) {
      const td = document.createElement("td");
      td.textContent = String(value);
      tr.append(td);
    }
    tbody.append(tr);
  }
  table.append(tbody);
  wrap.append(table);
}

function colorLabel(id) {
  const entry = store.chart.palette.find((item) => item.id === id);
  return entry ? `${entry.name} (${entry.hex})` : id;
}

/* ------------------------------------------------------------------ */
/* Settings, language, theme                                           */
/* ------------------------------------------------------------------ */

function populateLanguages() {
  const select = $("settings-language");
  select.replaceChildren();
  for (const [code, meta] of Object.entries(LANGUAGE_META)) {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = meta.status === "reviewed" ? meta.label : `${meta.label} (${meta.status})`;
    select.append(option);
  }
  select.value = settings.language;
}

async function changeLanguage(lang) {
  if (!LANGUAGE_META[lang]) return;
  settings.language = lang;
  storage.saveSettings(settings);
  await i18n.setLanguage(lang);
  i18n.apply(document);
  populateLanguages();
  renderAll();
  renderShortcuts();
}

function applyTheme(theme, { persist = true } = {}) {
  settings.theme = theme;
  document.documentElement.dataset.theme = theme;
  if (persist) storage.saveSettings(settings);
  if (canvasView) canvasView.setTheme(canvasTheme());
}

function canvasTheme() {
  if (settings.theme === "high-contrast") return DARK_THEME;
  if (settings.theme === "dark") return DARK_THEME;
  if (settings.theme === "light") return LIGHT_THEME;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? DARK_THEME : LIGHT_THEME;
}

function setupMedia() {
  const media = window.matchMedia?.("(prefers-color-scheme: dark)");
  media?.addEventListener?.("change", () => {
    if (settings.theme === "system" && canvasView) canvasView.setTheme(canvasTheme());
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && settings.autosave) saveLocal(true);
  });
}

/* ------------------------------------------------------------------ */
/* Keyboard                                                            */
/* ------------------------------------------------------------------ */

function setupKeyboard() {
  window.addEventListener("keydown", (event) => {
    const target = event.target;
    const typing = target instanceof Element && target.closest("input, textarea, select, [contenteditable='true']");
    if (typing) return;
    if (document.querySelector("dialog[open]")) return;

    const key = event.key;
    const lower = key.toLowerCase();
    const mod = event.ctrlKey || event.metaKey;

    if (mod) {
      if (lower === "s") { event.preventDefault(); saveLocal(false); return; }
      if (lower === "o") { event.preventDefault(); openOpenDialog(); return; }
      if (lower === "n") { event.preventDefault(); openNewDialog(); return; }
      if (lower === "e") { event.preventDefault(); openExportDialog(); return; }
      if (lower === "z") { event.preventDefault(); if (event.shiftKey) store.redo(); else store.undo(); return; }
      if (lower === "y") { event.preventDefault(); store.redo(); return; }
      if (lower === "a") { event.preventDefault(); store.setSelection({ row1: 1, col1: 1, row2: store.chart.height, col2: store.chart.width }); return; }
      if (lower === "c") { event.preventDefault(); copyCurrentSelection(); return; }
      if (lower === "v") { event.preventDefault(); pasteClipboard(); return; }
      if (lower === "x") { event.preventDefault(); cutSelection(); return; }
      return;
    }

    if (key === "?") { event.preventDefault(); openHelpDialog(); return; }
    if (key === "+" || key === "=") { event.preventDefault(); canvasView.zoomBy(1.2); return; }
    if (key === "-") { event.preventDefault(); canvasView.zoomBy(1 / 1.2); return; }
    if (key === "0") { event.preventDefault(); canvasView.fit(); return; }

    if (key === "ArrowUp") { event.preventDefault(); canvasView.moveCursor(1, 0); return; }
    if (key === "ArrowDown") { event.preventDefault(); canvasView.moveCursor(-1, 0); return; }
    if (key === "ArrowLeft") { event.preventDefault(); canvasView.moveCursor(0, -1); return; }
    if (key === "ArrowRight") { event.preventDefault(); canvasView.moveCursor(0, 1); return; }
    if (key === " " || key === "Enter") { event.preventDefault(); canvasView.paintCursor(); return; }
    if (key === "Delete" || key === "Backspace") {
      event.preventDefault();
      store.begin("Radieren");
      canvasView.eraseAt(store.cursor.row, store.cursor.col);
      store.commit();
      return;
    }
    if (key === "Escape") { store.setSelection(null); return; }

    if (lower === "v") { store.setTool("select"); return; }
    if (lower === "p") { store.setTool("pencil"); return; }
    if (lower === "e") { store.setTool("eraser"); return; }
    if (lower === "h") { store.setTool("pan"); return; }
    if (lower === "t") { openTableDialog(); return; }
    if (lower === "m") { if (event.shiftKey) mirrorV(); else mirrorH(); return; }
  });
}

function renderShortcuts() {
  const container = $("shortcut-list");
  container.replaceChildren();
  const shortcuts = [
    ["V", i18n.t("shortcut.select")],
    ["P", i18n.t("shortcut.pencil")],
    ["E", i18n.t("shortcut.eraser")],
    ["H", i18n.t("shortcut.pan")],
    ["Ctrl+Z", i18n.t("shortcut.undo")],
    ["Ctrl+Shift+Z", i18n.t("shortcut.redo")],
    ["Ctrl+S", i18n.t("shortcut.save")],
    ["Ctrl+O", i18n.t("shortcut.open")],
    ["Ctrl+N", i18n.t("shortcut.new")],
    ["Ctrl+E", i18n.t("shortcut.export")],
    ["Ctrl+C / V / X", i18n.t("shortcut.copy")],
    ["Ctrl+A", i18n.t("shortcut.selectAll")],
    ["+ / -", i18n.t("shortcut.zoomIn")],
    ["0", i18n.t("shortcut.fit")],
    ["← ↑ ↓ →", i18n.t("shortcut.move")],
    ["Space / Enter", i18n.t("shortcut.paint")],
    [i18n.language === "de" ? "Entf" : "Del", i18n.t("shortcut.delete")],
    ["Esc", i18n.t("shortcut.escape")],
    ["M / Shift+M", i18n.t("shortcut.mirrorH")],
    ["T", i18n.t("dialog.table.title")]
  ];
  for (const [keys, label] of shortcuts) {
    const row = document.createElement("div");
    row.className = "shortcut-row";
    const name = document.createElement("span");
    name.textContent = label;
    const kbd = document.createElement("kbd");
    kbd.textContent = keys;
    row.append(name, kbd);
    container.append(row);
  }
}

/* ------------------------------------------------------------------ */
/* Misc                                                                */
/* ------------------------------------------------------------------ */

function showToast(message, type = "info") {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.toggle("error", type === "error");
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3600);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (!location.protocol.startsWith("http")) return;
  // Development escape hatch: ?nosw disables the cache so a reload always
  // shows the files on disk. Production uses the normal offline cache.
  if (new URLSearchParams(location.search).has("nosw")) return;
  navigator.serviceWorker.register("./sw.js").catch((error) => {
    console.warn("Service worker registration failed", error);
  });
}

init().catch((error) => {
  console.error(error);
  const main = document.createElement("main");
  main.style.padding = "40px";
  main.style.fontFamily = "system-ui, sans-serif";
  const title = document.createElement("h1");
  title.textContent = "Stitchwright";
  const text = document.createElement("p");
  text.textContent = error.message || "Die App konnte nicht gestartet werden.";
  main.append(title, text);
  document.body.replaceChildren(main);
});
