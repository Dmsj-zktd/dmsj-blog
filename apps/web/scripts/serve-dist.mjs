import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const args = process.argv.slice(2);
const portArg = args.findIndex((arg) => arg === "--port");
const dirArg = args.findIndex((arg) => arg === "--dir");
const root = normalize(dirArg >= 0 ? args[dirArg + 1] : "dist");
const port = Number(portArg >= 0 ? args[portArg + 1] : 4322);

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
  let path = pathname === "/" ? "/index.html" : pathname;
  if (path.endsWith("/")) path += "index.html";
  if (!extname(path)) path += ".html";
  return join(root, path);
}

createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    const filePath = targetPath(pathname);
    const meta = await stat(filePath);
    if (!meta.isFile()) throw new Error("not a file");
    const body = await readFile(filePath);
    const type = types[extname(filePath)] ?? "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}).listen(port, () => {
  console.log(`Serving ${root} at http://localhost:${port}`);
});
