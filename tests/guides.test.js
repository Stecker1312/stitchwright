import test from "node:test";
import assert from "node:assert/strict";

import {
  addGuide,
  clearGuides,
  createChart,
  deleteColumn,
  deleteRow,
  guidesOverlapping,
  insertColumn,
  insertRow,
  mirrorHorizontal,
  mirrorVertical,
  normalizeChart,
  removeGuide,
  resizeChart,
  visibleRows
} from "../src/core/chart.js";
import { GUIDE_WIDTH_CELLS, findGuideAt, guideLine } from "../src/core/guides.js";
import { renderSvg } from "../src/core/render-svg.js";
import { hasErrors, validateChart } from "../src/core/validate.js";

function guide(overrides = {}) {
  return {
    boundary: 3,
    fromRow: 2,
    toRow: 5,
    color: "#b3261e",
    ...overrides
  };
}

test("new charts start without guide lines", () => {
  const chart = createChart({ width: 10, height: 8 });
  assert.deepEqual(chart.guides, []);
});

test("guide lines get ids, lowercase colours and a stable order", () => {
  const chart = createChart({ width: 10, height: 8 });
  const later = addGuide(chart, guide({ boundary: 6, color: "#1F5FA8" }));
  const earlier = addGuide(chart, guide({ boundary: 2, fromRow: 1, toRow: 3 }));
  assert.equal(later.id, "l1");
  assert.equal(earlier.id, "l2");
  assert.equal(later.color, "#1f5fa8");
  assert.deepEqual(chart.guides.map((item) => item.boundary), [2, 6]);
  assert.equal(removeGuide(chart, later.id), true);
  assert.equal(chart.guides.length, 1);
  assert.equal(clearGuides(chart), true);
  assert.deepEqual(chart.guides, []);
  assert.equal(clearGuides(chart), false);
});

test("guide lines must sit between stitches and inside the rows", () => {
  const chart = createChart({ width: 10, height: 8 });
  assert.throws(() => addGuide(chart, guide({ boundary: 0 })), /boundary/);
  assert.throws(() => addGuide(chart, guide({ boundary: 10 })), /boundary/);
  assert.throws(() => addGuide(chart, guide({ fromRow: 0 })), /rows/);
  assert.throws(() => addGuide(chart, guide({ toRow: 9 })), /rows/);
  assert.throws(() => addGuide(chart, guide({ fromRow: 5, toRow: 4 })), /rows/);
  assert.throws(() => addGuide(chart, guide({ color: "red" })), /colour/);
  const first = addGuide(chart, guide());
  assert.throws(() => addGuide(chart, guide({ id: first.id })), /Duplicate/);
});

test("overlap lookup only finds lines on the same boundary and rows", () => {
  const chart = createChart({ width: 10, height: 8 });
  const first = addGuide(chart, guide({ boundary: 3, fromRow: 1, toRow: 3 }));
  addGuide(chart, guide({ boundary: 4, fromRow: 1, toRow: 3 }));
  assert.deepEqual(guidesOverlapping(chart, 3, 2, 5).map((item) => item.id), [first.id]);
  assert.deepEqual(guidesOverlapping(chart, 3, 4, 5), []);
  assert.equal(findGuideAt(chart, 3, 2)?.id, first.id);
  assert.equal(findGuideAt(chart, 3, 4), null);
});

test("normalization keeps guide lines and fills missing ones", () => {
  const raw = createChart({ width: 10, height: 8 });
  raw.guides = [guide({ id: "l1" })];
  assert.deepEqual(normalizeChart(raw).guides, [raw.guides[0]]);

  delete raw.guides;
  assert.deepEqual(normalizeChart(raw).guides, []);

  raw.guides = "broken";
  assert.throws(() => normalizeChart(raw), /guides must be an array/);
});

test("resizing drops or shortens guide lines", () => {
  const chart = createChart({ width: 10, height: 8 });
  addGuide(chart, guide({ boundary: 8, fromRow: 1, toRow: 8 }));
  addGuide(chart, guide({ boundary: 2, fromRow: 2, toRow: 7 }));
  resizeChart(chart, 6, 5);
  assert.equal(chart.guides.length, 1);
  assert.deepEqual(chart.guides[0], {
    id: chart.guides[0].id,
    color: "#b3261e",
    boundary: 2,
    fromRow: 2,
    toRow: 5
  });

  const removed = createChart({ width: 10, height: 8 });
  addGuide(removed, guide({ fromRow: 6, toRow: 8 }));
  resizeChart(removed, 10, 5);
  assert.deepEqual(removed.guides, []);
});

test("row inserts shift, extend or keep guide lines", () => {
  const shifted = createChart({ width: 10, height: 8 });
  addGuide(shifted, guide({ fromRow: 2, toRow: 5 }));
  insertRow(shifted, 1, "below");
  assert.deepEqual([shifted.guides[0].fromRow, shifted.guides[0].toRow], [3, 6]);

  const extended = createChart({ width: 10, height: 8 });
  addGuide(extended, guide({ fromRow: 2, toRow: 5 }));
  insertRow(extended, 3, "above");
  assert.deepEqual([extended.guides[0].fromRow, extended.guides[0].toRow], [2, 6]);

  const unchanged = createChart({ width: 10, height: 8 });
  addGuide(unchanged, guide({ fromRow: 2, toRow: 5 }));
  insertRow(unchanged, 5, "above");
  assert.deepEqual([unchanged.guides[0].fromRow, unchanged.guides[0].toRow], [2, 5]);
});

