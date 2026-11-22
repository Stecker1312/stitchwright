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
  clearGuides,
  columnToStitch,
  copySelection,
  createChart,
  deleteColumn,
  deleteRow,
  eraseCell,
  getCell,
  getColor,
  groupAt,
  groupSpan,
  hasContent,
  insertColumn,
  insertRow,
  isInTheRound,
  mirrorHorizontal,
  mirrorVertical,
  normalizeChart,
  paintCell,
  pasteFragment,
  removeGroup,
  resizeChart,
  setMarkerEvery,
  toggleMarker,
  clearMarkers,
  visibleRows
} from "./core/chart.js";
import { createBrowserI18n, HTML_LANGUAGE, LANGUAGE_META } from "./core/i18n.js";
import { renderSvg } from "./core/render-svg.js";
import { DARK_THEME, LIGHT_THEME } from "./core/render-canvas.js";
import { scrollbarMetrics, viewportFrame } from "./core/viewport.js";
import { MM_PER_INCH } from "./core/units.js";
import { groupLegend, isGroupSymbol, symbolName } from "./core/symbols.js";
import { hasErrors, validateChart } from "./core/validate.js";
import { CanvasView } from "./ui/canvas-view.js";
import {
  customCablesFromChart,
  mergeCustomCables
} from "./ui/custom-cables.js";
import { renderInspector, renderLegend } from "./ui/inspector.js";
import { renderPalette } from "./ui/palette.js";
import * as storage from "./ui/persistence.js";
import { SaveCoordinator } from "./ui/save-coordinator.js";
import { Store } from "./ui/store.js";
import { createDemoChart } from "./demo.js";
import { APP_VERSION } from "./version.js";

const $ = (id) => document.getElementById(id);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const q = (selector) => document.querySelector(selector);
const MAX_IMPORT_BYTES = 20 * 1024 * 1024;
const TAB_ID = globalThis.crypto?.randomUUID?.() || `tab-${Math.random().toString(36).slice(2)}`;

