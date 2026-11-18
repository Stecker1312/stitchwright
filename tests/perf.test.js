import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";

import { addGroup, createChart, setCell, setColor } from "../src/core/chart.js";
import { renderSvg } from "../src/core/render-svg.js";

test("a 200 x 200 chart renders in reasonable time", () => {
  const chart = createChart({ width: 200, height: 200, title: "Performance" });
  for (let row = 1; row <= 200; row += 3) {
    for (let col = 1; col <= 200; col += 3) {
      setCell(chart, row, col, "p");
      if ((row + col) % 9 === 0) setColor(chart, row, col, "C");
    }
  }
  for (let row = 2; row <= 200; row += 3) {
    for (let col = 2; col <= 190; col += 20) {
      addGroup(chart, { row, col, symbol: "cable", left: 2, right: 2, direction: row % 20 === 2 ? "front" : "back" });
    }
  }

  const start = performance.now();
  const svg = renderSvg(chart);
  const elapsed = performance.now() - start;
  assert.match(svg, /^<svg /);
  assert.ok(svg.length > 10000);
  // Very generous: the point is to catch accidental O(n²) explosions, not
  // to benchmark a particular machine.
  assert.ok(elapsed < 3000, `SVG render took ${elapsed.toFixed(0)} ms`);
});
