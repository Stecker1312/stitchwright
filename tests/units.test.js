import test from "node:test";
import assert from "node:assert/strict";

import { createChart } from "../src/core/chart.js";
import {
  MM_PER_INCH,
  chartSizeMm,
  fitToPaper,
  formatLength,
  inchToMm,
  mmToInch
} from "../src/core/units.js";

test("metric and imperial conversions are exact", () => {
  assert.equal(MM_PER_INCH, 25.4);
  assert.equal(mmToInch(25.4), 1);
  assert.equal(inchToMm(1), 25.4);
});

test("length formatting respects the unit", () => {
  assert.match(formatLength(6, "metric", "de"), /6\s?mm/);
  assert.match(formatLength(25.4, "imperial", "en"), /1\s?in/);
});

test("chart size uses cell size", () => {
  const chart = createChart({ width: 40, height: 24 });
  chart.options.cellMm = 6;
  assert.deepEqual(chartSizeMm(chart), { width: 240, height: 144 });
});

test("fit to paper never enlarges beyond 100 percent", () => {
  const chart = createChart({ width: 40, height: 24 });
  chart.options.cellMm = 6;
  const scale = fitToPaper(chart, "A4");
  assert.ok(scale > 0 && scale <= 1);
});
