/**
 * Read-only audit probes, not regression tests.
 * Run from any directory: node docs/audits/2026-11-19-probes.mjs
 * Outputs observations of synthetic data. No browser/user data is touched.
 * After fixes the observations SHOULD change; do not preserve these bugs.
 */
import * as model from "../../src/core/chart.js";
import { validateChart } from "../../src/core/validate.js";
import { legendEntries } from "../../src/core/legend.js";
import { renderSvg } from "../../src/core/render-svg.js";
import { contrastColor, luminance } from "../../src/core/color.js";
import { Store } from "../../src/ui/store.js";
import { CanvasView } from "../../src/ui/canvas-view.js";
import { loadCustomGroups } from "../../src/ui/persistence.js";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const results = {};
const fresh = () => model.createChart({ width: 10, height: 4 });
const errors = chart => validateChart(chart).filter(d => d.severity === "error").map(d => d.code);
function probe(id, run) {
  try { results[id] = run(); }
  catch (error) { results[id] = { thrown: error.message }; }
}
function viewFor(store) {
  const reportedErrors = [];
  const view = new CanvasView({
    canvas: { getContext: () => ({}) }, wrap: {}, store,
    onError: error => reportedErrors.push(error.message)
  });
  return { view, reportedErrors };
}

probe("SW-01", () => {
  const a = fresh(); a.id = "A";
  const store = new Store(a);
  store.edit("draw", chart => model.setCell(chart, 1, 1, "p"));
  const b = fresh(); b.id = "B";
  store.replace(b); store.undo();
  return { documentAfterUndo: store.chart.id, expected: "B" };
});
probe("SW-04", () => {
  const store = new Store(fresh());
  store.setSymbol({ id: "cable", left: 2, right: 2, direction: "front" });
  const { view } = viewFor(store);
  for (const row of [1, 2]) {
    view.startGesture("paint", { row, col: 1 });
    view.paintAt(row, 1); view.commitGesture();
  }
  return { ids: store.chart.groups.map(g => g.id), errors: errors(store.chart) };
});
probe("SW-05", () => {
  const store = new Store(fresh());
  store.setSymbol({ id: "cable", left: 2, right: 2, direction: "front" });
  const { view, reportedErrors } = viewFor(store);
  view.paintCursor();
  return { groups: store.chart.groups.length, undoEntries: store.undoStack.length,
    dirty: store.dirty, reportedErrors };
});
probe("SW-06", () => {
  const raw = fresh();
  raw.futureField = { keep: true }; raw.groups = "broken"; delete raw.schema;
  const normalized = model.normalizeChart(raw);
  return { schema: normalized.schema, groups: normalized.groups,
    keptUnknownField: Object.hasOwn(normalized, "futureField"),
    strictErrors: validateChart(normalized, { strict: true }).filter(d => d.severity === "error") };
});
probe("SW-07", () => {
  const chart = fresh(); chart.rows = 42;
  return validateChart(chart);
});
probe("SW-08", () => {
  const chart = fresh(); chart.rows[0][0] = "constructor";
  const acceptedErrors = errors(chart);
  let legendError;
  try { legendEntries(chart); } catch (error) { legendError = error.message; }
  return { acceptedErrors, legendError };
});
probe("SW-09", () => {
  const chart = model.createChart({ width: 0, height: 1 });
  return { width: chart.width, errors: errors(chart) };
});
probe("SW-10", () => {
  const chart = fresh(); chart.options.repeat = { start: 7, end: 10 };
  model.resizeChart(chart, 5, 4);
  return { repeat: chart.options.repeat, errors: errors(chart) };
});
probe("SW-11", () => {
  const chart = fresh();
  model.addGroup(chart, { row: 1, col: 1, symbol: "cable", left: 1, right: 3, direction: "front" });
  model.mirrorHorizontal(chart);
  return chart.groups[0];
});
probe("SW-12", () => {
  const chart = fresh(); chart.options.rowsMode = "rs";
  model.addGroup(chart, { row: 2, col: 1, symbol: "k2tog" });
  return { diagnostics: validateChart(chart) };
});
probe("SW-13", () => {
  const chart = fresh();
  for (const [row, span, legend] of [[1, 2, "first meaning"], [2, 3, "different meaning"]]) {
    model.addGroup(chart, { row, col: 1, symbol: "custom", span, label: "X", legend });
  }
  return legendEntries(chart).map(e => ({ name: e.name, text: e.text, span: e.span }));
});
probe("SW-14", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  try {
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
      getItem: () => JSON.stringify([{ label: "X", span: 2, legend: "keep this" }])
    } });
    return loadCustomGroups();
  } finally {
    if (previous === undefined) delete globalThis.localStorage;
    else Object.defineProperty(globalThis, "localStorage", previous);
  }
});
probe("SW-15", () => {
  const a = fresh(); a.palette.push({ id: "Z", name: "Z", hex: "#123456" });
  model.setColor(a, 1, 1, "Z");
  const fragment = model.copySelection(a, 1, 1, 1, 1);
  const b = fresh(); model.pasteFragment(b, fragment, 1, 1);
  return { pastedColor: b.colors[0][0], errors: errors(b) };
});
probe("SW-16", () => {
  const store = new Store(fresh());
  model.addGroup(store.chart, { row: 1, col: 1, symbol: "k2tog" });
  const { view } = viewFor(store);
  view.startGesture("paint", { row: 1, col: 1 });
  view.paintAt(1, 1); view.commitGesture();
  return { remainingGroupsAfterKnitPaint: store.chart.groups.length };
});
probe("SW-19", () => {
  const chart = model.createChart({ width: 10, height: 100 });
  chart.options.rowsMode = "rs";
  const svg = renderSvg(chart);
  return { visibleRowNumbers: [...svg.matchAll(/<text x="36"[^>]*>(\d+)<\/text>/g)].map(m => Number(m[1])) };
});
probe("SW-21", () => {
  const hex = "#aaaaaa";
  const chosen = contrastColor(hex);
  const a = luminance(hex), b = luminance(chosen);
  return { background: hex, chosen, contrastRatio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
});
probe("SW-22", () => ({ blankChartLegend: legendEntries(fresh()) }));
probe("SW-25", () => {
  const store = new Store(model.createChart({ width: 1000, height: 1000 }));
  const before = performance.now();
  for (let i = 0; i < 6; i++) {
    store.edit("single cell", chart => model.setCell(chart, 1, i + 1, "p"));
  }
  return { edits: 6, elapsedMs: Math.round(performance.now() - before),
    retainedSnapshots: store.undoStack.length,
    retainedJsonCharacters: store.undoStack.reduce((sum, e) => sum + JSON.stringify(e.before).length, 0),
    declaredBudgetBytes: 40 * 1024 * 1024 };
});
probe("SW-30", () => {
  const chart = fresh(); const before = chart.meta.modified;
  model.setCell(chart, 1, 1, "p");
  return { modifiedUnchanged: before === chart.meta.modified };
});
// Service-worker lifecycle in a sandbox. All cache operations are mocks.
{
  const handlers = {}, deleted = [];
  let skipped = false, claimed = false;
  vm.runInNewContext(readFileSync(new URL("../../sw.js", import.meta.url), "utf8"), {
    self: {
      addEventListener: (type, handler) => { handlers[type] = handler; },
      skipWaiting: async () => { skipped = true; },
      clients: { claim: async () => { claimed = true; } }
    },
    caches: {
      open: async () => ({ add: async () => { throw new Error("Network unavailable"); } }),
      keys: async () => ["other-app-v1", "stitchwright-v0.2.0", "stitchwright-v0.3.0"],
      delete: async key => { deleted.push(key); return true; }
    }
  });
  let operation;
  handlers.install({ waitUntil: promise => { operation = promise; } });
  await operation;
  handlers.activate({ waitUntil: promise => { operation = promise; } });
  await operation;
  results["SW-24"] = { installedDespiteAllAssetsFailing: skipped, deletedCacheNames: deleted, claimed };
}
console.log(JSON.stringify({ node: process.version, results }, null, 2));