function readLocal(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

let settings = storage.loadSettings();
let i18n = null;
let store = null;
let canvasView = null;
let clipboard = null;
let saveCoordinator = null;
let documentSwitchInProgress = false;
let storageIssue = null;
let tabChannel = null;
let toastTimer = null;
let confirmResolve = null;
let unsavedResolve = null;
let emptyHintDismissed = false;
let customGroups = [];
let customCables = [];
let lastCableDraft = { left: 2, right: 2, direction: "front" };

const scrollState = {
  x: { max: 0, track: 0, thumb: 0, start: 0 },
  y: { max: 0, track: 0, thumb: 0, start: 0 }
};
let scrollDrag = null;

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

async function init() {
  i18n = await createBrowserI18n(settings.language || "en");
  document.documentElement.lang = HTML_LANGUAGE[i18n.language] || i18n.language;
  i18n.apply(document);
  applyTheme(settings.theme || "system", { persist: false });
  populateLanguages();
  emptyHintDismissed = readLocal("stitchwright.emptyHintDismissed") === "1";
  customGroups = storage.loadCustomGroups();
  customCables = storage.loadCustomCables();

  const chart = await loadInitialChart();
  store = new Store(chart, { settings });
  if (!chart.id) chart.id = storage.makeChartId(chart.title || "chart");
  saveCoordinator = new SaveCoordinator({
    getStore: () => store,
    saveChart: storage.saveChart,
    isAutosaveEnabled: () => Boolean(settings.autosave),
    onSaved: ({ documentId, silent }) => {
      writeLocal("stitchwright.lastChart", documentId);
      tabChannel?.postMessage({ type: "saved", id: documentId, tabId: TAB_ID });
      if (!silent) showToast(i18n.t("message.savedLocal"));
    },
    onError: (error, silent) => {
      console.warn(error);
      if (!silent) showToast(i18n.t("error.save"), "error");
    },
    onQueued: () => {
      saveCoordinator.schedule();
    }
  });
  customGroups = mergeCustomGroups(customGroups, customGroupsFromChart(chart));
  storage.saveCustomGroups(customGroups);
  customCables = mergeCustomCables(customCables, customCablesFromChart(chart));
  storage.saveCustomCables(customCables);
  canvasView = new CanvasView({
    canvas: $("chart-canvas"),
    wrap: $("canvas-wrap"),
    store,
    theme: canvasTheme(),
    onError: (error) => showToast(error.message || i18n.t("error.unknown"), "error"),
    onResize: () => updateCanvasScrollbars()
  });

  store.subscribe(onStoreChange);
  setupTopbar();
  setupTools();
  setupChartSettings();
  setupDialogs();
  setupKeyboard();
  setupMedia();
  setupSidebar();
  setupCanvasScrollbars();
  setupTabChannel();

  renderAll();
  canvasView.mount();
  updateCanvasScrollbars();
  updateEmptyHint();
  if (storageIssue) showToast(i18n.t("error.storage"), "error");
  registerServiceWorker();
}

async function loadInitialChart() {
  const lastId = readLocal("stitchwright.lastChart");
  const loadSaved = async (id) => {
    if (!id) return null;
    const saved = await storage.loadChart(id);
    if (!saved) return null;
    const chart = normalizeChart(saved);
    const diagnostics = validateChart(chart);
    if (hasErrors(diagnostics)) {
      console.warn("Ignoring an invalid local chart", id, diagnostics);
      return null;
    }
    return chart;
  };
  try {
    const chart = await loadSaved(lastId);
    if (chart) return chart;
    const recent = await storage.listCharts();
    for (const entry of recent) {
      const chart = await loadSaved(entry.id);
      if (chart) return chart;
    }
  } catch (error) {
    storageIssue = error;
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
    updateClipboardButtons();
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
    updateClipboardButtons();
    updateStatus();
    return;
  }
  if (type === "header") {
    updateAdders();
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
    updateCanvasScrollbars();
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
  updateNewChartLabels();
  renderPalettePanel();
  renderInspectorPanel();
  renderLegendPanel();
  updateHistoryButtons();
  updateZoomUI();
  updateToolUI();
  updateAdders();
  updateClipboardButtons();
  updateCanvasScrollbars();
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

function rowLabel(chart = store.chart) {
  return i18n.t(isInTheRound(chart) ? "chart.roundLabel" : "chart.rowLabel");
}

function rowRange(chart, from, to) {
  return i18n.t(isInTheRound(chart) ? "chart.roundRange" : "chart.rowRange", { from, to });
}

function renderSettings() {
  const chart = store.chart;
  const imperial = settings.units === "imperial";
  const cellUnit = imperial ? "in" : "mm";
  const cellLabel = $("opt-cell-mm").closest("label").querySelector(".field-label");
  if (cellLabel) cellLabel.textContent = `${i18n.t("chart.cellSize")} (${cellUnit})`;
  const cellValue = imperial ? chart.options.cellMm / MM_PER_INCH : chart.options.cellMm;
  const round = isInTheRound(chart);
  setIfIdle("chart-width", String(chart.width));
  setIfIdle("chart-height", String(chart.height));
  setIfIdle("opt-construction", round ? "round" : "flat");
  setIfIdle("opt-rows-mode", chart.options.rowsMode);
  $("rows-mode-settings").hidden = round;
  $("round-mode-hint").hidden = !round;
  $("btn-rows-mode").hidden = round;
  const repeat = chart.options.repeat;
  setIfIdle("opt-repeat-start", repeat ? String(columnToStitch(chart, repeat.end)) : "");
  setIfIdle("opt-repeat-end", repeat ? String(columnToStitch(chart, repeat.start)) : "");
  setIfIdle("opt-cell-mm", imperial ? cellValue.toFixed(2) : String(cellValue));
  $("opt-cell-mm").step = imperial ? "0.01" : "0.5";
  $("opt-cell-mm").min = imperial ? "0.08" : "2";
  $("opt-cell-mm").max = imperial ? "0.79" : "20";
  setIfIdle("opt-paper", chart.options.paper);
  setIfIdle("opt-subtitle", chart.options.subtitle || "");
  $("opt-row-numbers").checked = Boolean(chart.options.showRowNumbers);
  $("opt-stitch-numbers").checked = Boolean(chart.options.showStitchNumbers);
  $("opt-legend").checked = Boolean(chart.options.showLegend);
  $("opt-stitch-counts").checked = Boolean(chart.options.showStitchCounts);
  const markerCount = Array.isArray(chart.options.markers) ? chart.options.markers.length : 0;
  $("marker-count").textContent = markerCount
    ? i18n.t("chart.markerCount", { count: markerCount })
    : "";

  const pill = $("rows-mode-pill");
  if (round) {
    pill.textContent = i18n.t("chart.construction.round");
  } else {
    pill.textContent = chart.options.rowsMode === "rs"
      ? i18n.t("chart.rowsMode.rs")
      : i18n.t("chart.rowsMode.all");
    $("btn-rows-mode").textContent = chart.options.rowsMode === "rs"
      ? i18n.t("chart.rowsMode.all")
      : i18n.t("chart.rowsMode.rs");
  }
  $("btn-row-above").textContent = `+ ${i18n.t(round ? "chart.roundAboveShort" : "chart.rowAboveShort")}`;
  $("btn-row-below").textContent = `+ ${i18n.t(round ? "chart.roundBelowShort" : "chart.rowBelowShort")}`;
  $("btn-col-left").textContent = `+ ${i18n.t("chart.colLeftShort")}`;
  $("btn-col-right").textContent = `+ ${i18n.t("chart.colRightShort")}`;
  $("btn-add-row-label").textContent = i18n.t(round ? "chart.addRoundShort" : "chart.addRowShort");
  const addRowHint = i18n.t(round ? "chart.addRoundHint" : "chart.addRowHint");
  $("btn-add-row").title = addRowHint;
  $("btn-add-row").setAttribute("aria-label", addRowHint);
  $("opt-row-numbers-label").textContent = i18n.t(round ? "chart.roundNumbers" : "chart.showRowNumbers");
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
    customGroups,
    customCables,
    onNewCable: () => openCableDialog(),
    onNewGroup: () => openCustomGroupDialog(),
    onAddColor: () => openColorDialog()
  });
}

function mergeCustomGroups(existing, additions, { replace = false } = {}) {
  const merged = new Map();
  for (const group of [...existing, ...additions]) {
    if (!group || typeof group.label !== "string") continue;
    const label = group.label.trim().slice(0, 24);
    const span = Number(group.span);
    if (!label || !Number.isInteger(span) || span < 1 || span > 12) continue;
    const legend = typeof group.legend === "string" ? group.legend.trim().slice(0, 160) : "";
    const key = `${label}\u0000${span}`;
    const previous = merged.get(key);
    merged.set(key, { label, span, legend: replace ? legend : (legend || previous?.legend || "") });
  }
  return [...merged.values()];
}

function customGroupsFromChart(chart) {
  return chart.groups
    .filter((group) => group.symbol === "custom")
    .map((group) => ({
      label: group.label || "",
      span: group.span || groupSpan(chart, group),
      legend: group.legend || ""
    }))
    .filter((group) => group.label);
}

function rememberCustomGroups(additions, { replace = false } = {}) {
  const next = mergeCustomGroups(customGroups, additions, { replace });
  if (JSON.stringify(next) === JSON.stringify(customGroups)) return;
  customGroups = next;
  storage.saveCustomGroups(customGroups);
  renderPalettePanel();
}

function rememberCustomCables(additions) {
  const next = mergeCustomCables(customCables, additions);
  if (JSON.stringify(next) === JSON.stringify(customCables)) return;
  customCables = next;
  storage.saveCustomCables(customCables);
  renderPalettePanel();
}

/**
 * Bring a freshly created palette entry into view. The palette is long, and a
 * new entry at the bottom would otherwise look as if it had been lost.
 */
function revealPaletteEntry(symbol, params = {}) {
  requestAnimationFrame(() => {
    const entry = $$(`#palette button[data-symbol="${symbol}"]`).find((button) => (
      Object.entries(params).every(([key, value]) => button.dataset[key] === String(value))
    ));
    entry?.scrollIntoView({ block: "nearest" });
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
  $$("button[data-tool]").forEach((button) => {
    const active = button.dataset.tool === store.tool;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  $("chart-canvas").dataset.tool = store.tool;
  const guideOptions = $("guide-tool-options");
  const guideTool = store.tool === "guide";
  guideOptions.hidden = !guideTool;
  if (guideTool) {
    const colorInput = $("guide-color");
    if (document.activeElement !== colorInput) colorInput.value = store.guideColor;
    const count = (store.chart.guides || []).length;
    $("guide-count").textContent = count
      ? `${i18n.t("tool.guide.count", { count })} · `
      : "";
    $("btn-guide-clear").disabled = count === 0;
  }
}

function updateZoomUI() {
  const percent = Math.round((store.view.scale / 28) * 100);
  $("zoom-label").textContent = `${percent} %`;
  $("status-zoom").textContent = `${percent} %`;
}

function updateStatus() {
  const chart = store.chart;
  if (store.headerSelection) {
    const { kind, from, to } = store.headerSelection;
    if (from === to) {
      const value = kind === "row" ? from : columnToStitch(chart, from);
      const label = kind === "row" ? rowLabel(chart) : i18n.t("chart.columnLabel");
      $("status-cursor").textContent = `${label} ${value} · ${i18n.t("status.selected")}`;
    } else if (kind === "row") {
      $("status-cursor").textContent = `${rowRange(chart, from, to)} · ${i18n.t("status.selected")}`;
    } else {
      const a = columnToStitch(chart, from);
      const b = columnToStitch(chart, to);
      $("status-cursor").textContent = `${i18n.t("chart.columnRange", {
        from: Math.min(a, b),
        to: Math.max(a, b)
      })} · ${i18n.t("status.selected")}`;
    }
  } else if (store.selection && selectionBounds()) {
    const bounds = selectionBounds();
    const width = bounds.right - bounds.left + 1;
    const height = bounds.bottom - bounds.top + 1;
    $("status-cursor").textContent = `${i18n.t("status.selection", { width, height })} · ${i18n.t("status.selectionHint")}`;
  } else {
    const cell = store.hover || store.cursor;
    if (cell) {
      const stitch = columnToStitch(chart, cell.col);
      $("status-cursor").textContent = `${i18n.t(isInTheRound(chart) ? "status.round" : "status.row")} ${cell.row} · ${i18n.t("chart.stitchLabel")} ${stitch}`;
    } else {
      $("status-cursor").textContent = i18n.t("status.ready");
    }
  }
  $("status-size").textContent = `${chart.width} × ${chart.height}`;
  const active = store.hover || store.cursor;
  if (active) {
    const group = groupAt(chart, active.row, active.col);
    const cell = getCell(chart, active.row, active.col);
    const symbol = group
      ? groupLegend(group, i18n.language)
      : (cell ? symbolName(cell, i18n.language) : i18n.t("table.knit"));
    $("chart-canvas").setAttribute(
      "aria-label",
      `${i18n.t("chart.canvas")}. ${i18n.t(isInTheRound(chart) ? "status.round" : "status.row")} ${active.row}, ${i18n.t("chart.stitchLabel")} ${columnToStitch(chart, active.col)}, ${symbol}`
    );
  }
  updateZoomUI();
  updateSaveIndicator();
}

function updateAdders() {
  const selection = store.headerSelection;
  const label = $("header-selection");
  const button = $("btn-delete-header");
  const round = isInTheRound(store.chart);
  if (!selection) {
    label.hidden = true;
    label.textContent = "";
    button.disabled = true;
    const hint = i18n.t(round ? "chart.selectHeaderHintRound" : "chart.selectHeaderHint");
    button.title = hint;
    button.setAttribute("aria-label", hint);
    return;
  }
  const { kind, from, to } = selection;
  if (from === to) {
    const name = kind === "row" ? rowLabel(store.chart) : i18n.t("chart.columnLabel");
    const value = kind === "row" ? from : columnToStitch(store.chart, from);
    label.textContent = `${name} ${value}`;
  } else if (kind === "row") {
    label.textContent = rowRange(store.chart, from, to);
  } else {
    const a = columnToStitch(store.chart, from);
    const b = columnToStitch(store.chart, to);
    label.textContent = i18n.t("chart.columnRange", {
      from: Math.min(a, b),
      to: Math.max(a, b)
    });
  }
  label.hidden = false;
  const selectedCount = to - from + 1;
  const total = kind === "row" ? store.chart.height : store.chart.width;
  button.disabled = selectedCount >= total;
  const deleteLabel = i18n.t(round ? "chart.deleteHeaderRound" : "chart.deleteHeader");
  button.title = deleteLabel;
  button.setAttribute("aria-label", deleteLabel);
}

/* ------------------------------------------------------------------ */
/* Canvas scrollbars                                                   */
/* ------------------------------------------------------------------ */

function setupCanvasScrollbars() {
  setupScrollbar("scroll-h", "scroll-h-thumb", "x");
  setupScrollbar("scroll-v", "scroll-v-thumb", "y");
}

function setupScrollbar(trackId, thumbId, axis) {
  const track = $(trackId);
  const thumb = $(thumbId);
  if (!track || !thumb) return;

  track.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const state = scrollState[axis];
    if (!state || state.max <= 0) return;
    event.preventDefault();
    track.focus({ preventScroll: true });
    const trackRect = track.getBoundingClientRect();
    const thumbRect = thumb.getBoundingClientRect();
    const length = axis === "x" ? trackRect.width : trackRect.height;
    const thumbLength = axis === "x" ? thumbRect.width : thumbRect.height;
    const travel = Math.max(1, length - thumbLength);

    if (event.target !== thumb) {
      const pointer = axis === "x" ? event.clientX - trackRect.left : event.clientY - trackRect.top;
      const fraction = Math.min(1, Math.max(0, (pointer - thumbLength / 2) / travel));
      setScroll(axis, fraction * state.max);
    }

    scrollDrag = {
      axis,
      track,
      pointerId: event.pointerId,
      start: axis === "x" ? event.clientX : event.clientY,
      startScroll: currentScroll(axis),
      max: state.max,
      travel
    };
    try {
      track.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is a nicety, not a requirement.
    }
  });

  track.addEventListener("pointermove", (event) => {
    if (!scrollDrag || scrollDrag.track !== track || scrollDrag.pointerId !== event.pointerId) return;
    const delta = (axis === "x" ? event.clientX : event.clientY) - scrollDrag.start;
    setScroll(axis, scrollDrag.startScroll + (delta / scrollDrag.travel) * scrollDrag.max);
  });

  const endDrag = (event) => {
    if (!scrollDrag || scrollDrag.track !== track || scrollDrag.pointerId !== event.pointerId) return;
    scrollDrag = null;
    try {
      if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore a lost capture.
    }
  };
  track.addEventListener("pointerup", endDrag);
  track.addEventListener("pointercancel", endDrag);

  track.addEventListener("keydown", (event) => {
    const state = scrollState[axis];
    if (!state || state.max <= 0) return;
    const step = Math.max(24, state.track * 0.1);
    let delta = 0;
    if (event.key === "Home") delta = -state.max;
    else if (event.key === "End") delta = state.max;
    else if (axis === "x" && event.key === "ArrowLeft") delta = -step;
    else if (axis === "x" && event.key === "ArrowRight") delta = step;
    else if (axis === "y" && event.key === "ArrowUp") delta = -step;
    else if (axis === "y" && event.key === "ArrowDown") delta = step;
    if (!delta) return;
    event.preventDefault();
    event.stopPropagation();
    setScroll(axis, currentScroll(axis) + delta);
  });
}

function currentScroll(axis) {
  const state = scrollState[axis];
  if (!state) return 0;
  const offset = axis === "x" ? store.view.offsetX : store.view.offsetY;
  return Math.min(state.max, Math.max(0, state.start - offset));
}

function setScroll(axis, value) {
  const state = scrollState[axis];
  if (!state || state.max <= 0) return;
  const next = Math.min(state.max, Math.max(0, value));
  const view = { ...store.view };
  if (axis === "x") view.offsetX = state.start - next;
  else view.offsetY = state.start - next;
  store.setView(view);
}

function updateCanvasScrollbars() {
  if (!store || !canvasView) return;
  const rows = visibleRows(store.chart).length;
  const frame = viewportFrame(canvasView.width, canvasView.height);
  updateScrollbar(
    "scroll-h",
    "scroll-h-thumb",
    "x",
    store.chart.width * store.view.scale,
    Math.max(1, frame.right - frame.left),
    frame.left,
    store.view.offsetX
  );
  updateScrollbar(
    "scroll-v",
    "scroll-v-thumb",
    "y",
    rows * store.view.scale,
    Math.max(1, frame.bottom - frame.top),
    frame.top,
    store.view.offsetY
  );
}

function updateScrollbar(trackId, thumbId, axis, chartSize, contentSize, contentStart, offset) {
  const track = $(trackId);
  const thumb = $(thumbId);
  if (!track || !thumb) return;

  const metrics = scrollbarMetrics(chartSize, contentSize, contentStart, offset);
  const { max, scroll } = metrics;
  const visible = metrics.visible;
  track.hidden = !visible;
  if (!visible) {
    scrollState[axis] = { max: 0, track: 0, thumb: 0, start: metrics.start };
    track.setAttribute("aria-valuemax", "0");
    track.setAttribute("aria-valuenow", "0");
    return;
  }

  const trackLength = axis === "x" ? track.clientWidth : track.clientHeight;
  const thumbLength = trackLength > 0
    ? Math.max(22, Math.min(trackLength, (contentSize / chartSize) * trackLength))
    : 0;
  const travel = Math.max(0, trackLength - thumbLength);
  const position = max > 0 ? (scroll / max) * travel : 0;

  if (axis === "x") {
    thumb.style.width = `${thumbLength}px`;
    thumb.style.height = "7px";
    thumb.style.transform = `translateX(${position}px)`;
  } else {
    thumb.style.width = "7px";
    thumb.style.height = `${thumbLength}px`;
    thumb.style.transform = `translateY(${position}px)`;
  }

  track.setAttribute("aria-valuemax", String(Math.round(max)));
  track.setAttribute("aria-valuenow", String(Math.round(scroll)));
  scrollState[axis] = { max, track: trackLength, thumb: thumbLength, start: metrics.start };
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
  writeLocal("stitchwright.emptyHintDismissed", "1");
  updateEmptyHint();
}

/* ------------------------------------------------------------------ */
/* Top bar and tools                                                   */
/* ------------------------------------------------------------------ */

function setupTopbar() {
  const titleInput = $("chart-title");
  let titleEditing = false;
  titleInput.addEventListener("focus", () => {
    if (titleEditing) return;
    try {
      store.begin("Title");
      titleEditing = true;
    } catch {
      // A pointer gesture may still be open; the title is then saved without
      // a separate undo snapshot.
    }
  });
  titleInput.addEventListener("input", (event) => {
    store.setTitle(event.target.value);
    document.title = event.target.value ? `${event.target.value} – Stitchwright` : "Stitchwright";
    updateSaveIndicator();
    scheduleAutosave();
  });
  titleInput.addEventListener("blur", () => {
    if (!titleEditing) return;
    titleEditing = false;
    store.commit();
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
  $("btn-copy-selection").addEventListener("click", copyCurrentSelection);
  $("btn-paste-selection").addEventListener("click", pasteClipboard);
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
  $("btn-empty-sample").addEventListener("click", async () => {
    await switchDocument(createDemoChart(), { save: true, fit: true });
  });
  $("btn-add-row").addEventListener("click", addRowAtTop);
  $("btn-add-col").addEventListener("click", addColumnAtRight);
  $("btn-delete-header").addEventListener("click", deleteSelectedHeader);
}

function setupTools() {
  $$("button[data-tool]").forEach((button) => {
    button.addEventListener("click", () => {
      store.setTool(button.dataset.tool);
      $("chart-canvas").focus();
    });
  });
  $("guide-color").addEventListener("input", (event) => {
    store.setGuideColor(event.target.value);
    settings.guideColor = store.guideColor;
    storage.saveSettings(settings);
  });
  $("btn-guide-clear").addEventListener("click", () => {
    if (!(store.chart.guides || []).length) return;
    store.edit("Clear guide lines", (chart) => {
      clearGuides(chart);
    });
    $("chart-canvas").focus();
  });
  $("symbol-search").addEventListener("input", () => renderPalettePanel());
  $("palette").addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("button")
      && !document.querySelector("dialog[open]")) $("chart-canvas").focus();
  });
  $("colors").addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("button")
      && !document.querySelector("dialog[open]")) $("chart-canvas").focus();
  });
}

