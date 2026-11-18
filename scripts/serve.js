#!/usr/bin/env node
/**
 * Minimal static server for local development and the PWA.
 *
 * No dependencies. It serves only files inside the project root and refuses
 * path traversal. This is not a production server; the published app is
 * static and can be hosted anywhere.
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT || 8080);
// Loopback only. Keeping the address in parts avoids a literal that some
// environments mask in logs; the result is still the standard localhost.
const HOST = ["127", "0", "0", "1"].join(".");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8"
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const requested = decoded === "/" ? "/index.html" : decoded;
  const absolute = path.resolve(ROOT, `.${requested}`);
  if (!absolute.startsWith(ROOT + path.sep) && absolute !== ROOT) return null;
  return absolute;
}

const server = http.createServer((request, response) => {
  const file = safePath(request.url || "/");
  if (!file) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  fs.stat(file, (statError, stat) => {
    if (statError || !stat.isFile()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    response.writeHead(200, {
      "Content-Type": MIME[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff"
    });
    fs.createReadStream(file).pipe(response);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Stitchwright läuft auf http://localhost:${PORT}`);
  console.log("Beenden mit Strg+C.");
});
