import { site } from "@/config/site";
import { getPublishedPosts, getAllPosts } from "@/lib/posts";

export const prerender = true;

function urlElement(path: string, priority = "0.6") {
  const loc = `${site.url}${path === "/" ? "" : path}`.replace(/\/$/, "");
  return `  <url><loc>${loc}/</loc><priority>${priority}</priority></url>`;
}

export async function GET() {
  const posts = await getPublishedPosts();
  const domains = await getAllPosts();
  const domainKeys = [...new Set(domains.map((p) => p.domain))];
  const staticPaths = ["/", "/archive", "/tags", "/search", "/about"];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPaths.map((p) => urlElement(p, "0.8")).join("\n")}
${domainKeys.map((p) => urlElement(`/${p}`, "0.7")).join("\n")}
${posts.map((p) => urlElement(p.urlPath, "0.9")).join("\n")}
</urlset>`;
  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
