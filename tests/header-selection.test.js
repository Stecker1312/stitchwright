import test from "node:test";
import assert from "node:assert/strict";

import { createChart } from "../src/core/chart.js";
import { headerIndexAt } from "../src/core/viewport.js";
import { Store } from "../src/ui/store.js";

test("a single header index still becomes a normalized range", () => {
  const store = new Store(createChart({ width: 12, height: 8 }));
  store.setHeaderSelection({ kind: "row", index: 5 });
  assert.deepEqual(store.headerSelection, { kind: "row", from: 5, to: 5 });
});

test("header ranges are normalized and clamped", () => {
  const store = new Store(createChart({ width: 12, height: 8 }));
  store.setHeaderSelection({ kind: "column", from: 9, to: 3 });
  assert.deepEqual(store.headerSelection, { kind: "column", from: 3, to: 9 });
  store.setHeaderSelection({ kind: "row", from: -2, to: 99 });
  assert.deepEqual(store.headerSelection, { kind: "row", from: 1, to: 8 });
});

test("clearing a header selection is a no-op when it is already empty", () => {
  const store = new Store(createChart({ width: 4, height: 4 }));
  let events = 0;
  store.subscribe((type) => { if (type === "header") events += 1; });
  store.setHeaderSelection(null);
  assert.equal(events, 0);
});

test("header drag indices clamp even outside the margin", () => {
  const chart = createChart({ width: 4, height: 3 });
  const view = { scale: 10, offsetX: 0, offsetY: 0 };
  // Row 1 is the bottom row; row 3 is at the top.
  assert.equal(headerIndexAt(chart, view, "row", 500, 25), 1);
  assert.equal(headerIndexAt(chart, view, "row", 500, 5), 3);
  assert.equal(headerIndexAt(chart, view, "row", 500, -100), 3);
  assert.equal(headerIndexAt(chart, view, "row", 500, 100), 1);
  assert.equal(headerIndexAt(chart, view, "column", -20, 500), 1);
  assert.equal(headerIndexAt(chart, view, "column", 25, 500), 3);
  assert.equal(headerIndexAt(chart, view, "column", 1000, 500), 4);
});
