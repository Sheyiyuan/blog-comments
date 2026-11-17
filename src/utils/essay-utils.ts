import type { CollectionEntry } from "astro:content";
import crypto from "node:crypto";
import { formatDateToYYYYMMDD } from "@utils/date-utils";
import { excerptFromMarkdown, titleFromMarkdown } from "@utils/plain-text";

export function getEssayExcerptFromBody(rawBody: string, maxLen = 160): string {
	return excerptFromMarkdown(rawBody, maxLen);
}

export function getEssayDerivedTitleFromBody(rawBody: string): string {
	return titleFromMarkdown(rawBody);
}

export function getEssaySeed(entry: CollectionEntry<"essays">): string {
	const explicit = (entry.data.slugSeed ?? "").trim();
	if (explicit) return explicit;

	const fmTitle = (entry.data.title ?? "").trim();
	if (fmTitle) return fmTitle;

	const derivedTitle = getEssayDerivedTitleFromBody(entry.body);
	if (derivedTitle) return derivedTitle;

	const excerpt = getEssayExcerptFromBody(entry.body);
	if (excerpt) return excerpt;

	return entry.body;
}

export function getEssayRouteSlug(entry: CollectionEntry<"essays">): string {
	const datePart = formatDateToYYYYMMDD(entry.data.published);
	const seed = getEssaySeed(entry);
	const hash = crypto
		.createHash("sha256")
		.update(`${datePart}\n${seed}`.normalize("NFKC"))
		.digest("hex")
		.slice(0, 10);
	return `${datePart}-${hash}`;
}

export function getEssayDisplayTitle(entry: CollectionEntry<"essays">): string {
	const fmTitle = (entry.data.title ?? "").trim();
	if (fmTitle) return fmTitle;

	const derived = getEssayDerivedTitleFromBody(entry.body);
	if (derived) return derived;

	const excerpt = getEssayExcerptFromBody(entry.body, 60);
	if (excerpt) return excerpt;

	return formatDateToYYYYMMDD(entry.data.published);
}
