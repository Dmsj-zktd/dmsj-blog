export const prerender = true;

export function GET() {
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin/",
    "Disallow: /api/",
    "Disallow: /scripts/",
    "",
    "Sitemap: https://dmsj-blog.pages.dev/sitemap.xml",
    "",
  ].join("\n");
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
