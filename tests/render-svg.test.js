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
  assert.match(svg, /Legend/);
  assert.match(svg, /C0392B/i);
});

test("SVG uses millimetres based on cell size", () => {
  const chart = sample();
  const svg = renderSvg(chart);
  assert.match(svg, /width="\d+\.\d+mm"/);
  assert.match(svg, /height="\d+\.\d+mm"/);
});

test("rows mode rs hides even rows and keeps odd numbers on the right", () => {
  const chart = sample();
  chart.options.rowsMode = "rs";
  const svg = renderSvg(chart);
  // Right-side rows start at the right edge (x=340); even rows are not rendered.
  assert.match(svg, /x="340"[^>]*>1<\/text>/);
  assert.match(svg, /x="340"[^>]*>3<\/text>/);
  assert.doesNotMatch(svg, /x="340"[^>]*>2<\/text>/);
  assert.doesNotMatch(svg, /x="36"[^>]*>1<\/text>/);
});

test("round charts show every round number on the right", () => {
  const chart = sample();
  chart.options.construction = "round";
  chart.options.rowsMode = "rs"; // defensive: round must still show all rounds
  const svg = renderSvg(chart);
  assert.match(svg, /x="340"[^>]*>2<\/text>/);
});

test("row numbers alternate sides in flat charts", () => {
  const chart = sample();
  const svg = renderSvg(chart);
  // Odd rows start on the right (x=340), even rows on the left (x=36).
  assert.match(svg, /x="340"[^>]*>7<\/text>/);
  assert.match(svg, /x="36"[^>]*>8<\/text>/);
  assert.doesNotMatch(svg, /x="36"[^>]*>7<\/text>/);
  assert.doesNotMatch(svg, /x="340"[^>]*>8<\/text>/);
});

test("stitch numbers appear above and below the grid", () => {
  const chart = sample();
  const svg = renderSvg(chart);
  // chartY is 72, chartH is 8 * 24 = 192.
  assert.match(svg, /y="64"[^>]*>12<\/text>/);
  assert.match(svg, /y="282"[^>]*>12<\/text>/);
});

test("legend can be disabled", () => {
  const chart = sample();
  const svg = renderSvg(chart, { includeLegend: false });
  assert.doesNotMatch(svg, /Legend/);
});

test("stitch counts are optional and render as small numbers", () => {
  const chart = sample();
  chart.options.showStitchCounts = true;
  assert.match(renderSvg(chart), /font-size="6\.24"/);
  chart.options.showStitchCounts = false;
  assert.doesNotMatch(renderSvg(chart), /font-size="6\.24"/);
});

test("SVG follows the language option", () => {
  const svg = renderSvg(sample(), { lang: "de" });
  assert.match(svg, /Legende/);
  assert.match(svg, /Raster/);
});

test("colour contrast chooses readable glyph colour", () => {
  const chart = sample();
  setColor(chart, 1, 1, "B"); // near black
  const svg = renderSvg(chart);
  assert.match(svg, /color="#ffffff"/);
});

test("custom groups are labelled in the legend", () => {
  const chart = createChart({ width: 8, height: 4 });
  addGroup(chart, {
    row: 1,
    col: 1,
    symbol: "custom",
    span: 3,
    label: "TL",
    legend: "zwei Maschen vor die Arbeit"
  });
  const svg = renderSvg(chart);
  assert.match(svg, /TL/);
  assert.match(svg, /zwei Maschen vor die Arbeit/);
});

test("stitch markers are exported as dashed guides", () => {
  const chart = sample();
  chart.options.markers = [3, 6];
  const svg = renderSvg(chart);
  assert.match(svg, /stroke-dasharray="4 4"/);
  assert.match(svg, /#7c3aed/);
});
