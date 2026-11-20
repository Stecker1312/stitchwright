import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeChart } from "../src/core/chart.js";
import { hasErrors, validateChart } from "../src/core/validate.js";
import { renderSvg } from "../src/core/render-svg.js";

const SAMPLES = path.dirname(fileURLToPath(new URL("../samples/README.md", import.meta.url)));

for (const file of fs.readdirSync(SAMPLES).filter((name) => name.endsWith(".json"))) {
  test(`sample ${file} is valid and renderable`, () => {
    const raw = JSON.parse(fs.readFileSync(path.join(SAMPLES, file), "utf8"));
    const chart = normalizeChart(raw);
    const diagnostics = validateChart(chart);
    assert.equal(hasErrors(diagnostics), false, JSON.stringify(diagnostics, null, 2));
    assert.match(renderSvg(chart), /^<svg /);
  });
}
