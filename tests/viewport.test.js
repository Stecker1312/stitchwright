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
  scrollbarMetrics,
  VIEWPORT_MARGIN_X,
  VIEWPORT_MARGIN_Y,
  VIEWPORT_PAN_OVERSCROLL,
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
  assert.deepEqual(headerAt(chart, view, 32, 45, 300, 300), { kind: "row", index: 3 });
  assert.deepEqual(headerAt(chart, view, 85, 45, 300, 300), { kind: "row", index: 3 });
  assert.deepEqual(headerAt(chart, view, 45, 74, 300, 300), { kind: "column", index: 1 });
  assert.deepEqual(headerAt(chart, view, 55, 20, 300, 300), { kind: "column", index: 2 });
  assert.equal(headerAt(chart, view, 10, 10, 300, 300), null);
});

test("the drawing frame rejects cells and keeps a background margin", () => {
  const chart = createChart({ width: 10, height: 10 });
  const view = { scale: 20, offsetX: 0, offsetY: 0 };
  assert.equal(cellAt(chart, view, 20, 100, 400, 400), null);
  assert.equal(cellAt(chart, view, 50, 10, 400, 400), null);
  assert.deepEqual(cellAt(chart, view, 50, 100), { row: 5, col: 3 });
  const fitted = fitView(chart, 400, 400);
  assert.ok(fitted.offsetX >= VIEWPORT_MARGIN_X);
  assert.ok(fitted.offsetY >= VIEWPORT_MARGIN_Y);
});

test("scrollbar keeps a little overscroll at both pattern edges", () => {
  const contentStart = VIEWPORT_MARGIN_X;
  const contentSize = 800;
  assert.equal(scrollbarMetrics(700, contentSize, contentStart, 0).visible, false);

  const left = scrollbarMetrics(1000, contentSize, contentStart, contentStart + VIEWPORT_PAN_OVERSCROLL);
  assert.equal(left.max, 1000 - contentSize + VIEWPORT_PAN_OVERSCROLL * 2);
  assert.equal(left.scroll, 0);

  const rightOffset = left.start - left.max;
  const right = scrollbarMetrics(1000, contentSize, contentStart, rightOffset);
  assert.equal(right.scroll, right.max);
  // First/last stitch plus background stays clear of the frame.
  assert.equal(rightOffset + 1000, contentStart + contentSize - VIEWPORT_PAN_OVERSCROLL);
});

test("row numbers pin to the viewport when the chart is wider than the screen", () => {
  const chart = createChart({ width: 100, height: 100 });
  const view = { scale: 10, offsetX: -500, offsetY: 0 };
  // The chart spans -500…500, so both paper edges are outside a 200 px view.
  assert.deepEqual(headerAt(chart, view, 10, 45, 200, 200), { kind: "row", index: 96 });
  assert.deepEqual(headerAt(chart, view, 190, 45, 200, 200), { kind: "row", index: 96 });
});

test("column numbers pin to the viewport when the chart is taller than the screen", () => {
  const chart = createChart({ width: 100, height: 100 });
  const view = { scale: 10, offsetX: 0, offsetY: -500 };
  // The chart spans -500…500 vertically, so both number rows are pinned.
  assert.deepEqual(headerAt(chart, view, 45, 10, 200, 200), { kind: "column", index: 5 });
  assert.deepEqual(headerAt(chart, view, 45, 190, 200, 200), { kind: "column", index: 5 });
});

test("hidden numbers do not create invisible hit areas", () => {
  const chart = createChart({ width: 4, height: 3 });
  chart.options.showRowNumbers = false;
  chart.options.showStitchNumbers = false;
  const view = { scale: 10, offsetX: 40, offsetY: 40 };
  assert.equal(headerAt(chart, view, 32, 45, 300, 300), null);
  assert.equal(headerAt(chart, view, 85, 45, 300, 300), null);
  assert.equal(headerAt(chart, view, 45, 74, 300, 300), null);
  assert.equal(headerAt(chart, view, 55, 20, 300, 300), null);
});
