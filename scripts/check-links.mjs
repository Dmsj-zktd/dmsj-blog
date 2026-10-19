import { readFile, readdir, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const roots = [
  resolve("apps/web/content"),
  resolve("packages/content-model/src"),
  resolve("docs/design/reference-ledger.md"),
];

async function walk(path) {
  const entries = await readdir(path, { withFileTypes: true }).catch(async () => {
    const text = await readFile(path, "utf8");
    return [{ name: "", isFile: () => true, text }];
  });
  const files = [];
  for (const entry of entries) {
    if (entry.text) files.push(entry.text);
    else if (entry.isDirectory()) files.push(...(await walk(join(path, entry.name))));
    else if (/\.(md|mdx|ts)$/.test(extname(entry.name))) {
      files.push(await readFile(join(path, entry.name), "utf8"));
    }
  }
  return files;
}

const sources = (await Promise.all(roots.map((root) => walk(root)))).flat();
const urls = [
  ...new Set(
    sources
      .flatMap((text) => text.match(/https?:\/\/[^\s)"'<>]+/g) ?? [])
      .map((url) => url.replace(/[.,;:]+$/, "")),
  ),
].sort();

async function inspect(url) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        headers: { "User-Agent": "DMSJ-Signal-Lab-Link-Check/1.0" },
        signal: AbortSignal.timeout(12_000),
      });
      await response.body?.cancel();
      return {
        url,
        status: response.status,
        ok: response.status < 400,
        finalUrl: response.url,
      };
    } catch (error) {
      if (attempt === 1) {
        return {
          url,
          status: 0,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
  }
  return { url, status: 0, ok: false, error: "unknown" };
}

const results = [];
const queue = [...urls];
const workers = Array.from({ length: Math.min(6, queue.length) }, async () => {
  while (queue.length > 0) {
    const url = queue.shift();
    if (url) results.push(await inspect(url));
  }
});
await Promise.all(workers);
results.sort((a, b) => a.url.localeCompare(b.url));

const broken = results.filter((result) => [404, 410].includes(result.status));
const blocked = results.filter(
  (result) => !result.ok && ([401, 403, 429].includes(result.status) || result.status === 0),
);
const failures = results.filter(
  (result) => !result.ok && !blocked.includes(result) && !broken.includes(result),
);
const labelFor = (result) =>
  result.ok ? "ok" : broken.includes(result) ? "broken" : blocked.includes(result) ? "blocked" : "fail";
const generatedAt = new Date().toISOString();
const lines = [
  "# External link check",
  "",
  `Generated: ${generatedAt}`,
  `Checked: ${results.length}`,
  `Broken: ${broken.length}`,
  `Blocked/unreachable: ${blocked.length}`,
  `Other failures: ${failures.length}`,
  "",
  "| Status | URL | Detail |",
  "| --- | --- | --- |",
  ...results.map(
    (result) =>
      `| ${labelFor(result)} | ${result.url} | ${result.status || result.error || ""}${result.finalUrl && result.finalUrl !== result.url ? ` → ${result.finalUrl}` : ""} |`,
  ),
  "",
];
await writeFile(resolve("docs/link-check-report.md"), lines.join("\n"), "utf8");
console.log(`Checked ${results.length} links; ${failures.length} failed.`);
if (broken.length > 0 || failures.length > 0) process.exitCode = 1;
