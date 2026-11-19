#!/usr/bin/env node
/**
 * Syntax check without dependencies. Runs `node --check` for every JS file
 * and parses every JSON file in the project. Cross-platform, because it uses
 * Node's own executable instead of shell tools.
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKIP = new Set(["node_modules", ".git", "dist", "coverage"]);

function walk(dir, result = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, result);
    else result.push(full);
  }
  return result;
}

const files = walk(ROOT);
let errors = 0;

for (const file of files.filter((name) => name.endsWith(".js") || name.endsWith(".mjs"))) {
  try {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  } catch (error) {
    errors += 1;
    console.error(`Syntax error: ${path.relative(ROOT, file)}`);
    console.error(error.stderr?.toString() || error.message);
  }
}

for (const file of files.filter((name) => name.endsWith(".json"))) {
  try {
    JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    errors += 1;
    console.error(`JSON error: ${path.relative(ROOT, file)}: ${error.message}`);
  }
}

if (errors) {
  console.error(errors === 1 ? "1 error." : `${errors} errors.`);
  process.exit(1);
}
const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const versionSource = fs.readFileSync(path.join(ROOT, "src/version.js"), "utf8");
if (!versionSource.includes(`APP_VERSION = "${packageJson.version}"`)) {
  console.error("Version mismatch between package.json and src/version.js.");
  process.exit(1);
}
console.log(`OK: ${files.filter((name) => name.endsWith(".js") || name.endsWith(".mjs")).length} JS files, ${files.filter((name) => name.endsWith(".json")).length} JSON files.`);
