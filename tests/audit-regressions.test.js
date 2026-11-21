import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

import {
  addGroup,
  createChart,
  copySelection,
  deleteColumn,
  getColor,
  insertColumn,
  mirrorHorizontal,
  normalizeChart,
  paintCell,
  pasteFragment,
  resizeChart,
  setCell,
  setColor,
  columnToStitch,
  stitchToColumn
} from "../src/core/chart.js";
import { hasErrors, validateChart } from "../src/core/validate.js";
import { contrastColor, backgroundFor, groupBackground, groupContrast } from "../src/core/color.js";
import { legendEntries } from "../src/core/legend.js";
import { cableGlyph } from "../src/core/symbols.js";
import { renderSvg } from "../src/core/render-svg.js";
import { Store } from "../src/ui/store.js";
import { CanvasView } from "../src/ui/canvas-view.js";
import { loadCustomGroups } from "../src/ui/persistence.js";

function errors(chart) {
  return validateChart(chart).filter((item) => item.severity === "error");
}

function viewFor(store) {
  const reported = [];
  const view = new CanvasView({
    canvas: { getContext: () => ({}), addEventListener() {}, style: {} },
    wrap: {},
    store,
    onError: (error) => reported.push(error.message)
  });
  return { view, reported };
}

test("SW-01: replacing a document clears undo and transient state", () => {
  const a = createChart({ width: 4, height: 4 });
  a.id = "A";
  const store = new Store(a);
  store.edit("draw", (chart) => setCell(chart, 1, 1, "p"));
  store.setCursor({ row: 4, col: 4 });
  store.setColor("Z");
  const b = createChart({ width: 2, height: 2 });
  b.id = "B";
  store.replace(b);
  assert.equal(store.undo(), false);
  assert.equal(store.chart.id, "B");
  assert.deepEqual(store.cursor, { row: 1, col: 2 });
  assert.equal(store.color, null);
});

test("SW-03: only the exact saved revision becomes clean", () => {
  const store = new Store(createChart({ width: 4, height: 4 }));
  store.edit("draw", (chart) => setCell(chart, 1, 1, "p"));
  const revision = store.revision;
  assert.equal(store.markSaved(revision - 1), false);
  assert.equal(store.dirty, true);
  assert.equal(store.markSaved(revision), true);
  assert.equal(store.dirty, false);
  assert.equal(store.savedRevision, revision);
  store.edit("draw again", (chart) => setCell(chart, 1, 2, "p"));
  assert.equal(store.markSaved(revision, store.chart.id), false);
  assert.equal(store.dirty, true);
});

test("SW-04: repeated cable placements get unique instance ids", () => {
  const store = new Store(createChart({ width: 8, height: 4 }));
  store.setSymbol({ id: "cable", left: 2, right: 2, direction: "front" });
  const { view, reported } = viewFor(store);
  for (const row of [1, 2]) {
    view.startGesture("paint", { row, col: 1 });
    view.paintAt(row, 1);
    view.commitGesture();
  }
  assert.deepEqual(store.chart.groups.map((group) => group.id), ["g1", "g2"]);
  assert.deepEqual(errors(store.chart), []);
  assert.deepEqual(reported, []);
});

test("SW-04: addGroup rejects an explicit duplicate id", () => {
  const chart = createChart({ width: 8, height: 4 });
  addGroup(chart, { id: "g1", row: 1, col: 1, symbol: "k2tog" });
  assert.throws(
    () => addGroup(chart, { id: "g1", row: 2, col: 1, symbol: "k2tog" }),
    /Duplicate group id/
  );
});

test("SW-05: keyboard cursor group placement is atomic and undoable", () => {
  const store = new Store(createChart({ width: 8, height: 4 }));
  store.setSymbol({ id: "cable", left: 2, right: 2, direction: "front" });
  const { view, reported } = viewFor(store);
  view.paintCursor();
  assert.equal(store.chart.groups.length, 1);
  assert.equal(store.undoStack.length, 1);
  assert.equal(store.dirty, true);
  assert.deepEqual(reported, []);
  assert.equal(store.undo(), true);
  assert.equal(store.chart.groups.length, 0);
});

test("SW-05: marker tool places a marker from the keyboard path", () => {
  const store = new Store(createChart({ width: 8, height: 4 }));
  store.setCursor({ row: 1, col: 3 });
  store.setTool("marker");
  const { view } = viewFor(store);
  view.paintCursor();
  assert.deepEqual(store.chart.options.markers, [3]);
});

