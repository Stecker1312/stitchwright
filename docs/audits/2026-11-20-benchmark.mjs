/**
 * End-to-end-ish benchmark for the editor core.
 *
 * This is a development tool, not a test. It records the cost of the
 * operations the audit asked about: transaction snapshots, history retention,
 * legend scanning and SVG export. Run with:
 *
 *   node docs/audits/2026-11-20-benchmark.mjs
 */
import { performance } from "node:perf_hooks";
import { createChart, setCell, usedLegendKeys } from "../../src/core/chart.js";
import { renderSvg } from "../../src/core/render-svg.js";
import { Store } from "../../src/ui/store.js";

function measure(name, width, height, { groups = 0, colors = 0 } = {}) {
  const chart = createChart({ width, height });
  for (let i = 0; i < groups; i += 1) {
    const row = (i % Math.max(1, height - 1)) + 2;
    const col = (i % Math.max(1, width - 4)) + 1;
    chart.groups.push({ id: `g${i}`, row, col, symbol: "custom", span: 1, label: `G${i}` });
  }
  for (let row = 1; row <= height; row += 1) {
    for (let col = 1; col <= width && colors > 0; col += 1) {
      chart.colors[row - 1][col - 1] = "C";
      colors -= 1;
    }
  }
  const store = new Store(chart);
  const editStart = performance.now();
  for (let i = 0; i < 6; i += 1) {
    store.edit("benchmark", (current) => setCell(current, 1, Math.min(width, i + 1), "p"));
  }
  const editMs = performance.now() - editStart;

  const legendStart = performance.now();
  usedLegendKeys(store.chart);
  const legendMs = performance.now() - legendStart;

  const svgStart = performance.now();
  const svg = renderSvg(store.chart);
  const svgMs = performance.now() - svgStart;

  const historyChars = store.undoStack.reduce(
    (sum, entry) => sum + JSON.stringify(entry.before).length,
    0
  );
  return {
    name,
    width,
    height,
    editMs: Math.round(editMs),
    legendMs: Math.round(legendMs),
    svgMs: Math.round(svgMs),
    svgBytes: svg.length,
    snapshots: store.undoStack.length,
    historyChars,
    historyBudget: 32 * 1024 * 1024
  };
}

const results = [
  measure("40×24", 40, 24),
  measure("200×200", 200, 200),
  measure("1000×1000 empty", 1000, 1000),
  measure("1000×1000 with 5000 groups and colours", 1000, 1000, { groups: 5000, colors: 20000 })
];

console.log(JSON.stringify({ node: process.version, date: new Date().toISOString(), results }, null, 2));
