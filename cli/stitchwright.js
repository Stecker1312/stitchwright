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
import { randomUUID } from "node:crypto";

import { createChart, normalizeChart } from "../src/core/chart.js";
import { hasErrors, validateChart } from "../src/core/validate.js";
import { renderSvg } from "../src/core/render-svg.js";
import { legendEntries } from "../src/core/legend.js";

const COMMANDS = {
  validate: {
    positional: 1,
    flags: { json: "boolean", strict: "boolean" }
  },
  render: {
    positional: 2,
    flags: { json: "boolean", lang: "value", unit: "value", force: "boolean" }
  },
  new: {
    positional: 0,
    flags: {
      json: "boolean", width: "value", height: "value", title: "value",
      round: "boolean", out: "value", force: "boolean"
    }
  },
  legend: {
    positional: 1,
    flags: { json: "boolean", lang: "value" }
  }
};

class CliError extends Error {
  constructor(message, code = "E_CLI") {
    super(message);
    this.code = code;
  }
}

function usage() {
  console.log(`Stitchwright CLI

  node cli/stitchwright.js validate <chart.json> [--json] [--strict]
  node cli/stitchwright.js render <chart.json> <out.svg> [--lang de|en] [--unit metric|imperial] [--force]
  node cli/stitchwright.js new --width 40 --height 24 [--title "…"] [--round] --out <chart.json> [--force]
  node cli/stitchwright.js legend <chart.json> [--json] [--lang de|en]

All commands work offline and use only Node's standard library.`);
}

function parseArgs(argv) {
  const command = argv[0];
  if (!command || command === "help" || command === "--help") {
    return { command: "help", flags: {}, positional: [] };
  }
  const spec = COMMANDS[command];
  if (!spec) throw new CliError(`Unknown command: ${command}`, "E_COMMAND");
  const flags = {};
  const positional = [];
  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    const equal = arg.indexOf("=");
    const key = equal === -1 ? arg.slice(2) : arg.slice(2, equal);
    const kind = spec.flags[key];
    if (!kind) throw new CliError(`Unknown flag: --${key}`, "E_FLAG");
    if (kind === "boolean") {
      if (equal !== -1) {
        flags[key] = arg.slice(equal + 1) !== "false";
      } else {
        flags[key] = true;
      }
      continue;
    }
    if (equal !== -1) {
      flags[key] = arg.slice(equal + 1);
    } else {
      const next = argv[index + 1];
      if (next === undefined || next.startsWith("--")) {
        throw new CliError(`Missing value for --${key}`, "E_FLAG_VALUE");
      }
      flags[key] = next;
      index += 1;
    }
  }
  if (positional.length !== spec.positional) {
    throw new CliError(
      `${command} expects ${spec.positional} positional argument(s), got ${positional.length}`,
      "E_ARGUMENTS"
    );
  }
  return { command, flags, positional };
}

function readJson(file) {
  const absolute = path.resolve(file);
  let text;
  try {
    const stat = fs.statSync(absolute);
    if (stat.size > 20 * 1024 * 1024) {
      throw new CliError("The file is too large to import", "E_FILE_SIZE");
    }
    text = fs.readFileSync(absolute, "utf8");
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError(`Cannot read ${file}: ${error.message}`, "E_FILE");
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new CliError(`Invalid JSON in ${file}: ${error.message}`, "E_JSON");
  }
}

function dedupe(diagnostics) {
  const seen = new Set();
  return diagnostics.filter((item) => {
    const key = `${item.severity}\u0000${item.code}\u0000${item.path}\u0000${item.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function loadChart(file, { strict = false } = {}) {
  const raw = readJson(file);
  const rawDiagnostics = validateChart(raw, { strict, raw: true });
  if (hasErrors(rawDiagnostics)) {
    return { chart: null, diagnostics: rawDiagnostics };
  }
  const chart = normalizeChart(raw);
  const diagnostics = dedupe([
    ...rawDiagnostics,
    ...validateChart(chart, { strict })
  ]);
  return { chart, diagnostics };
}

function printDiagnostics(diagnostics) {
  for (const item of diagnostics) {
    const label = item.severity === "error" ? "Error" : "Warning";
    console.log(`${label} ${item.code} ${item.path}: ${item.message}`);
  }
}

function ensureWritable(file, force) {
  if (fs.existsSync(file) && !force) {
    throw new CliError(`${file} exists. Use --force to overwrite.`, "E_EXISTS");
  }
}

function commandValidate(args) {
  const { chart, diagnostics } = loadChart(args.positional[0], {
    strict: Boolean(args.flags.strict)
  });
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
  const { chart, diagnostics } = loadChart(args.positional[0]);
  if (hasErrors(diagnostics)) {
    printDiagnostics(diagnostics);
    return 1;
  }
  const out = path.resolve(args.positional[1]);
  ensureWritable(out, Boolean(args.flags.force));
  if (args.flags.lang !== undefined && !["de", "en"].includes(args.flags.lang)) {
    throw new CliError(`Unknown language: ${args.flags.lang}`, "E_FLAG_VALUE");
  }
  if (args.flags.unit !== undefined && !["metric", "imperial"].includes(args.flags.unit)) {
    throw new CliError(`Unknown unit: ${args.flags.unit}`, "E_FLAG_VALUE");
  }
  const svg = renderSvg(chart, {
    lang: args.flags.lang === "de" ? "de" : "en",
    unit: args.flags.unit === "imperial" ? "imperial" : "metric"
  });
  fs.writeFileSync(out, svg, "utf8");
  console.log(`Wrote ${out}`);
  return 0;
}

function commandNew(args) {
  const width = args.flags.width === undefined ? 24 : Number(args.flags.width);
  const height = args.flags.height === undefined ? 24 : Number(args.flags.height);
  const out = args.flags.out;
  if (!out) throw new CliError("Missing --out", "E_ARGUMENTS");
  const title = args.flags.title === true ? "" : String(args.flags.title || "");
  const chart = createChart({
    width,
    height,
    title,
    construction: args.flags.round ? "round" : "flat"
  });
  const slug = String(title || "chart")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "chart";
  chart.id = `${slug}-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
  const diagnostics = validateChart(chart);
  if (hasErrors(diagnostics)) {
    printDiagnostics(diagnostics);
    return 1;
  }
  const absolute = path.resolve(out);
  ensureWritable(absolute, Boolean(args.flags.force));
  fs.writeFileSync(absolute, JSON.stringify(chart, null, 2) + "\n", "utf8");
  console.log(`Wrote ${absolute}`);
  return 0;
}

function commandLegend(args) {
  const { chart, diagnostics } = loadChart(args.positional[0]);
  if (hasErrors(diagnostics)) {
    if (args.flags.json) {
      console.log(JSON.stringify({ ok: false, diagnostics }, null, 2));
    } else {
      printDiagnostics(diagnostics);
    }
    return 1;
  }
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
  const wantsJson = process.argv.includes("--json");
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.command === "help") {
      usage();
      return 0;
    }
    if (args.command === "validate") return commandValidate(args);
    if (args.command === "render") return commandRender(args);
    if (args.command === "new") return commandNew(args);
    if (args.command === "legend") return commandLegend(args);
    throw new CliError(`Unknown command: ${args.command}`, "E_COMMAND");
  } catch (error) {
    if (wantsJson) {
      console.log(JSON.stringify({
        ok: false,
        error: { code: error.code || "E_CLI", message: error.message }
      }, null, 2));
    } else {
      console.error(`Error: ${error.message}`);
    }
    return 1;
  }
}

process.exitCode = main();