function setupSidebar() {
  const left = $("left-panel");
  const right = $("right-panel");
  const overlay = $("overlay");
  const leftButton = $("btn-sidebar-left");
  const rightButton = $("btn-sidebar-right");
  const narrow = window.matchMedia?.("(max-width: 900px)");
  const syncInert = () => {
    if (!narrow?.matches) {
      left.inert = false;
      right.inert = false;
      return;
    }
    left.inert = !left.classList.contains("open");
    right.inert = !right.classList.contains("open");
  };
  const close = (restoreFocus = false) => {
    const wasLeft = left.classList.contains("open");
    const wasRight = right.classList.contains("open");
    left.classList.remove("open");
    right.classList.remove("open");
    overlay.hidden = true;
    leftButton.setAttribute("aria-expanded", "false");
    rightButton.setAttribute("aria-expanded", "false");
    syncInert();
    if ((wasLeft || wasRight) && restoreFocus) (wasLeft ? leftButton : rightButton).focus();
  };
  const open = (panel, button) => {
    panel.classList.add("open");
    (panel === left ? right : left).classList.remove("open");
    overlay.hidden = false;
    leftButton.setAttribute("aria-expanded", String(panel === left));
    rightButton.setAttribute("aria-expanded", String(panel === right));
    syncInert();
    const first = panel.querySelector("button, input, select, a");
    if (first) first.focus();
    button.setAttribute("aria-expanded", "true");
  };
  leftButton.setAttribute("aria-expanded", "false");
  rightButton.setAttribute("aria-expanded", "false");
  narrow?.addEventListener?.("change", syncInert);
  syncInert();
  leftButton.addEventListener("click", () => open(left, leftButton));
  rightButton.addEventListener("click", () => open(right, rightButton));
  overlay.addEventListener("click", () => close(true));
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close(true);
  });
}

