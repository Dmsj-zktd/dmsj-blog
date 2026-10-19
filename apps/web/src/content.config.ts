import { defineCollection } from "astro:content";
import { contentFrontmatterSchema } from "@dmsj/content-model";
import { glob } from "astro/loaders";

export const collections = {
  blog: defineCollection({
    loader: glob({
      base: "./content",
      pattern: "**/*.{md,mdx}",
    }),
    schema: contentFrontmatterSchema,
  }),
};
