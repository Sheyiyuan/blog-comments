import type { CollectionEntry } from "astro:content";
import crypto from "node:crypto";
import { formatDateToYYYYMMDD } from "@utils/date-utils";

function stripMarkdownInline(text: string): string {
	return text
		.replace(/`([^`]+)`/g, "$1")
		.replace(/\*\*([^*]+)\*\*/g, "$1")
		.replace(/\*([^*]+)\*/g, "$1")
		.replace(/_([^_]+)_/g, "$1")
		.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
		.replace(/<[^>]+>/g, "")
		.trim();
}

function firstParagraph(rawBody: string): string {
	const lines = rawBody.split(/\r?\n/);
	let inFence = false;
	const buf: string[] = [];

	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (!line) {
			if (buf.length > 0) break;
			continue;
		}

		if (line.startsWith("```")) {
			inFence = !inFence;
			continue;
		}
		if (inFence) continue;

		buf.push(line);
	}

	return buf.join(" ");
}

export function getEssayExcerptFromBody(rawBody: string, maxLen = 160): string {
	const paragraph = stripMarkdownInline(firstParagraph(rawBody));
	if (!paragraph) return "";
	if (paragraph.length <= maxLen) return paragraph;
	return `${paragraph.slice(0, maxLen).trim()}…`;
}

export function getEssayDerivedTitleFromBody(rawBody: string): string {
	const paragraph = firstParagraph(rawBody);
	if (!paragraph) return "";

	// Prefer a heading-like first line if present.
	const firstLine = rawBody
		.split(/\r?\n/)
		.map((l) => l.trim())
		.find((l) => l.length > 0 && !l.startsWith("```"));

	const candidate = firstLine ?? paragraph;
	const normalized = stripMarkdownInline(candidate.replace(/^#{1,6}\s+/, ""));
	return normalized;
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
