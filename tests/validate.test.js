import test from "node:test";
import assert from "node:assert/strict";

import { addGroup, createChart, setCell, setColor } from "../src/core/chart.js";
import { hasErrors, validateChart } from "../src/core/validate.js";

test("a new chart has no errors", () => {
  const chart = createChart({ width: 10, height: 8 });
  const diagnostics = validateChart(chart);
  assert.equal(hasErrors(diagnostics), false);
});

test("wrong schema is an error", () => {
  const chart = createChart({ width: 10, height: 8 });
  chart.schema = "nope/1";
  const diagnostics = validateChart(chart);
  assert.equal(diagnostics.some((item) => item.code === "E_SCHEMA"), true);
});

test("row and cell dimensions are checked", () => {
  const chart = createChart({ width: 10, height: 8 });
  chart.rows[0].pop();
  chart.colors[1].push("A");
  const diagnostics = validateChart(chart);
  assert.equal(diagnostics.some((item) => item.code === "E_ROW_LENGTH"), true);
  assert.equal(diagnostics.some((item) => item.code === "E_COLOR_ROW_LENGTH"), true);
});

test("unknown symbols and multi-cell cells are rejected", () => {
  const chart = createChart({ width: 10, height: 8 });
  chart.rows[0][0] = "nope";
  chart.rows[0][1] = "k2tog";
  const diagnostics = validateChart(chart);
  assert.equal(diagnostics.some((item) => item.code === "E_CELL_SYMBOL"), true);
  assert.equal(diagnostics.some((item) => item.code === "E_CELL_GROUP"), true);
});

test("groups must fit and may not overlap", () => {
  const chart = createChart({ width: 10, height: 8 });
  addGroup(chart, { row: 1, col: 1, symbol: "k2tog" });
  chart.groups.push({ id: "g2", row: 1, col: 2, symbol: "ssk" });
  const diagnostics = validateChart(chart);
  assert.equal(diagnostics.some((item) => item.code === "E_GROUP_OVERLAP"), true);
});

test("group cells must be empty", () => {
  const chart = createChart({ width: 10, height: 8 });
  addGroup(chart, { row: 1, col: 1, symbol: "k2tog" });
  chart.rows[0][0] = "p";
  const diagnostics = validateChart(chart);
  assert.equal(diagnostics.some((item) => item.code === "E_GROUP_CELL"), true);
});

test("colours must exist in the palette", () => {
  const chart = createChart({ width: 10, height: 8 });
  setColor(chart, 1, 1, "A");
  chart.colors[0][1] = "Z";
  const diagnostics = validateChart(chart);
  assert.equal(diagnostics.some((item) => item.code === "E_COLOR_ID"), true);
});

test("repeat range and cell size are checked", () => {
  const chart = createChart({ width: 10, height: 8 });
  chart.options.repeat = { start: 8, end: 4 };
  chart.options.cellMm = 1;
  const diagnostics = validateChart(chart);
  assert.equal(diagnostics.some((item) => item.code === "E_REPEAT_RANGE"), true);
  assert.equal(diagnostics.some((item) => item.code === "E_CELL_MM"), true);
});

test("display options must be booleans", () => {
  const chart = createChart({ width: 10, height: 8 });
  chart.options.showStitchCounts = "yes";
  const diagnostics = validateChart(chart);
  assert.equal(diagnostics.some((item) => (
    item.code === "E_OPTION_BOOL" && item.path === "options.showStitchCounts"
  )), true);
});

test("hidden wrong-side patterning produces a warning", () => {
  const chart = createChart({ width: 10, height: 8 });
  chart.options.rowsMode = "rs";
  setCell(chart, 2, 1, "p");
  const diagnostics = validateChart(chart);
  assert.equal(diagnostics.some((item) => item.code === "W_HIDDEN_WS"), true);
  assert.equal(hasErrors(diagnostics), false);
});

test("construction must be flat or round", () => {
  const chart = createChart({ width: 10, height: 8 });
  chart.options.construction = "tube";
  const diagnostics = validateChart(chart);
  assert.equal(diagnostics.some((item) => item.code === "E_CONSTRUCTION"), true);
});

test("round charts must show all rounds", () => {
  const chart = createChart({ width: 10, height: 8, construction: "round" });
  chart.options.rowsMode = "rs";
  const diagnostics = validateChart(chart);
  assert.equal(diagnostics.some((item) => item.code === "E_ROUND_ROWS_MODE"), true);
  assert.equal(diagnostics.some((item) => item.code === "W_HIDDEN_WS"), false);
});

test("round charts do not warn about hidden wrong-side rows", () => {
  const chart = createChart({ width: 10, height: 8, construction: "round" });
  setCell(chart, 2, 1, "p");
  const diagnostics = validateChart(chart);
  assert.equal(diagnostics.some((item) => item.code === "W_HIDDEN_WS"), false);
  assert.equal(hasErrors(diagnostics), false);
});

test("raw round charts with hidden rows are rejected before normalization", () => {
  const raw = {
    schema: "strickschrift/1",
    width: 2,
    height: 2,
    rows: [[null, null], [null, null]],
    options: { construction: "round", rowsMode: "rs" }
  };
  const diagnostics = validateChart(raw, { raw: true });
  assert.equal(diagnostics.some((item) => item.code === "E_ROUND_ROWS_MODE"), true);
});

test("custom group legend must be a short string", () => {
  const chart = createChart({ width: 10, height: 8 });
  addGroup(chart, { row: 1, col: 1, symbol: "custom", span: 3, label: "TL" });
  chart.groups[0].legend = 42;
  let diagnostics = validateChart(chart);
  assert.equal(diagnostics.some((item) => item.code === "E_CUSTOM_LEGEND"), true);
  chart.groups[0].legend = "x".repeat(161);
  diagnostics = validateChart(chart);
  assert.equal(diagnostics.some((item) => item.code === "E_CUSTOM_LEGEND_LENGTH"), true);
});

test("markers must be unique and inside the chart", () => {
  const chart = createChart({ width: 10, height: 8 });
  chart.options.markers = [2, 2, 10];
  const diagnostics = validateChart(chart);
  assert.equal(diagnostics.some((item) => item.code === "E_MARKER_DUPLICATE"), true);
  assert.equal(diagnostics.some((item) => item.code === "E_MARKER"), true);
});

test("unknown top-level keys are warnings unless strict", () => {
  const chart = createChart({ width: 10, height: 8 });
  chart.something = true;
  assert.equal(validateChart(chart).some((item) => item.code === "W_UNKNOWN_KEY" && item.severity === "warning"), true);
  assert.equal(validateChart(chart, { strict: true }).some((item) => item.code === "W_UNKNOWN_KEY" && item.severity === "error"), true);
});
