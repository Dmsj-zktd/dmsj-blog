import { defineCollection } from "astro:content";
import { z as schemaZ } from "astro/zod";
import { glob } from "astro/loaders";

const blogSchema = schemaZ.object({
  title: schemaZ.string().min(1).max(120),
  description: schemaZ.string().min(1).max(320),
  date: schemaZ.coerce.date(),
  updated: schemaZ.coerce.date().optional(),
  draft: schemaZ.boolean().default(false),
  tags: schemaZ.array(schemaZ.string().trim().min(1)).default([]),
  series: schemaZ.string().trim().optional(),
  lang: schemaZ.string().default("zh-CN"),
  featured: schemaZ.boolean().default(false),
  sticky: schemaZ.boolean().default(false),
  cover: schemaZ
    .object({
      src: schemaZ.string(),
      alt: schemaZ.string(),
    })
    .optional(),
});

export const collections = {
  blog: defineCollection({
    loader: glob({
      base: "./content",
      pattern: "**/*.{md,mdx}",
    }),
    schema: blogSchema,
  }),
};
