/**
 * Static server for the built VOYAGE app + proxy for the DM endpoint.
 *
 * The chatjimmy.ai endpoint sends no CORS headers, so a browser SPA cannot
 * call it directly. This server:
 *   1. serves the production build from ./dist
 *   2. proxies POST /api/chat -> https://chatjimmy.ai/api/chat
 *
 * Run:  node server.mjs [port]   (default 4173)
 */
import http from "node:http";
import https from "node:https";
import { readFile } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const DIST = join(ROOT, "dist");
const PORT = Number(process.argv[2] || process.env.PORT || 4173);
const UPSTREAM = "https://chatjimmy.ai/api/chat";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

function serveStatic(req, res, pathname) {
  let filePath = normalize(join(DIST, pathname));
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(DIST, "index.html");
  }
  readFile(filePath)
    .then((data) => {
      const type = MIME[extname(filePath).toLowerCase()] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": type });
      res.end(data);
    })
    .catch(() => {
      res.writeHead(404).end("Not found");
    });
}

function proxyChat(req, res) {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const body = Buffer.concat(chunks);
    const upstreamReq = https.request(
      UPSTREAM,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": body.length,
        },
      },
      (upstreamRes) => {
        const outHeaders = {
          "Content-Type": "text/plain; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache",
        };
        res.writeHead(upstreamRes.statusCode || 200, outHeaders);
        upstreamRes.pipe(res);
      },
    );
    upstreamReq.on("error", (err) => {
      res.writeHead(502, { "Content-Type": "text/plain" });
      res.end(`Upstream error: ${err.message}`);
    });
    upstreamReq.end(body);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }
  if (url.pathname === "/api/chat" && req.method === "POST") {
    proxyChat(req, res);
    return;
  }
  serveStatic(req, res, url.pathname);
});

server.listen(PORT, () => {
  console.log(`VOYAGE server running at http://localhost:${PORT}`);
});
