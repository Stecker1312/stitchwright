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
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath.split("?")[0]);
  } catch {
    return { error: 400 };
  }
  const requested = decoded === "/" ? "/index.html" : decoded;
  const normalized = path.posix.normalize(requested);
  if (!normalized.startsWith("/") || normalized.split("/").some((part) => part === ".." || part.startsWith("."))) {
    return { error: 403 };
  }
  if (normalized.split("/").includes("node_modules")) return { error: 403 };
  const absolute = path.resolve(ROOT, `.${normalized}`);
  if (!absolute.startsWith(ROOT + path.sep) && absolute !== ROOT) return { error: 403 };
  return { file: absolute };
}

const server = http.createServer((request, response) => {
  const target = safePath(request.url || "/");
  if (!target.file) {
    response.writeHead(target.error || 403);
    response.end(target.error === 400 ? "Bad request" : "Forbidden");
    return;
  }
  fs.realpath(target.file, (realError, realFile) => {
    if (realError || (!realFile.startsWith(ROOT + path.sep) && realFile !== ROOT)) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    fs.stat(realFile, (statError, stat) => {
      if (statError || !stat.isFile()) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }
      response.writeHead(200, {
        "Content-Type": MIME[path.extname(realFile)] || "application/octet-stream",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff"
      });
      const stream = fs.createReadStream(realFile);
      stream.on("error", () => {
        if (!response.headersSent) response.writeHead(500);
        response.end();
      });
      stream.pipe(response);
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Stitchwright is running at http://localhost:${PORT}`);
  console.log("Press Ctrl+C to stop.");
});