/* ------------------------------------------------------------------ */
/* Chart settings                                                      */
/* ------------------------------------------------------------------ */

function setupChartSettings() {
  $("chart-width").addEventListener("change", () => resizeFromInputs());
  $("chart-height").addEventListener("change", () => resizeFromInputs());
  $("opt-construction").addEventListener("change", (event) => {
    const construction = event.target.value === "round" ? "round" : "flat";
    store.edit("Construction", (chart) => {
      chart.options.construction = construction;
      // Older readers ignore construction; keeping rowsMode at "all" makes
      // sure they still show every round instead of hiding every second one.
      if (construction === "round") chart.options.rowsMode = "all";
    });
    store.setHeaderSelection(null);
    ensureCursorVisible();
    canvasView.fit();
    renderSettings();
  });
  $("opt-rows-mode").addEventListener("change", (event) => {
    if (isInTheRound(store.chart)) {
      renderSettings();
      return;
    }
    store.edit("Wrong-side rows", (chart) => {
      chart.options.rowsMode = event.target.value === "rs" ? "rs" : "all";
    });
    store.setHeaderSelection(null);
    ensureCursorVisible();
    canvasView.fit();
    const diagnostics = validateChart(store.chart);
    if (diagnostics.some((item) => item.code === "W_HIDDEN_WS")) {
      showToast(i18n.t("chart.hiddenWS.warning"), "error");
    }
  });
  for (const [id, key] of [
    ["opt-row-numbers", "showRowNumbers"],
    ["opt-stitch-numbers", "showStitchNumbers"],
    ["opt-legend", "showLegend"],
    ["opt-stitch-counts", "showStitchCounts"]
  ]) {
    $(id).addEventListener("change", (event) => {
      store.edit("Display", (chart) => { chart.options[key] = event.target.checked; });
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
    store.edit("Cell size", (chart) => { chart.options.cellMm = Math.round(value * 100) / 100; });
    renderSettings();
  });
  $("opt-paper").addEventListener("change", (event) => {
    store.edit("Paper", (chart) => { chart.options.paper = event.target.value; });
  });
  $("opt-subtitle").addEventListener("change", (event) => {
    store.edit("Subtitle", (chart) => { chart.options.subtitle = event.target.value; });
  });

  $("btn-row-above").addEventListener("click", () => insertRowAt("above"));
  $("btn-row-below").addEventListener("click", () => insertRowAt("below"));
  $("btn-col-left").addEventListener("click", () => insertColumnAt("left"));
  $("btn-col-right").addEventListener("click", () => insertColumnAt("right"));
  $("btn-marker-every").addEventListener("click", setMarkerGrid);
  $("btn-marker-clear").addEventListener("click", clearAllMarkers);
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
  store.edit("Size", (current) => {
    resizeChart(current, width, height);
  });
  store.setHeaderSelection(null);
  ensureCursorVisible();
  canvasView.fit();
}

function updateRepeat() {
  const fromStitch = Number($("opt-repeat-start").value);
  const toStitch = Number($("opt-repeat-end").value);
  const chart = store.chart;
  if (!fromStitch && !toStitch) {
    store.edit("Repeat", (current) => { current.options.repeat = null; });
    return;
  }
  if (!Number.isInteger(fromStitch) || !Number.isInteger(toStitch)
    || fromStitch < 1 || toStitch > chart.width || fromStitch > toStitch) {
    showToast(i18n.t("error.fix"), "error");
    renderSettings();
    return;
  }
  store.edit("Repeat", (current) => {
    current.options.repeat = {
      start: columnToStitch(current, toStitch),
      end: columnToStitch(current, fromStitch)
    };
  });
}

function ensureCursorVisible() {
  const rows = visibleRows(store.chart);
  const row = Math.min(store.chart.height, store.cursor.row);
  const col = Math.min(store.chart.width, store.cursor.col);
  if (!rows.includes(row)) {
    store.setCursor({ row: rows[0] || 1, col });
  } else if (row !== store.cursor.row || col !== store.cursor.col) {
    store.setCursor({ row, col });
  }
}

function toggleRowsMode() {
  if (isInTheRound(store.chart)) return;
  const next = store.chart.options.rowsMode === "rs" ? "all" : "rs";
  store.edit("Wrong-side rows", (chart) => { chart.options.rowsMode = next; });
  store.setHeaderSelection(null);
  ensureCursorVisible();
  canvasView.fit();
  if (next === "rs" && validateChart(store.chart).some((item) => item.code === "W_HIDDEN_WS")) {
    showToast(i18n.t("chart.hiddenWS.warning"), "error");
  }
}

function insertRowAt(side) {
  const row = store.cursor.row;
  dismissEmptyHint();
  store.setHeaderSelection(null);
  try {
    store.edit("Insert row", (chart) => {
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
  store.setHeaderSelection(null);
  try {
    store.edit("Insert column", (chart) => {
      insertColumn(chart, col, side);
    });
    renderSettings();
  } catch (error) {
    showToast(error.message || i18n.t("error.unknown"), "error");
  }
}

function addRowAtTop() {
  dismissEmptyHint();
  store.setHeaderSelection(null);
  try {
    store.edit("Add row", (chart) => {
      insertRow(chart, chart.height, "above");
    });
    canvasView.fit();
  } catch (error) {
    showToast(error.message || i18n.t("error.unknown"), "error");
  }
}

function addColumnAtRight() {
  dismissEmptyHint();
  store.setHeaderSelection(null);
  try {
    store.edit("Add column", (chart) => {
      insertColumn(chart, chart.width, "right");
    });
    canvasView.fit();
  } catch (error) {
    showToast(error.message || i18n.t("error.unknown"), "error");
  }
}

function setMarkerGrid() {
  const every = Number($("opt-marker-every").value);
  if (!Number.isInteger(every) || every < 1 || every > 1000) {
    showToast(i18n.t("error.fix"), "error");
    return;
  }
  store.edit("Stitch markers", (chart) => {
    setMarkerEvery(chart, every);
  });
  renderSettings();
}

function clearAllMarkers() {
  store.edit("Clear stitch markers", (chart) => {
    clearMarkers(chart);
  });
  renderSettings();
}

async function deleteSelectedHeader() {
  const selection = store.headerSelection;
  if (!selection) return;
  const { kind, from, to } = selection;
  const isRow = kind === "row";
  const round = isInTheRound(store.chart);
  const count = to - from + 1;
  const total = isRow ? store.chart.height : store.chart.width;
  if (count >= total) {
    showToast(i18n.t(isRow
      ? (round ? "chart.keepOneRound" : "chart.keepOneRow")
      : "chart.keepOneColumn"), "error");
    return;
  }
  let message;
  if (from === to) {
    message = isRow
      ? i18n.t(round ? "chart.deleteRoundConfirm" : "chart.deleteRowConfirm", { row: from })
      : i18n.t("chart.deleteColumnConfirm", { column: columnToStitch(store.chart, from) });
  } else if (isRow) {
    message = i18n.t(round ? "chart.deleteRoundsConfirm" : "chart.deleteRowsConfirm", { from, to });
  } else {
    const a = columnToStitch(store.chart, from);
    const b = columnToStitch(store.chart, to);
    message = i18n.t("chart.deleteColumnsConfirm", {
      from: Math.min(a, b),
      to: Math.max(a, b)
    });
  }
  if (!(await confirmDialog(message))) return;
  try {
    store.edit(isRow ? "Delete rows" : "Delete columns", (chart) => {
      // Delete from the high index down so the remaining indices stay valid.
      for (let index = to; index >= from; index -= 1) {
        if (isRow) deleteRow(chart, index);
        else deleteColumn(chart, index);
      }
    });
    store.setHeaderSelection(null);
    ensureCursorVisible();
    canvasView.fit();
    renderSettings();
  } catch (error) {
    showToast(error.message || i18n.t("error.unknown"), "error");
  }
}

function mirrorH() {
  store.edit("Mirror horizontally", (chart) => mirrorHorizontal(chart));
  store.setHeaderSelection(null);
}

function mirrorV() {
  store.edit("Mirror vertically", (chart) => mirrorVertical(chart));
  store.setHeaderSelection(null);
}

/* ------------------------------------------------------------------ */
/* Inspector actions                                                   */
/* ------------------------------------------------------------------ */

function updateGroup(group, values) {
  try {
    store.edit("Change group", (chart) => {
      const index = chart.groups.findIndex((item) => item.id === group.id);
      if (index === -1) return false;
      chart.groups.splice(index, 1);
      addGroup(chart, { ...values, id: group.id });
    });
    store.selectGroup(group.id);
    if (group.symbol === "custom") {
      rememberCustomGroups([{
        label: values.label ?? group.label,
        span: values.span ?? group.span,
        legend: values.legend ?? group.legend ?? ""
      }], { replace: true });
    }
  } catch (error) {
    showToast(error.message || i18n.t("error.unknown"), "error");
  }
}

function removeSelectedGroup(group) {
  store.edit("Remove group", (chart) => {
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
  if (isGroupSymbol(store.symbol.id)) {
    showToast(i18n.t("error.fillGroup"), "error");
    return;
  }
  const rows = visibleRows(store.chart).filter((row) => row >= bounds.top && row <= bounds.bottom);
  store.begin("Fill selection");
  for (const row of rows) {
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
  const rows = visibleRows(store.chart).filter((row) => row >= bounds.top && row <= bounds.bottom);
  store.begin("Clear selection");
  for (const row of rows) {
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

function updateClipboardButtons() {
  const copy = $("btn-copy-selection");
  const paste = $("btn-paste-selection");
  if (copy) copy.disabled = !store?.selection;
  if (paste) paste.disabled = !clipboard;
}

function copyCurrentSelection() {
  const bounds = selectionBounds();
  if (!bounds) return;
  clipboard = copySelection(store.chart, bounds.top, bounds.left, bounds.bottom, bounds.right);
  updateClipboardButtons();
  showToast(i18n.t("app.copied"));
}

function pasteClipboard() {
  if (!clipboard) return;
  const startRow = store.cursor.row;
  const startCol = store.cursor.col;
  try {
    store.edit("Paste", (chart) => {
      pasteFragment(chart, clipboard, startRow, startCol);
    });
    store.setSelection({
      row1: startRow,
      col1: startCol,
      row2: Math.min(store.chart.height, startRow + clipboard.height - 1),
      col2: Math.min(store.chart.width, startCol + clipboard.width - 1)
    });
    updateClipboardButtons();
    showToast(i18n.t("message.pasted"));
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
  for (const dialog of $$("dialog")) {
    const heading = dialog.querySelector("h2");
    if (!heading) continue;
    if (!heading.id) heading.id = `${dialog.id}-title`;
    dialog.setAttribute("aria-labelledby", heading.id);
  }
  for (const [dialogId, buttonId] of [
    ["dialog-new", "btn-create-chart"],
    ["dialog-custom-group", "btn-custom-add"],
    ["dialog-cable", "btn-cable-add"],
    ["dialog-color", "btn-color-add"]
  ]) {
    $(dialogId).addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || event.defaultPrevented) return;
      const target = event.target;
      if (target instanceof HTMLTextAreaElement) return;
      if (target instanceof Element && target.closest("button")) return;
      event.preventDefault();
      $(buttonId).click();
    });
  }

  $("btn-create-chart").addEventListener("click", createNewChart);
  $("new-construction").addEventListener("change", updateNewChartLabels);

  $("btn-export-download").addEventListener("click", () => exportChart("download"));
  $("btn-export-print").addEventListener("click", () => exportChart("print"));
  $("export-format").addEventListener("change", () => {
    $("export-scale-field").style.display = $("export-format").value === "png" ? "" : "none";
  });

  $("btn-open-file").addEventListener("click", async () => {
    const file = await storage.pickJsonFile();
    if (file) loadFromFile(file);
  });
  $("btn-restore-previous").addEventListener("click", restorePreviousVersion);
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
      language: "en",
      theme: "system",
      units: "metric",
      autosave: true,
      density: "comfortable",
      guideColor: "#1a1a1a"
    };
    storage.saveSettings(settings);
    store.setGuideColor(settings.guideColor);
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

  for (const [id, value] of [
    ["btn-unsaved-cancel", "cancel"],
    ["btn-unsaved-discard", "discard"],
    ["btn-unsaved-save", "save"]
  ]) {
    $(id).addEventListener("click", () => resolveUnsaved(value));
  }
  $("dialog-unsaved").addEventListener("close", () => {
    if (unsavedResolve) {
      const resolve = unsavedResolve;
      unsavedResolve = null;
      resolve("cancel");
    }
  });
}

function openDialog(id) {
  const dialog = $(id);
  if (!dialog.open) dialog.showModal();
}

function updateNewChartLabels() {
  const round = $("new-construction").value === "round";
  $("new-height-label").textContent = i18n.t(round ? "chart.new.heightRounds" : "chart.new.height");
}

function openNewDialog() {
  $("new-width").value = "40";
  $("new-height").value = "24";
  $("new-title").value = "";
  $("new-construction").value = isInTheRound(store.chart) ? "round" : "flat";
  updateNewChartLabels();
  openDialog("dialog-new");
}

async function createNewChart() {
  const width = Number($("new-width").value);
  const height = Number($("new-height").value);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 1000 || height > 1000) {
    showToast(i18n.t("error.fix"), "error");
    return;
  }
  const title = $("new-title").value.trim();
  const construction = $("new-construction").value === "round" ? "round" : "flat";
  const chart = createChart({ width, height, title, construction });
  chart.id = storage.makeChartId(title || "chart");
  if (await switchDocument(chart, { save: true, fit: true })) $("dialog-new").close();
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
  const howto = $("help-howto");
  if (howto) howto.href = i18n.language === "de" ? "how-to.de.html" : "how-to.html";
  renderShortcuts();
  openDialog("dialog-help");
}

function openAboutDialog() {
  $("about-version").textContent = `${i18n.t("about.version")} ${APP_VERSION} · ${i18n.t("about.license")}`;
  openDialog("dialog-about");
}

function openTableDialog() {
  renderTable();
  openDialog("dialog-table");
}

function openCustomGroupDialog() {
  $("custom-label").value = "";
  $("custom-span").value = "3";
  $("custom-legend").value = "";
  openDialog("dialog-custom-group");
  $("custom-label").focus();
}

function openCableDialog() {
  // Start from the cable that is active right now, or from the last one the
  // person created. Re-entering the same numbers for every chart is noise.
  const draft = store?.symbol?.id === "cable" ? store.symbol : lastCableDraft;
  $("cable-left").value = String(draft.left || 2);
  $("cable-right").value = String(draft.right || 2);
  $("cable-direction").value = draft.direction === "back" ? "back" : "front";
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
  const legend = $("custom-legend").value.trim();
  if (!label || !Number.isInteger(span) || span < 1 || span > 12) {
    showToast(i18n.t("error.fix"), "error");
    return;
  }
  const group = { label, span, legend };
  rememberCustomGroups([group]);
  store.setSymbol({ id: "custom", span, label, legend });
  store.setTool("pencil");
  $("dialog-custom-group").close();
  revealPaletteEntry("custom", { label, span });
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
  lastCableDraft = { left, right, direction };
  rememberCustomCables([{ left, right, direction }]);
  store.setSymbol({ id: "cable", left, right, direction });
  store.setTool("pencil");
  $("dialog-cable").close();
  revealPaletteEntry("cable", { left, right, direction });
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
  store.edit("Add colour", (chart) => {
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

function unsavedDialog() {
  return new Promise((resolve) => {
    unsavedResolve = resolve;
    openDialog("dialog-unsaved");
  });
}

function resolveUnsaved(value) {
  const resolve = unsavedResolve;
  unsavedResolve = null;
  const dialog = $("dialog-unsaved");
  if (dialog.open) dialog.close();
  if (resolve) resolve(value);
}

/* ------------------------------------------------------------------ */
/* Open / save / export                                                */
/* ------------------------------------------------------------------ */

async function ensureSavedBeforeSwitch() {
  if (!store || !store.dirty) return true;
  if (settings.autosave) {
    const saved = await saveLocal(true);
    if (saved) return true;
  }
  const choice = await unsavedDialog();
  if (choice === "cancel") return false;
  if (choice === "save") return saveLocal(true);
  return choice === "discard";
}

async function switchDocument(chart, { save = false, fit = true } = {}) {
  if (documentSwitchInProgress) return false;
  documentSwitchInProgress = true;
  try {
    saveCoordinator?.cancel();
    if (store.pending) store.commit();
    await saveCoordinator?.wait();
    if (!(await ensureSavedBeforeSwitch())) return false;
    activateChart(chart, { save, fit });
    return true;
  } finally {
    documentSwitchInProgress = false;
  }
}

function activateChart(chart, { save = false, fit = true } = {}) {
  saveCoordinator?.cancel();
  emptyHintDismissed = true;
  writeLocal("stitchwright.emptyHintDismissed", "1");
  customGroups = mergeCustomGroups(customGroups, customGroupsFromChart(chart));
  storage.saveCustomGroups(customGroups);
  customCables = mergeCustomCables(customCables, customCablesFromChart(chart));
  storage.saveCustomCables(customCables);
  store.replace(chart);
  if (fit) canvasView.fit();
  updateEmptyHint();
  if (save) {
    saveLocal(true).then((saved) => {
      if (!saved) {
        store.dirty = true;
        updateSaveIndicator();
        showToast(i18n.t("error.save"), "error");
      }
    });
  }
}

async function loadFromFile(file) {
  try {
    if (file.size > MAX_IMPORT_BYTES) {
      showToast(i18n.t("error.file.size"), "error");
      return;
    }
    const text = await storage.readFileText(file);
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      showToast(i18n.t("error.file.parse"), "error");
      return;
    }
    const rawDiagnostics = validateChart(data, { raw: true });
    if (hasErrors(rawDiagnostics)) {
      const first = rawDiagnostics.find((item) => item.severity === "error");
      showToast(`${i18n.t("error.validation")} ${first.path}: ${first.message}`, "error");
      return;
    }
    const chart = normalizeChart(data);
    const diagnostics = validateChart(chart);
    if (hasErrors(diagnostics)) {
      const first = diagnostics.find((item) => item.severity === "error");
      showToast(`${i18n.t("error.validation")} ${first.path}: ${first.message}`, "error");
      return;
    }
    // Importing must never silently overwrite a different local chart.
    if (chart.id !== store.chart.id) {
      const existing = await storage.loadChart(chart.id).catch(() => null);
      if (existing) chart.id = storage.makeChartId(chart.title || "chart");
    }
    if (await switchDocument(chart, { save: true, fit: true })) {
      $("dialog-open").close();
      showToast(i18n.t("dialog.import.success"));
    }
  } catch (error) {
    console.error(error);
    showToast(error.message || i18n.t("error.file.read"), "error");
  }
}

async function restorePreviousVersion() {
  try {
    const previous = await storage.loadPreviousChart(store.chart.id);
    if (!previous) {
      showToast(i18n.t("dialog.open.noPrevious"), "error");
      return;
    }
    const chart = normalizeChart(previous);
    const diagnostics = validateChart(chart);
    if (hasErrors(diagnostics)) {
      const first = diagnostics.find((item) => item.severity === "error");
      showToast(`${i18n.t("error.validation")} ${first.path}: ${first.message}`, "error");
      return;
    }
    if (await switchDocument(chart, { save: true, fit: true })) $("dialog-open").close();
  } catch (error) {
    console.error(error);
    showToast(i18n.t("error.storage"), "error");
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
        try {
          const loaded = await storage.loadChart(chart.id);
          if (!loaded) return;
          const next = normalizeChart(loaded);
          const diagnostics = validateChart(next);
          if (hasErrors(diagnostics)) {
            const first = diagnostics.find((item) => item.severity === "error");
            showToast(`${i18n.t("error.validation")} ${first.path}: ${first.message}`, "error");
            return;
          }
          if (await switchDocument(next, { fit: true })) $("dialog-open").close();
        } catch (error) {
          console.error(error);
          showToast(error.message || i18n.t("error.file.read"), "error");
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
  if (!saveCoordinator) return false;
  return saveCoordinator.save({ silent });
}

function scheduleAutosave() {
  saveCoordinator?.schedule();
}

async function exportChart(mode) {
  const format = $("export-format").value;
  const includeLegend = $("export-legend").checked;
  const base = safeName(store.chart.title || "strickschrift");
  try {
    if (mode === "print") {
      // Printing is independent of the download format. JSON + Print must
      // still print a chart, not write a file.
      const printSvgText = renderSvg(store.chart, {
        lang: i18n.language,
        unit: settings.units,
        includeLegend
      });
      printSvg(printSvgText, store.chart.options.paper);
      return;
    }
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
    if (format === "svg") {
      await storage.saveTextFile(`${base}.svg`, svg, "image/svg+xml");
    } else if (format === "png") {
      const scale = Number($("export-scale").value) || 2;
      const result = await svgToPngBlob(svg, scale);
      storage.downloadBlob(`${base}.png`, result.blob);
      if (result.capped) showToast(i18n.t("dialog.export.pngLimited"), "info");
    }
    $("dialog-export").close();
  } catch (error) {
    console.error(error);
    showToast(i18n.t("dialog.export.error"), "error");
  }
}

function printSvg(svg, paper = "A4") {
  const win = window.open("", "_blank");
  if (!win) {
    showToast(i18n.t("error.export"), "error");
    return;
  }
  const pageSize = paper && paper !== "auto" ? `size: ${paper};` : "";
  win.document.open();
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Stitchwright</title><style>
    @page { ${pageSize} margin: 10mm; }
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
        if (png) resolve({ blob: png, capped: factor < scale - 1e-9 });
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
  const MAX_TABLE_ROWS = 5000;
  let truncated = false;
  outer:
  for (let row = 1; row <= chart.height; row += 1) {
    for (let col = 1; col <= chart.width; col += 1) {
      if (rows.length >= MAX_TABLE_ROWS) {
        truncated = true;
        break outer;
      }
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
        symbol: cell ? symbolName(cell, i18n.language) : i18n.t("table.knit"),
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
  const rowColumnKey = isInTheRound(chart) ? "dialog.table.round" : "dialog.table.row";
  for (const key of [rowColumnKey, "dialog.table.stitch", "dialog.table.symbol", "dialog.table.color"]) {
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
  if (truncated) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = i18n.t("table.truncated", { count: MAX_TABLE_ROWS });
    wrap.append(p);
  }
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
  const previous = settings.language;
  settings.language = lang;
  storage.saveSettings(settings);
  try {
    await i18n.setLanguage(lang);
  } catch (error) {
    console.warn(error);
    settings.language = previous;
    storage.saveSettings(settings);
    showToast(i18n.t("error.language"), "error");
    populateLanguages();
    return;
  }
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

function setupTabChannel() {
  if (typeof BroadcastChannel === "undefined") return;
  tabChannel = new BroadcastChannel("stitchwright");
  tabChannel.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || data.type !== "saved" || data.tabId === TAB_ID) return;
    if (data.id === store?.chart.id) {
      showToast(i18n.t("error.otherTab"), "error");
    }
  });
}

function setupMedia() {
  const media = window.matchMedia?.("(prefers-color-scheme: dark)");
  media?.addEventListener?.("change", () => {
    if (settings.theme === "system" && canvasView) canvasView.setTheme(canvasTheme());
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && settings.autosave && store?.dirty) saveLocal(true);
  });
  window.addEventListener("beforeunload", (event) => {
    if (!store?.dirty) return;
    event.preventDefault();
    event.returnValue = "";
  });
}

/* ------------------------------------------------------------------ */
/* Keyboard                                                            */
/* ------------------------------------------------------------------ */

function setupKeyboard() {
  window.addEventListener("keydown", (event) => {
    if (event.defaultPrevented) return;
    const target = event.target;
    const canvas = $("chart-canvas");
    const interactive = target instanceof Element
      && target.closest("button, a, input, textarea, select, summary, [contenteditable='true']");
    const typing = target instanceof Element
      && target.closest("input, textarea, select, [contenteditable='true']");
    const canvasFocused = target === canvas || (target instanceof Element && target.closest("#chart-canvas"));
    const inDialog = Boolean(document.querySelector("dialog[open]"));
    if (inDialog) return;
    if (typing) return;

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

    // Native controls must receive Enter, Space and arrows themselves.
    if (interactive && !canvasFocused) return;

    if (key === "?") { event.preventDefault(); openHelpDialog(); return; }
    if (key === "+" || key === "=") { event.preventDefault(); canvasView.zoomBy(1.2); return; }
    if (key === "-") { event.preventDefault(); canvasView.zoomBy(1 / 1.2); return; }
    if (key === "0") { event.preventDefault(); canvasView.fit(); return; }

    if (key === "ArrowUp" || key === "ArrowDown" || key === "ArrowLeft" || key === "ArrowRight"
      || key === " " || key === "Enter" || key === "Delete" || key === "Backspace") {
      if (!canvasFocused) return;
      if (key === "ArrowUp") { event.preventDefault(); canvasView.moveCursor(1, 0); return; }
      if (key === "ArrowDown") { event.preventDefault(); canvasView.moveCursor(-1, 0); return; }
      if (key === "ArrowLeft") { event.preventDefault(); canvasView.moveCursor(0, -1); return; }
      if (key === "ArrowRight") { event.preventDefault(); canvasView.moveCursor(0, 1); return; }
      if (key === " " || key === "Enter") { event.preventDefault(); canvasView.paintCursor(); return; }
      event.preventDefault();
      if (store.headerSelection) {
        deleteSelectedHeader();
        return;
      }
      if (store.tool === "guide") return;
      store.begin("Erase");
      canvasView.eraseAt(store.cursor.row, store.cursor.col);
      store.commit();
      return;
    }
    if (key === "Escape") {
      if (canvasFocused) {
        store.setSelection(null);
        store.setHeaderSelection(null);
      }
      return;
    }

    if (lower === "v") { store.setTool("select"); $("chart-canvas").focus(); return; }
    if (lower === "p") { store.setTool("pencil"); $("chart-canvas").focus(); return; }
    if (lower === "e") { store.setTool("eraser"); $("chart-canvas").focus(); return; }
    if (lower === "h") { store.setTool("pan"); $("chart-canvas").focus(); return; }
    if (lower === "l") { store.setTool("guide"); $("chart-canvas").focus(); return; }
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
    ["L", i18n.t("shortcut.guide")],
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