test("SW-06: normalization rejects broken structure instead of repairing it", () => {
  const raw = createChart({ width: 4, height: 4 });
  raw.groups = "broken";
  raw.futureField = { keep: true };
  delete raw.schema;
  assert.throws(() => normalizeChart(raw), /Expected schema/);
  const rawDiagnostics = validateChart(raw, { raw: true, strict: true });
  assert.ok(rawDiagnostics.some((item) => item.code === "E_SCHEMA"));
  assert.ok(rawDiagnostics.some((item) => item.code === "E_GROUPS"));
  assert.ok(rawDiagnostics.some((item) => item.code === "W_UNKNOWN_KEY" && item.severity === "error"));
});

test("SW-06: unknown fields survive normalization and strict validation", () => {
  const raw = createChart({ width: 4, height: 4 });
  raw.futureField = { keep: true };
  const chart = normalizeChart(raw);
  assert.deepEqual(chart.futureField, { keep: true });
  assert.ok(validateChart(chart, { strict: true }).some((item) => (
    item.code === "W_UNKNOWN_KEY" && item.severity === "error"
  )));
});

test("SW-07: validator never throws on malformed structures", () => {
  const chart = createChart({ width: 4, height: 4 });
  chart.rows = 42;
  const diagnostics = validateChart(chart);
  assert.ok(diagnostics.some((item) => item.code === "E_ROWS"));
  chart.rows = [null, "broken"];
  assert.doesNotThrow(() => validateChart(chart));
  chart.options = 42;
  assert.doesNotThrow(() => validateChart(chart));
});

test("SW-08: inherited object keys are not symbols", () => {
  const chart = createChart({ width: 4, height: 4 });
  chart.rows[0][0] = "constructor";
  const diagnostics = validateChart(chart);
  assert.ok(diagnostics.some((item) => item.code === "E_CELL_SYMBOL"));
  assert.throws(() => addGroup(chart, { row: 2, col: 1, symbol: "toString" }), /Unknown symbol/);
});

test("SW-09: dimensions are checked before allocation", () => {
  assert.throws(() => createChart({ width: 0, height: 1 }), /between 1 and 1000/);
  assert.throws(() => createChart({ width: 1001, height: 1 }), /between 1 and 1000/);
  const chart = createChart({ width: 4, height: 4 });
  assert.throws(() => resizeChart(chart, 1001, 4), /Invalid chart size/);
  const max = createChart({ width: 1000, height: 1 });
  assert.equal(errors(max).length, 0);
});

test("SW-10: structural edits keep repeat bounds valid", () => {
  const chart = createChart({ width: 10, height: 4 });
  chart.options.repeat = { start: 7, end: 10 };
  resizeChart(chart, 5, 4);
  assert.equal(chart.options.repeat, null);
  assert.deepEqual(errors(chart), []);

  const inserted = createChart({ width: 10, height: 4 });
  inserted.options.repeat = { start: 3, end: 6 };
  insertColumn(inserted, 4, "left");
  assert.deepEqual(inserted.options.repeat, { start: 3, end: 7 });
  deleteColumn(inserted, 3);
  assert.deepEqual(inserted.options.repeat, { start: 3, end: 6 });
  assert.deepEqual(errors(inserted), []);
});

test("SW-11: asymmetric cables swap left and right on mirror", () => {
  const chart = createChart({ width: 8, height: 4 });
  addGroup(chart, { row: 1, col: 1, symbol: "cable", left: 1, right: 3, direction: "front" });
  mirrorHorizontal(chart);
  const group = chart.groups[0];
  assert.equal(group.left, 3);
  assert.equal(group.right, 1);
  assert.equal(group.direction, "back");
  mirrorHorizontal(chart);
  assert.equal(chart.groups[0].left, 1);
  assert.equal(chart.groups[0].right, 3);
  assert.equal(chart.groups[0].direction, "front");
});

test("SW-34: picture columns and knitter stitch numbers round-trip", () => {
  const chart = createChart({ width: 10, height: 4 });
  assert.equal(columnToStitch(chart, 1), 10);
  assert.equal(columnToStitch(chart, 10), 1);
  for (let col = 1; col <= 10; col += 1) {
    assert.equal(stitchToColumn(chart, columnToStitch(chart, col)), col);
  }
});

test("SW-12: hidden wrong-side groups produce a warning", () => {
  const chart = createChart({ width: 8, height: 4 });
  chart.options.rowsMode = "rs";
  addGroup(chart, { row: 2, col: 1, symbol: "k2tog" });
  assert.ok(validateChart(chart).some((item) => item.code === "W_HIDDEN_WS"));
});

