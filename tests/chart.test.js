import test from "node:test";
import assert from "node:assert/strict";

import {
  addGroup,
  chartStats,
  copySelection,
  createChart,
  deleteColumn,
  deleteRow,
  eraseCell,
  getCell,
  getColor,
  insertColumn,
  insertRow,
  mirrorHorizontal,
  pasteFragment,
  removeGroupAt,
  resizeChart,
  setCell,
  setColor,
  setMarkerEvery,
  toggleMarker,
  clearMarkers,
  usedLegendKeys
} from "../src/core/chart.js";

test("a new chart is empty and valid-shaped", () => {
  const chart = createChart({ width: 10, height: 6, title: "Test" });
  assert.equal(chart.width, 10);
  assert.equal(chart.height, 6);
  assert.equal(chart.rows.length, 6);
  assert.equal(chart.rows[0].length, 10);
  assert.equal(getCell(chart, 1, 1), null);
  assert.equal(chart.groups.length, 0);
});

test("cells and colours can be set and erased", () => {
  const chart = createChart({ width: 8, height: 8 });
  setCell(chart, 3, 4, "p");
  setColor(chart, 3, 4, "C");
  assert.equal(getCell(chart, 3, 4), "p");
  assert.equal(getColor(chart, 3, 4), "C");
  eraseCell(chart, 3, 4);
  assert.equal(getCell(chart, 3, 4), null);
  assert.equal(getColor(chart, 3, 4), null);
});

test("multi-cell symbols must be groups", () => {
  const chart = createChart({ width: 8, height: 8 });
  assert.throws(() => setCell(chart, 1, 1, "k2tog"), /group/);
  assert.throws(() => setCell(chart, 1, 1, "cable"), /group/);
});

test("a cable occupies its span and rejects overlap", () => {
  const chart = createChart({ width: 12, height: 8 });
  const first = addGroup(chart, { row: 2, col: 3, symbol: "cable", left: 2, right: 2, direction: "front" });
  assert.equal(first.id, "g1");
  assert.equal(first.col, 3);
  assert.throws(
    () => addGroup(chart, { row: 2, col: 5, symbol: "cable", left: 2, right: 2, direction: "back" }),
    /overlap/
  );
  assert.throws(
    () => addGroup(chart, { row: 2, col: 10, symbol: "cable", left: 2, right: 2, direction: "back" }),
    /fit/
  );
});

test("a group cannot cover a filled cell", () => {
  const chart = createChart({ width: 12, height: 8 });
  setCell(chart, 2, 4, "p");
  assert.throws(
    () => addGroup(chart, { row: 2, col: 3, symbol: "cable", left: 2, right: 2, direction: "front" }),
    /cover/
  );
});

test("custom groups keep their legend explanation", () => {
  const chart = createChart({ width: 12, height: 8 });
  const group = addGroup(chart, {
    row: 2,
    col: 3,
    symbol: "custom",
    span: 3,
    label: "TL",
    legend: "zwei Maschen vor die Arbeit"
  });
  assert.equal(group.legend, "zwei Maschen vor die Arbeit");
});

test("erasing a cell removes the group covering it", () => {
  const chart = createChart({ width: 12, height: 8 });
  addGroup(chart, { row: 2, col: 3, symbol: "cable", left: 2, right: 2, direction: "front" });
  assert.equal(removeGroupAt(chart, 2, 4), true);
  assert.equal(chart.groups.length, 0);
});

test("resize keeps the bottom-left corner and reports lost groups", () => {
  const chart = createChart({ width: 8, height: 6 });
  setCell(chart, 1, 1, "p");
  setCell(chart, 6, 8, "yo");
  addGroup(chart, { row: 5, col: 7, symbol: "k2tog" });
  const result = resizeChart(chart, 6, 4);
  assert.equal(chart.width, 6);
  assert.equal(chart.height, 4);
  assert.equal(getCell(chart, 1, 1), "p");
  assert.equal(getCell(chart, 4, 6), null);
  assert.deepEqual(result.removedGroups, ["g1"]);
});

