import { defineCollection, z } from "astro:content";
import { parseFrontmatterDateTime } from "../utils/date-utils";

const frontmatterDateTime = z.preprocess((v) => {
	try {
		return parseFrontmatterDateTime(v);
	} catch {
		return v;
	}
}, z.date());

const postsCollection = defineCollection({
	schema: z.object({
		title: z.string(),
		published: frontmatterDateTime,
		updated: frontmatterDateTime.optional(),
		pin: z.number().int().optional().default(0),
		draft: z.boolean().optional().default(false),
		description: z.string().optional().default(""),
		image: z.string().optional().default(""),
		firstLineIndent: z.string().optional().default("0em"),
		tags: z.array(z.string()).optional().default([]),
		category: z.string().optional().nullable().default(""),
		lang: z.string().optional().default(""),
		comments: z.boolean().optional().default(true),
		sponsor: z.boolean().optional().default(true),

		/* For internal use */
		prevTitle: z.string().default(""),
		prevSlug: z.string().default(""),
		nextTitle: z.string().default(""),
		nextSlug: z.string().default(""),
	}),
});

const essaysCollection = defineCollection({
	schema: z.object({
		/**
		 * Optional title.
		 * If omitted, UI will derive it from the first meaningful line / excerpt.
		 */
		title: z.string().optional().default(""),
		published: frontmatterDateTime,
		updated: frontmatterDateTime.optional(),
		pin: z.number().int().optional().default(0),
		draft: z.boolean().optional().default(false),
		lang: z.string().optional().default(""),
		tags: z.array(z.string()).optional().default([]),
		comments: z.boolean().optional().default(true),
		/**
		 * Optional seed to keep URL stable even if content changes.
		 * If omitted, it will be derived from title / first line / excerpt.
		 */
		slugSeed: z.string().optional().default(""),
	}),
});

const specCollection = defineCollection({
	schema: z.object({}),
});
export const collections = {
	posts: postsCollection,
	essays: essaysCollection,
	spec: specCollection,
};