test("SW-13: custom groups with different meaning stay separate", () => {
  const chart = createChart({ width: 8, height: 4 });
  addGroup(chart, { row: 1, col: 1, symbol: "custom", span: 2, label: "X", legend: "first meaning" });
  addGroup(chart, { row: 2, col: 1, symbol: "custom", span: 3, label: "X", legend: "different meaning" });
  const entries = legendEntries(chart);
  assert.equal(entries.length, 2);
  assert.deepEqual(entries.map((entry) => entry.text), ["first meaning", "different meaning"]);
});

test("SW-13: labels with separators cannot collide", () => {
  const chart = createChart({ width: 8, height: 4 });
  addGroup(chart, { row: 1, col: 1, symbol: "custom", span: 2, label: "A:B", legend: "one" });
  addGroup(chart, { row: 2, col: 1, symbol: "custom", span: 2, label: "A", legend: "B:one" });
  assert.equal(legendEntries(chart).length, 2);
});

test("SW-14: custom group library keeps legend notes", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  try {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key) => key.endsWith(".v2")
          ? JSON.stringify({ version: 2, groups: [{ label: "X", span: 2, legend: "keep this" }] })
          : null,
        setItem: () => {}
      }
    });
    assert.deepEqual(loadCustomGroups(), [{ label: "X", span: 2, legend: "keep this" }]);
  } finally {
    if (previous === undefined) delete globalThis.localStorage;
    else Object.defineProperty(globalThis, "localStorage", previous);
  }
});

test("SW-15: pasted fragments carry their palette", () => {
  const a = createChart({ width: 4, height: 4 });
  a.palette.push({ id: "Z", name: "Z", hex: "#123456" });
  setColor(a, 1, 1, "Z");
  const fragment = copySelection(a, 1, 1, 1, 1);
  const b = createChart({ width: 4, height: 4 });
  pasteFragment(b, fragment, 1, 1);
  assert.equal(getColor(b, 1, 1), "Z");
  assert.ok(b.palette.some((entry) => entry.id === "Z" && entry.hex === "#123456"));
  assert.deepEqual(errors(b), []);
});

test("SW-15: conflicting palette ids are remapped", () => {
  const a = createChart({ width: 4, height: 4 });
  a.palette.push({ id: "Z", name: "A red", hex: "#123456" });
  setColor(a, 1, 1, "Z");
  const fragment = copySelection(a, 1, 1, 1, 1);
  const b = createChart({ width: 4, height: 4 });
  b.palette.push({ id: "Z", name: "B blue", hex: "#654321" });
  pasteFragment(b, fragment, 1, 1);
  const id = getColor(b, 1, 1);
  assert.notEqual(id, "Z");
  assert.equal(b.palette.find((entry) => entry.id === id).hex, "#123456");
  assert.deepEqual(errors(b), []);
});

test("SW-16: knit brush removes a group underneath", () => {
  const store = new Store(createChart({ width: 8, height: 4 }));
  addGroup(store.chart, { row: 1, col: 1, symbol: "k2tog" });
  const { view } = viewFor(store);
  view.startGesture("paint", { row: 1, col: 1 });
  view.paintAt(1, 1);
  view.commitGesture();
  assert.equal(store.chart.groups.length, 0);
});

test("SW-21: contrast chooses the readable colour", () => {
  assert.equal(contrastColor("#aaaaaa"), "#111111");
  const chart = createChart({ width: 2, height: 2 });
  setCell(chart, 1, 1, "nostitch");
  assert.equal(backgroundFor(chart, 1, 1), "#e6e6e6");
  assert.equal(contrastColor(backgroundFor(chart, 1, 1)), "#111111");
});

test("SW-21: multi-colour groups use a neutral halo and worst-case contrast", () => {
  const chart = createChart({ width: 4, height: 2 });
  setColor(chart, 1, 1, "B");
  setColor(chart, 1, 2, "A");
  const group = addGroup(chart, { row: 1, col: 1, symbol: "custom", span: 2, label: "X" });
  assert.equal(groupBackground(chart, group), "#ffffff");
  assert.equal(groupContrast(chart, group), "#111111");
});

test("SW-22: a plain knit chart gets a legend explanation", () => {
  const entries = legendEntries(createChart({ width: 4, height: 4 }));
  assert.equal(entries.length, 1);
  assert.equal(entries[0].kind, "blank");
  assert.equal(entries[0].name, "knit");
});

