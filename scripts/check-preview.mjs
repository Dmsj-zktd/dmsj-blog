const base = process.argv[2]?.replace(/\/$/, "");
if (!base) {
  console.error("Usage: node scripts/check-preview.mjs https://preview.example");
  process.exit(2);
}

async function request(path, init = {}) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`${base}${path}`, {
        redirect: "manual",
        ...init,
        signal: AbortSignal.timeout(25_000),
      });
      return { response, body: await response.text(), attempt: attempt + 1 };
    } catch (error) {
      lastError = error;
    }
  }
  return { error: lastError instanceof Error ? lastError.message : String(lastError) };
}

const routes = [
  "/",
  "/frontier/",
  "/frontier/paged-kv-cache/",
  "/lab/",
  "/lab/kv-budget/",
  "/synthesis/memory-hierarchy/",
  "/search/",
  "/rss.xml",
  "/sitemap.xml",
  "/robots.txt",
  "/pagefind/pagefind.js",
];
const results = [];
const failures = [];

for (const path of routes) {
  const result = await request(path);
  if (result.error) {
    results.push({ path, status: 0, error: result.error });
    failures.push(`${path} could not be fetched`);
    continue;
  }
  const { response, body, attempt } = result;
  results.push({
    path,
    status: response.status,
    contentType: response.headers.get("content-type"),
    bytes: Buffer.byteLength(body),
    attempt,
  });
  if (response.status !== 200) failures.push(`${path} returned ${response.status}`);
}

const authMe = await request("/api/auth/me");
const authConfig = await request("/api/auth/config");
const adminWrite = await request("/api/admin/drafts", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: "{}",
});

const home = await request("/");
const headers = home.response?.headers;
const requiredHeaders = [
  "content-security-policy",
  "strict-transport-security",
  "x-content-type-options",
  "x-frame-options",
  "referrer-policy",
];
for (const header of requiredHeaders) {
  if (!headers?.get(header)) failures.push(`missing response header: ${header}`);
}

if (authMe.response?.status !== 200) {
  failures.push(`/api/auth/me returned ${authMe.response?.status ?? authMe.error}`);
}
if (authConfig.response?.status !== 200) {
  failures.push(`/api/auth/config returned ${authConfig.response?.status ?? authConfig.error}`);
}
if (![401, 503].includes(adminWrite.response?.status ?? 0)) {
  failures.push(`unauthenticated admin write returned ${adminWrite.response?.status ?? adminWrite.error}`);
}

console.log(
  JSON.stringify(
    {
      base,
      routes: results,
      api: {
        me: authMe.response?.status ?? 0,
        meBody: authMe.body?.slice(0, 160),
        config: authConfig.response?.status ?? 0,
        adminWrite: adminWrite.response?.status ?? 0,
        adminBody: adminWrite.body?.slice(0, 240),
      },
      headers: Object.fromEntries(requiredHeaders.map((header) => [header, headers?.get(header)])),
      failures,
    },
    null,
    2,
  ),
);

if (failures.length > 0) process.exitCode = 1;
