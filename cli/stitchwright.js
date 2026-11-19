#!/usr/bin/env node
/**
 * Stitchwright CLI.
 *
 * This is the agent interface. It uses the same core modules as the browser:
 * one model, one validator, one SVG renderer. No browser, no network, no
 * dependencies.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { createChart, normalizeChart } from "../src/core/chart.js";
import { hasErrors, validateChart } from "../src/core/validate.js";
import { renderSvg } from "../src/core/render-svg.js";
import { legendEntries } from "../src/core/legend.js";

function usage() {
  console.log(`Stitchwright CLI

  node cli/stitchwright.js validate <chart.json> [--json] [--strict]
  node cli/stitchwright.js render <chart.json> <out.svg> [--lang de|en] [--force]
  node cli/stitchwright.js new --width 40 --height 24 [--title "…"] --out <chart.json> [--force]
  node cli/stitchwright.js legend <chart.json> [--json] [--lang de|en]

All commands work offline and use only Node's standard library.`);
}

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[index + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[key] = next;
        index += 1;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

function readChart(file) {
  const absolute = path.resolve(file);
  const raw = fs.readFileSync(absolute, "utf8");
  const data = JSON.parse(raw);
  return normalizeChart(data);
}

function printDiagnostics(diagnostics) {
  for (const item of diagnostics) {
    const label = item.severity === "error" ? "Error" : "Warning";
    console.log(`${label} ${item.code} ${item.path}: ${item.message}`);
  }
}

function ensureWritable(file, force) {
  if (fs.existsSync(file) && !force) {
    throw new Error(`${file} exists. Use --force to overwrite.`);
  }
}

function commandValidate(args) {
  if (!args.positional[0]) throw new Error("Missing chart file");
  const chart = readChart(args.positional[0]);
  const diagnostics = validateChart(chart, { strict: Boolean(args.flags.strict) });
  if (args.flags.json) {
    console.log(JSON.stringify({ ok: !hasErrors(diagnostics), diagnostics }, null, 2));
  } else if (diagnostics.length) {
    printDiagnostics(diagnostics);
  } else {
    console.log(`Valid: ${chart.width} × ${chart.height}, ${chart.groups.length} groups.`);
  }
  return hasErrors(diagnostics) ? 1 : 0;
}

function commandRender(args) {
  if (!args.positional[0] || !args.positional[1]) throw new Error("Missing input or output file");
  const chart = readChart(args.positional[0]);
  const diagnostics = validateChart(chart);
  if (hasErrors(diagnostics)) {
    printDiagnostics(diagnostics);
    return 1;
  }
  const out = path.resolve(args.positional[1]);
  ensureWritable(out, Boolean(args.flags.force));
  const svg = renderSvg(chart, {
    lang: args.flags.lang === "de" ? "de" : "en",
    unit: args.flags.unit === "imperial" ? "imperial" : "metric"
  });
  fs.writeFileSync(out, svg, "utf8");
  console.log(`Wrote ${out}`);
  return 0;
}

function commandNew(args) {
  const width = Number(args.flags.width || 24);
  const height = Number(args.flags.height || 24);
  const out = args.flags.out;
  if (!out) throw new Error("Missing --out");
  ensureWritable(path.resolve(out), Boolean(args.flags.force));
  const chart = createChart({ width, height, title: args.flags.title || "" });
  fs.writeFileSync(path.resolve(out), JSON.stringify(chart, null, 2) + "\n", "utf8");
  console.log(`Wrote ${path.resolve(out)}`);
  return 0;
}

function commandLegend(args) {
  if (!args.positional[0]) throw new Error("Missing chart file");
  const chart = readChart(args.positional[0]);
  const entries = legendEntries(chart, args.flags.lang === "de" ? "de" : "en");
  if (args.flags.json) {
    console.log(JSON.stringify(entries.map((entry) => ({
      kind: entry.kind,
      name: entry.name,
      text: entry.text,
      hex: entry.color?.hex
    })), null, 2));
  } else {
    for (const entry of entries) {
      console.log(`${entry.name}: ${entry.text}${entry.color ? ` (${entry.color.hex})` : ""}`);
    }
  }
  return 0;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args.positional.shift();
  if (!command || command === "help" || command === "--help") {
    usage();
    return 0;
  }
  try {
    if (command === "validate") return commandValidate(args);
    if (command === "render") return commandRender(args);
    if (command === "new") return commandNew(args);
    if (command === "legend") return commandLegend(args);
    throw new Error(`Unknown command: ${command}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return 1;
  }
}

process.exitCode = main();
