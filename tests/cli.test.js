import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const CLI = fileURLToPath(new URL("../cli/stitchwright.js", import.meta.url));

function run(args) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
}

test("CLI creates, validates and renders a chart", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stitchwright-"));
  const chartFile = path.join(dir, "chart.strickschrift.json");
  const svgFile = path.join(dir, "chart.svg");

  try {
    const created = run(["new", "--width", "8", "--height", "6", "--title", "CLI-Test", "--out", chartFile]);
    assert.equal(created.status, 0, created.stderr);
    assert.equal(fs.existsSync(chartFile), true);

    const validated = run(["validate", chartFile, "--json"]);
    assert.equal(validated.status, 0, validated.stderr);
    const result = JSON.parse(validated.stdout);
    assert.equal(result.ok, true);

    const rendered = run(["render", chartFile, svgFile]);
    assert.equal(rendered.status, 0, rendered.stderr);
    assert.match(fs.readFileSync(svgFile, "utf8"), /^<svg /);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI refuses to overwrite without --force", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stitchwright-"));
  const chartFile = path.join(dir, "chart.strickschrift.json");
  try {
    assert.equal(run(["new", "--out", chartFile]).status, 0);
    const second = run(["new", "--out", chartFile]);
    assert.equal(second.status, 1);
    assert.match(second.stderr, /--force/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI reports invalid charts with a non-zero exit code", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stitchwright-"));
  const chartFile = path.join(dir, "broken.strickschrift.json");
  try {
    assert.equal(run(["new", "--width", "8", "--height", "6", "--out", chartFile]).status, 0);
    const chart = JSON.parse(fs.readFileSync(chartFile, "utf8"));
    chart.rows[0][0] = "does-not-exist";
    fs.writeFileSync(chartFile, JSON.stringify(chart));
    const result = run(["validate", chartFile, "--json"]);
    assert.equal(result.status, 1);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.ok, false);
    assert.ok(parsed.diagnostics.some((item) => item.code === "E_CELL_SYMBOL"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
