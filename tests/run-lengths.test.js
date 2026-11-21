import test from "node:test";
import assert from "node:assert/strict";

import { addGroup, createChart, paintCell, setColor } from "../src/core/chart.js";
import { stitchCountRuns } from "../src/core/run-lengths.js";

test("runs are read right to left and labelled at the first stitch", () => {
  const chart = createChart({ width: 8, height: 1 });
  paintCell(chart, 1, 5, "p", null);
  const labels = stitchCountRuns(chart);
  assert.deepEqual(labels, [
    { row: 1, col: 8, count: 3 },
    { row: 1, col: 4, count: 4 }
  ]);
});

test("adjacent equal symbols form one run", () => {
  const chart = createChart({ width: 8, height: 1 });
  paintCell(chart, 1, 5, "p", null);
  paintCell(chart, 1, 4, "p", null);
  const labels = stitchCountRuns(chart);
  assert.deepEqual(labels, [
    { row: 1, col: 8, count: 3 },
    { row: 1, col: 5, count: 2 },
    { row: 1, col: 3, count: 3 }
  ]);
});

test("a group breaks the run and is not counted", () => {
  const chart = createChart({ width: 8, height: 1 });
  addGroup(chart, { symbol: "cable", left: 2, right: 1, direction: "front", row: 1, col: 3 });
  const labels = stitchCountRuns(chart);
  assert.deepEqual(labels, [
    { row: 1, col: 8, count: 3 },
    { row: 1, col: 2, count: 2 }
  ]);
});

test("a colour change starts a new run", () => {
  const chart = createChart({ width: 4, height: 1 });
  paintCell(chart, 1, 4, "p", null);
  paintCell(chart, 1, 3, "p", null);
  setColor(chart, 1, 4, "A");
  setColor(chart, 1, 3, "B");
  assert.deepEqual(stitchCountRuns(chart), [{ row: 1, col: 2, count: 2 }]);
  setColor(chart, 1, 3, "A");
  assert.deepEqual(stitchCountRuns(chart), [
    { row: 1, col: 4, count: 2 },
    { row: 1, col: 2, count: 2 }
  ]);
});

test("no-stitch placeholders are not counted", () => {
  const chart = createChart({ width: 4, height: 1 });
  paintCell(chart, 1, 4, "nostitch", null);
  paintCell(chart, 1, 3, "nostitch", null);
  assert.deepEqual(stitchCountRuns(chart), [{ row: 1, col: 2, count: 2 }]);
});

test("hidden rows are skipped unless explicitly asked for", () => {
  const chart = createChart({ width: 4, height: 3 });
  chart.options.rowsMode = "rs";
  paintCell(chart, 1, 4, "p", null);
  paintCell(chart, 1, 3, "p", null);
  paintCell(chart, 2, 4, "p", null);
  paintCell(chart, 2, 3, "p", null);
  assert.deepEqual(stitchCountRuns(chart), [
    { row: 1, col: 4, count: 2 },
    { row: 1, col: 2, count: 2 }
  ]);
  assert.deepEqual(stitchCountRuns(chart, { rows: [2] }), [
    { row: 2, col: 4, count: 2 },
    { row: 2, col: 2, count: 2 }
  ]);
});

test("a completely empty row is not labelled", () => {
  const chart = createChart({ width: 4, height: 1 });
  assert.deepEqual(stitchCountRuns(chart), []);
});

test("a colour-only row still counts as content", () => {
  const chart = createChart({ width: 4, height: 1 });
  for (let col = 1; col <= 4; col += 1) setColor(chart, 1, col, "A");
  assert.deepEqual(stitchCountRuns(chart), [{ row: 1, col: 4, count: 4 }]);
});

test("a run of one is not labelled", () => {
  const chart = createChart({ width: 2, height: 1 });
  paintCell(chart, 1, 2, "p", null);
  paintCell(chart, 1, 1, "yo", null);
  assert.deepEqual(stitchCountRuns(chart), []);
});
