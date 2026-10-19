import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { brotliCompressSync, gzipSync } from "node:zlib";

const args = process.argv.slice(2);
const portArg = args.findIndex((arg) => arg === "--port");
const dirArg = args.findIndex((arg) => arg === "--dir");
const root = resolve(dirArg >= 0 ? args[dirArg + 1] : "dist");
const port = Number(portArg >= 0 ? args[portArg + 1] : 4322);
const compressible = new Set([".html", ".js", ".css", ".json", ".svg", ".xml", ".txt"]);

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
  ".woff2": "font/woff2",
};

function targetPath(pathname) {
  let path = pathname.replace(/^\/+/, "") || "index.html";
  if (path.endsWith("/")) path += "index.html";
  if (!extname(path)) path += ".html";
  const filePath = resolve(root, path);
  if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) {
    throw new Error("path outside output directory");
  }
  return filePath;
}

createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    const filePath = targetPath(pathname);
    const meta = await stat(filePath);
    if (!meta.isFile()) throw new Error("not a file");
    const body = await readFile(filePath);
    const extension = extname(filePath);
    const type = types[extension] ?? "application/octet-stream";
    const headers = {
      "Content-Type": type,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control":
        pathname.startsWith("/_astro/") || pathname.startsWith("/pagefind/")
          ? "public, max-age=31536000, immutable"
          : "no-cache",
      Vary: "Accept-Encoding",
    };
    let payload = body;
    if (body.length > 1024 && compressible.has(extension)) {
      const accepted = String(req.headers["accept-encoding"] ?? "");
      if (accepted.includes("br")) {
        payload = brotliCompressSync(body);
        headers["Content-Encoding"] = "br";
      } else if (accepted.includes("gzip")) {
        payload = gzipSync(body);
        headers["Content-Encoding"] = "gzip";
      }
    }
    headers["Content-Length"] = String(payload.length);
    res.writeHead(200, headers);
    res.end(payload);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}).listen(port, () => {
  console.log(`Serving ${root} at http://localhost:${port}`);
});
