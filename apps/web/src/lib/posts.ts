import type { CollectionEntry } from "astro:content";
import { getCollection } from "astro:content";

import { type ContentModule, getModule } from "@/site/content-registry";

export interface PostSummary {
  id: string;
  domain: string;
  /** id 去掉 domain 前缀后的目录段数组 */
  dirs: string[];
  slug: string;
  urlPath: string;
  title: string;
  description: string;
  date: Date;
  updated?: Date;
  tags: string[];
  series?: string;
  draft: boolean;
  featured?: boolean;
  sticky?: boolean;
  lang?: string;
  body: string;
}

type BlogEntry = CollectionEntry<"blog">;

function toPost(entry: BlogEntry): PostSummary | undefined {
  const [domain, ...rest] = entry.id.split("/");
  if (!domain || !getModule(domain)) return undefined;
  const slug = rest.length > 0 ? rest[rest.length - 1] : entry.id;
  return {
    id: entry.id,
    domain,
    dirs: rest.slice(0, -1),
    slug,
    urlPath: `/${entry.id}`,
    title: entry.data.title,
    description: entry.data.description,
    date: entry.data.date,
    updated: entry.data.updated,
    tags: entry.data.tags ?? [],
    series: entry.data.series,
    draft: entry.data.draft,
    featured: entry.data.featured,
    sticky: entry.data.sticky,
    lang: entry.data.lang,
    body: entry.body ?? "",
  };
}

export async function getAllPosts(): Promise<PostSummary[]> {
  const entries = await getCollection("blog");
  const posts = entries.map(toPost).filter((p): p is PostSummary => Boolean(p));
  return posts.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function getPublishedPosts(): Promise<PostSummary[]> {
  return (await getAllPosts()).filter((p) => !p.draft);
}

export async function getPostsByDomain(domain: string): Promise<PostSummary[]> {
  const all = await getAllPosts();
  return all.filter((p) => p.domain === domain && !p.draft);
}

export async function getPostByPath(
  domain: string,
  path: string | undefined,
): Promise<PostSummary | undefined> {
  const full = path ? `${domain}/${path}` : domain;
  const entry = await getCollection("blog");
  const match = entry.find((item) => item.id === full && !item.data.draft);
  return match ? toPost(match) : undefined;
}

export function moduleOfPost(post: PostSummary): ContentModule | undefined {
  return getModule(post.domain);
}

export function categoryPathLabel(dirs: string[]): string {
  if (dirs.length === 0) return "";
  return dirs.map((d) => d).join(" / ");
}

export function getReadingMinutes(body: string): number {
  const words = body
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#>*_`~\-=[\]()]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  const cjk = body.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
  return Math.max(1, Math.round((words + cjk) / 500));
}

export function formatDate(date: Date, locale = "zh-CN"): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export async function collectTags(): Promise<Array<{ tag: string; count: number }>> {
  const posts = await getPublishedPosts();
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag, "zh-CN"));
}