test("insert and delete rows keep groups aligned", () => {
  const chart = createChart({ width: 8, height: 5 });
  addGroup(chart, { row: 3, col: 2, symbol: "k2tog" });
  insertRow(chart, 3, "below");
  assert.equal(chart.groups[0].row, 4);
  deleteRow(chart, 3);
  assert.equal(chart.groups[0].row, 3);
  deleteRow(chart, 3);
  assert.equal(chart.groups.length, 0);
});

test("insert and delete columns keep groups aligned", () => {
  const chart = createChart({ width: 8, height: 5 });
  addGroup(chart, { row: 3, col: 4, symbol: "k2tog" });
  insertColumn(chart, 2, "left");
  assert.equal(chart.groups[0].col, 5);
  deleteColumn(chart, 5);
  assert.equal(chart.groups.length, 0);
});

test("horizontal mirror swaps stitch direction and cable direction", () => {
  const clean = createChart({ width: 6, height: 3 });
  addGroup(clean, { row: 1, col: 1, symbol: "k2tog" });
  addGroup(clean, { row: 2, col: 2, symbol: "cable", left: 2, right: 2, direction: "front" });
  mirrorHorizontal(clean);
  const knot = clean.groups[0];
  const cable = clean.groups[1];
  assert.equal(knot.symbol, "ssk");
  assert.equal(knot.col, 5);
  assert.equal(cable.direction, "back");
});

test("copy and paste a selection", () => {
  const chart = createChart({ width: 8, height: 6 });
  setCell(chart, 1, 1, "p");
  setCell(chart, 2, 2, "yo");
  const fragment = copySelection(chart, 1, 1, 2, 2);
  assert.equal(fragment.width, 2);
  assert.equal(fragment.height, 2);
  pasteFragment(chart, fragment, 4, 4);
  assert.equal(getCell(chart, 4, 4), "p");
  assert.equal(getCell(chart, 5, 5), "yo");
});

test("legend lists used symbols once and includes colours", () => {
  const chart = createChart({ width: 8, height: 6 });
  setCell(chart, 1, 1, "p");
  setCell(chart, 1, 2, "p");
  setColor(chart, 1, 2, "C");
  addGroup(chart, { row: 2, col: 3, symbol: "cable", left: 2, right: 2, direction: "front" });
  const entries = usedLegendKeys(chart);
  assert.equal(entries.filter((entry) => entry.kind === "cell").length, 1);
  assert.equal(entries.filter((entry) => entry.kind === "group").length, 1);
  assert.equal(entries.filter((entry) => entry.kind === "color").length, 1);
});

test("stats count symbols, colours and groups", () => {
  const chart = createChart({ width: 8, height: 6 });
  setCell(chart, 1, 1, "p");
  setColor(chart, 1, 1, "C");
  addGroup(chart, { row: 2, col: 1, symbol: "k2tog" });
  const stats = chartStats(chart);
  assert.equal(stats.width, 8);
  assert.equal(stats.height, 6);
  assert.equal(stats.symbols, 1);
  assert.equal(stats.colored, 1);
  assert.equal(stats.groups, 1);
});

test("stitch markers can be set, toggled and cleared", () => {
  const chart = createChart({ width: 12, height: 6 });
  assert.deepEqual(setMarkerEvery(chart, 5), [5, 10]);
  assert.deepEqual(chart.options.markers, [5, 10]);
  assert.equal(toggleMarker(chart, 5), true);
  assert.deepEqual(chart.options.markers, [10]);
  assert.equal(toggleMarker(chart, 12), false);
  clearMarkers(chart);
  assert.deepEqual(chart.options.markers, []);
});

test("markers follow column inserts, deletes and mirrors", () => {
  const chart = createChart({ width: 10, height: 6 });
  chart.options.markers = [3, 7];
  insertColumn(chart, 2, "left");
  assert.deepEqual(chart.options.markers, [4, 8]);
  deleteColumn(chart, 5);
  assert.deepEqual(chart.options.markers, [4, 7]);
  mirrorHorizontal(chart);
  assert.deepEqual(chart.options.markers, [3, 6]);
  resizeChart(chart, 6, 6);
  assert.deepEqual(chart.options.markers, [3]);
});
