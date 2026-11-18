import test from "node:test";
import assert from "node:assert/strict";

import { addGroup, createChart, setCell, setColor } from "../src/core/chart.js";
import { renderSvg } from "../src/core/render-svg.js";

function sample() {
  const chart = createChart({ width: 12, height: 8, title: "Testchart" });
  chart.options.subtitle = "Untertitel";
  chart.options.repeat = { start: 2, end: 5 };
  setCell(chart, 1, 1, "p");
  setCell(chart, 1, 2, "yo");
  setColor(chart, 1, 2, "C");
  addGroup(chart, { row: 3, col: 3, symbol: "cable", left: 2, right: 2, direction: "front" });
  addGroup(chart, { row: 4, col: 6, symbol: "k2tog" });
  return chart;
}

test("SVG contains title, grid, symbols and legend", () => {
  const svg = renderSvg(sample());
  assert.match(svg, /^<svg /);
  assert.match(svg, /Testchart/);
  assert.match(svg, /Untertitel/);
  assert.match(svg, /sym-p/);
  assert.match(svg, /Legende/);
  assert.match(svg, /C0392B/i);
});

test("SVG uses millimetres based on cell size", () => {
  const chart = sample();
  const svg = renderSvg(chart);
  assert.match(svg, /width="\d+\.\d+mm"/);
  assert.match(svg, /height="\d+\.\d+mm"/);
});

test("rows mode rs hides even rows and numbers odd rows", () => {
  const chart = sample();
  chart.options.rowsMode = "rs";
  const svg = renderSvg(chart);
  // Row numbers live at x=36 (chartX - 8). Even rows must not appear there.
  assert.match(svg, /x="36"[^>]*>1<\/text>/);
  assert.match(svg, /x="36"[^>]*>3<\/text>/);
  assert.doesNotMatch(svg, /x="36"[^>]*>2<\/text>/);
});

test("legend can be disabled", () => {
  const chart = sample();
  const svg = renderSvg(chart, { includeLegend: false });
  assert.doesNotMatch(svg, /Legende/);
});

test("colour contrast chooses readable glyph colour", () => {
  const chart = sample();
  setColor(chart, 1, 1, "B"); // near black
  const svg = renderSvg(chart);
  assert.match(svg, /color="#ffffff"/);
});

test("custom groups are labelled in the legend", () => {
  const chart = createChart({ width: 8, height: 4 });
  addGroup(chart, { row: 1, col: 1, symbol: "custom", span: 3, label: "TL" });
  const svg = renderSvg(chart);
  assert.match(svg, /TL/);
});