test("SW-23: legend override works in both directions", () => {
  const chart = createChart({ width: 4, height: 4 });
  chart.options.showLegend = false;
  assert.match(renderSvg(chart, { includeLegend: true }), /Legend/);
  assert.doesNotMatch(renderSvg(chart, { includeLegend: false }), /Legend/);
});

test("SW-20: long legend text stays inside the SVG viewBox", () => {
  const chart = createChart({ width: 1, height: 1 });
  addGroup(chart, {
    row: 1,
    col: 1,
    symbol: "custom",
    span: 1,
    label: "X",
    legend: "a very long explanation ".repeat(8).trim().slice(0, 160)
  });
  const svg = renderSvg(chart);
  const viewBox = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  assert.ok(viewBox);
  assert.ok(Number(viewBox[1]) >= 500);
  assert.doesNotMatch(svg, /undefined/);
});

test("SW-19: right-side row numbers follow visible rows", () => {
  const chart = createChart({ width: 10, height: 100 });
  chart.options.rowsMode = "rs";
  const svg = renderSvg(chart);
  const numbers = [...svg.matchAll(/x="36"[^>]*>(\d+)<\/text>/g)].map((match) => Number(match[1]));
  assert.ok(numbers.length > 1);
  assert.equal(numbers[0], 1);
  assert.ok(numbers.every((value) => value % 2 === 1));
});

test("SW-30: model edits update meta.modified", () => {
  const chart = createChart({ width: 4, height: 4 });
  const before = chart.meta.modified;
  setCell(chart, 1, 1, "p");
  assert.notEqual(chart.meta.modified, before);
});

test("SW-37: even 12/12 cable glyphs stay inside the row", () => {
  const glyph = cableGlyph({ left: 12, right: 12, direction: "front" });
  const paths = glyph.filter((primitive) => primitive.type === "path");
  assert.ok(paths.length > 0);
  for (const primitive of paths) {
    const pairs = [...primitive.d.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)];
    for (const [, x, y] of pairs) {
      const ny = Number(y);
      assert.ok(ny >= -0.02 && ny <= 1.02, `y=${ny} in ${primitive.d}`);
    }
  }
});

test("SW-33: failed paint leaves cell, colour and group unchanged", () => {
  const chart = createChart({ width: 8, height: 4 });
  addGroup(chart, { row: 1, col: 1, symbol: "k2tog" });
  const before = JSON.stringify(chart);
  assert.throws(() => paintCell(chart, 1, 1, null, "NOT_A_COLOUR"), /Unknown colour/);
  assert.equal(JSON.stringify(chart), before);
});

test("SW-33: failed paste leaves the document unchanged", () => {
  const chart = createChart({ width: 4, height: 4 });
  const fragment = {
    width: 1,
    height: 1,
    rows: [["cable"]],
    colors: [[null]],
    groups: []
  };
  const before = JSON.stringify(chart);
  assert.throws(() => pasteFragment(chart, fragment, 1, 1), /unknown symbol/);
  assert.equal(JSON.stringify(chart), before);
});

test("SW-24: failed SW install does not activate or delete foreign caches", async () => {
  const handlers = {};
  const deleted = [];
  let skipped = false;
  let claimed = false;
  vm.runInNewContext(fs.readFileSync(new URL("../sw.js", import.meta.url), "utf8"), {
    self: {
      addEventListener: (type, handler) => { handlers[type] = handler; },
      skipWaiting: async () => { skipped = true; },
      clients: { claim: async () => { claimed = true; } }
    },
    caches: {
      open: async () => ({ add: async () => { throw new Error("network down"); } }),
      keys: async () => ["other-app-v1", "stitchwright-v0.2.0", "stitchwright-v0.3.1", "stitchwright-v0.4.0", "stitchwright-v0.5.0", "stitchwright-v0.5.1"],
      delete: async (key) => { deleted.push(key); return true; }
    }
  });
  let operation;
  handlers.install({ waitUntil: (promise) => { operation = promise; } });
  await assert.rejects(operation, /network down/);
  assert.equal(skipped, false);
  handlers.activate({ waitUntil: (promise) => { operation = promise; } });
  await operation;
  assert.deepEqual(deleted, ["stitchwright-v0.2.0", "stitchwright-v0.3.1", "stitchwright-v0.4.0", "stitchwright-v0.5.0"]);
  assert.equal(claimed, true);
});