test("row deletes move, shorten or remove guide lines", () => {
  const shifted = createChart({ width: 10, height: 8 });
  addGuide(shifted, guide({ fromRow: 2, toRow: 5 }));
  deleteRow(shifted, 1);
  assert.deepEqual([shifted.guides[0].fromRow, shifted.guides[0].toRow], [1, 4]);

  const shortened = createChart({ width: 10, height: 8 });
  addGuide(shortened, guide({ fromRow: 2, toRow: 5 }));
  deleteRow(shortened, 2);
  assert.deepEqual([shortened.guides[0].fromRow, shortened.guides[0].toRow], [2, 4]);

  const gone = createChart({ width: 10, height: 8 });
  addGuide(gone, guide({ fromRow: 3, toRow: 3 }));
  deleteRow(gone, 3);
  assert.deepEqual(gone.guides, []);
});

test("column inserts and deletes keep guide lines on their boundary", () => {
  const shifted = createChart({ width: 8, height: 6 });
  addGuide(shifted, guide({ boundary: 3 }));
  insertColumn(shifted, 1, "left");
  assert.equal(shifted.guides[0].boundary, 4);

  const atBoundary = createChart({ width: 8, height: 6 });
  addGuide(atBoundary, guide({ boundary: 3 }));
  insertColumn(atBoundary, 4, "left");
  assert.equal(atBoundary.guides[0].boundary, 3);

  const deleted = createChart({ width: 8, height: 6 });
  addGuide(deleted, guide({ boundary: 4 }));
  deleteColumn(deleted, 4);
  assert.equal(deleted.guides[0].boundary, 3);

  const edge = createChart({ width: 8, height: 6 });
  addGuide(edge, guide({ boundary: 7 }));
  deleteColumn(edge, 8);
  assert.deepEqual(edge.guides, []);
});

test("mirroring keeps guide lines symmetric", () => {
  const chart = createChart({ width: 10, height: 8 });
  addGuide(chart, guide({ boundary: 3, fromRow: 2, toRow: 5 }));
  mirrorHorizontal(chart);
  assert.equal(chart.guides[0].boundary, 7);
  mirrorVertical(chart);
  assert.deepEqual([chart.guides[0].fromRow, chart.guides[0].toRow], [4, 7]);
  mirrorHorizontal(chart);
  mirrorVertical(chart);
  assert.equal(chart.guides[0].boundary, 3);
  assert.deepEqual([chart.guides[0].fromRow, chart.guides[0].toRow], [2, 5]);
});

test("guide geometry uses visible rows and works with hidden rows", () => {
  const chart = createChart({ width: 10, height: 8 });
  addGuide(chart, guide({ boundary: 4, fromRow: 2, toRow: 5 }));
  assert.deepEqual(guideLine(chart.guides[0], visibleRows(chart)), { x: 4, y1: 7, y2: 3 });

  chart.options.rowsMode = "rs";
  assert.deepEqual(guideLine(chart.guides[0], visibleRows(chart)), { x: 4, y1: 3, y2: 1 });

  chart.guides[0].fromRow = 2;
  chart.guides[0].toRow = 2;
  assert.equal(guideLine(chart.guides[0], visibleRows(chart)), null);
});

test("SVG export draws guide lines with their own colour", () => {
  const chart = createChart({ width: 12, height: 8 });
  addGuide(chart, guide({ boundary: 5, fromRow: 2, toRow: 6, color: "#2e7d32" }));
  const svg = renderSvg(chart);
  assert.match(svg, /stroke="#2e7d32"/);
  assert.match(svg, new RegExp(`stroke-width="${(GUIDE_WIDTH_CELLS * 24).toFixed(2)}"`));
  assert.match(svg, /x1="164" y1="[^"]+" x2="164"/);
});

test("validation catches broken guide lines", () => {
  const chart = createChart({ width: 10, height: 8 });
  assert.equal(hasErrors(validateChart(chart)), false);
  const item = addGuide(chart, guide());
  assert.equal(hasErrors(validateChart(chart)), false);

  item.color = "red";
  item.boundary = 10;
  item.fromRow = 5;
  item.toRow = 4;
  chart.guides.push({ ...chart.guides[0], boundary: 2, fromRow: 1, toRow: 2, color: "#000000" });
  const codes = new Set(validateChart(chart).map((diagnostic) => diagnostic.code));
  assert.equal(codes.has("E_GUIDE_COLOR"), true);
  assert.equal(codes.has("E_GUIDE_BOUNDARY"), true);
  assert.equal(codes.has("E_GUIDE_RANGE"), true);
  assert.equal(codes.has("E_GUIDE_DUPLICATE"), true);
});
