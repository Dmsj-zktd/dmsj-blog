import { readFile, readdir } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const dist = resolve("apps/web/dist");
const pageBudgets = [
  { route: "/", file: "index.html", scripts: 60 * 1024, styles: 50 * 1024 },
  {
    route: "/synthesis/memory-hierarchy/",
    file: "synthesis/memory-hierarchy/index.html",
    scripts: 35 * 1024,
    styles: 50 * 1024,
  },
  {
    route: "/lab/kv-budget/",
    file: "lab/kv-budget/index.html",
    scripts: 20 * 1024,
    styles: 50 * 1024,
  },
];
const failures = [];

function localAsset(url) {
  if (!url.startsWith("/") || url.startsWith("//")) return undefined;
  return resolve(dist, `.${url.split(/[?#]/, 1)[0]}`);
}

function gzipSize(buffer) {
  return gzipSync(buffer).length;
}

function externalAssets(html, tag, attribute) {
  const pattern = new RegExp(`<${tag}[^>]*${attribute}=["']([^"']+)["'][^>]*>`, "gi");
  return [...new Set([...html.matchAll(pattern)].map((match) => match[1]))];
}

async function assetSize(urls, kind) {
  let total = 0;
  for (const url of urls) {
    const file = localAsset(url);
    if (!file) {
      failures.push(`${kind}: external or invalid asset ${url}`);
      continue;
    }
    try {
      total += gzipSize(await readFile(file));
    } catch {
      failures.push(`${kind}: referenced asset missing from dist: ${url}`);
    }
  }
  return total;
}

for (const budget of pageBudgets) {
  const html = await readFile(resolve(dist, budget.file), "utf8");
  const scripts = externalAssets(html, "script", "src");
  const styles = [
    ...externalAssets(html, "link", "href").filter((url) => url.endsWith(".css")),
  ];
  const scriptBytes = await assetSize(scripts, `${budget.route} script`);
  const styleBytes = await assetSize(styles, `${budget.route} style`);
  console.log(
    `${budget.route} scripts ${(scriptBytes / 1024).toFixed(1)} KiB / ${budget.scripts / 1024} KiB; styles ${(styleBytes / 1024).toFixed(1)} KiB / ${budget.styles / 1024} KiB`,
  );
  if (scriptBytes > budget.scripts) {
    failures.push(`${budget.route} initial JavaScript exceeds ${budget.scripts / 1024} KiB gzip`);
  }
  if (styleBytes > budget.styles) {
    failures.push(`${budget.route} initial CSS exceeds ${budget.styles / 1024} KiB gzip`);
  }
}

const astroAssets = await readdir(resolve(dist, "_astro"), { withFileTypes: true });
for (const asset of astroAssets) {
  if (!asset.isFile() || extname(asset.name) !== ".js") continue;
  const size = gzipSize(await readFile(resolve(dist, "_astro", asset.name)));
  if (size > 20 * 1024) {
    failures.push(`JavaScript chunk exceeds 20 KiB gzip: ${asset.name} (${(size / 1024).toFixed(1)} KiB)`);
  }
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log("Performance budgets passed.");
}
