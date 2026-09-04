import { site } from "@/config/site";
import { getPublishedPosts } from "@/lib/posts";

export const prerender = true;

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET() {
  const posts = await getPublishedPosts();
  const items = posts.slice(0, 30)
    .map(
      (post) => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${site.url}${post.urlPath}</link>
      <guid isPermaLink="true">${site.url}${post.urlPath}</guid>
      <pubDate>${post.date.toUTCString()}</pubDate>
      <description>${escapeXml(post.description)}</description>
    </item>`,
    )
    .join("\n");
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(site.name)}</title>
    <link>${site.url}</link>
    <description>${escapeXml(site.description)}</description>
    <language>${site.locale}</language>
    <atom:link href="${site.url}/rss.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;
  return new Response(body, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
