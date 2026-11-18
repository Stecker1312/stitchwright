import test from "node:test";
import assert from "node:assert/strict";

import { createChart } from "../src/core/chart.js";
import {
  cellAt,
  cellRect,
  fitView,
  headerAt,
  zoomAt,
  panBy,
  visibleColumns
} from "../src/core/viewport.js";

test("cell rectangles are bottom-up and left-to-right", () => {
  const chart = createChart({ width: 4, height: 3 });
  const view = { scale: 10, offsetX: 0, offsetY: 0 };
  assert.deepEqual(cellRect(chart, view, 1, 1), { x: 0, y: 20, size: 10 });
  assert.deepEqual(cellRect(chart, view, 3, 1), { x: 0, y: 0, size: 10 });
  assert.equal(cellRect(chart, view, 1, 5), null);
});

test("hit testing maps pixels back to the same cell", () => {
  const chart = createChart({ width: 5, height: 4 });
  const view = { scale: 10, offsetX: 20, offsetY: 30 };
  assert.deepEqual(cellAt(chart, view, 25, 35), { row: 4, col: 1 });
  assert.deepEqual(cellAt(chart, view, 65, 65), { row: 1, col: 5 });
  assert.equal(cellAt(chart, view, 0, 0), null);
});

test("fit view centres the chart", () => {
  const chart = createChart({ width: 10, height: 5 });
  const view = fitView(chart, 500, 300, { padding: 20 });
  assert.ok(view.scale > 0);
  const rect = cellRect(chart, view, 1, 1);
  assert.ok(rect.x >= 20);
  assert.ok(rect.y >= 20);
});

test("zoom keeps the point under the cursor stable", () => {
  const view = { scale: 20, offsetX: 0, offsetY: 0 };
  const next = zoomAt(view, 100, 100, 1.5);
  assert.ok(next.scale > view.scale);
  // The chart point under (100,100) must remain under (100,100).
  const beforeX = (100 - view.offsetX) / view.scale;
  const afterX = (100 - next.offsetX) / next.scale;
  assert.ok(Math.abs(beforeX - afterX) < 0.0001);
});

test("pan changes only the offset", () => {
  const view = { scale: 20, offsetX: 0, offsetY: 0 };
  const next = panBy(view, 15, -5);
  assert.deepEqual(next, { scale: 20, offsetX: 15, offsetY: -5 });
});

test("visible columns are clipped to the chart", () => {
  const chart = createChart({ width: 100, height: 10 });
  const view = { scale: 10, offsetX: -50, offsetY: 0 };
  assert.deepEqual(visibleColumns(chart, view, 200), { start: 5, end: 25 });
});

test("row and column number margins are clickable", () => {
  const chart = createChart({ width: 4, height: 3 });
  const view = { scale: 10, offsetX: 40, offsetY: 40 };
  assert.deepEqual(headerAt(chart, view, 32, 45), { kind: "row", index: 3 });
  assert.deepEqual(headerAt(chart, view, 45, 74), { kind: "column", index: 1 });
  assert.equal(headerAt(chart, view, 10, 10), null);
});

test("hidden numbers do not create invisible hit areas", () => {
  const chart = createChart({ width: 4, height: 3 });
  chart.options.showRowNumbers = false;
  chart.options.showStitchNumbers = false;
  const view = { scale: 10, offsetX: 40, offsetY: 40 };
  assert.equal(headerAt(chart, view, 32, 45), null);
  assert.equal(headerAt(chart, view, 45, 74), null);
});
