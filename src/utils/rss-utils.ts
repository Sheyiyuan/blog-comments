import { getImage } from "astro:assets";
import path from "node:path";
import type { ImageMetadata } from "astro";
import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";

const parser = new MarkdownIt();

/**
 * Markdown images are written as paths relative to the Markdown file
 * (e.g. `images/foo.png`). Astro resolves them to hashed `_astro` assets when
 * rendering pages, but an RSS reader has no page context to resolve them
 * against, so they must be turned into absolute URLs here.
 */
const contentImageImporters = import.meta.glob<ImageMetadata>(
	"/src/**/*.{png,jpg,jpeg,webp,avif,gif,svg,ico,bmp,tiff}",
	{ import: "default" },
);

const imageUrlCache = new Map<string, Promise<string | undefined>>();

type MarkdownToken = ReturnType<MarkdownIt["parse"]>[number];

export interface RssContentEntryLike {
	collection: string;
	id: string;
	filePath?: string;
}

export interface RenderRssContentOptions {
	entry: RssContentEntryLike;
	body: unknown;
	/** Absolute canonical URL of the entry page. */
	pageUrl: string | URL;
	/** Absolute base URL of the site, e.g. `https://example.com/`. */
	siteUrl: string | URL;
}

interface ResolveContext {
	filePath: string;
	pageUrl: string;
	siteUrl: string;
}

function stripInvalidXmlChars(str: string): string {
	return str.replace(
		// biome-ignore lint/suspicious/noControlCharactersInRegex: https://www.w3.org/TR/xml/#charsets
		/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFDD0-\uFDEF\uFFFE\uFFFF]/g,
		"",
	);
}

function safeDecode(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

function isAbsoluteUrl(value: string): boolean {
	return /^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith("//");
}

function toAbsoluteUrl(value: string, base: string): string {
	try {
		return new URL(value, base).href;
	} catch {
		return value;
	}
}

function splitUrlSuffix(value: string): { pathname: string; suffix: string } {
	const index = value.search(/[?#]/);
	if (index === -1) {
		return { pathname: value, suffix: "" };
	}
	return { pathname: value.slice(0, index), suffix: value.slice(index) };
}

function normalizeSourcePath(filePath: string): string {
	const normalized = filePath.replace(/\\/g, "/");
	const srcIndex = normalized.indexOf("src/");
	if (srcIndex >= 0) {
		return normalized.slice(srcIndex);
	}
	return normalized.replace(/^\/+/, "");
}

function loadContentImageUrl(
	relativePath: string,
): Promise<string | undefined> {
	const key = `/${relativePath.replace(/\\/g, "/").replace(/^\/+/, "")}`;
	const cached = imageUrlCache.get(key);
	if (cached) {
		return cached;
	}

	const importer = contentImageImporters[key];
	if (!importer) {
		const missing = Promise.resolve(undefined);
		imageUrlCache.set(key, missing);
		return missing;
	}

	const loading = importer()
		.then(async (image) => {
			try {
				// Reuse Astro's optimized variants (the same files the pages use)
				// instead of serving the original full-size image.
				const optimized = await getImage({ src: image });
				return optimized.src;
			} catch (error: unknown) {
				console.warn(
					`[rss] Failed to optimize image "${key}", using the original instead:`,
					error,
				);
				return image.src;
			}
		})
		.catch((error: unknown) => {
			console.warn(`[rss] Failed to load image "${key}":`, error);
			return undefined;
		});
	imageUrlCache.set(key, loading);
	return loading;
}

function candidateAssetPaths(pathname: string, filePath: string): string[] {
	// Alias imports such as `@/assets/foo.png`.
	if (pathname.startsWith("@/")) {
		return [path.posix.join("src", pathname.slice(2))];
	}
	return [
		path.posix.normalize(
			path.posix.join(path.posix.dirname(filePath), pathname),
		),
	];
}

async function resolveImageSrc(
	rawSrc: string,
	context: ResolveContext,
): Promise<string> {
	const decoded = safeDecode(rawSrc.trim());
	if (!decoded || isAbsoluteUrl(decoded)) {
		return rawSrc;
	}
	if (decoded.startsWith("#")) {
		return toAbsoluteUrl(decoded, context.pageUrl);
	}
	// Root-relative paths are served from `public/`.
	if (decoded.startsWith("/")) {
		return toAbsoluteUrl(decoded, context.siteUrl);
	}

	const { pathname, suffix } = splitUrlSuffix(decoded);
	for (const candidate of candidateAssetPaths(pathname, context.filePath)) {
		const imageUrl = await loadContentImageUrl(candidate);
		if (imageUrl) {
			return `${toAbsoluteUrl(imageUrl, context.siteUrl)}${suffix}`;
		}
	}

	const fallback = toAbsoluteUrl(rawSrc, context.pageUrl);
	console.warn(
		`[rss] Could not resolve local image "${rawSrc}" from ${context.filePath}; falling back to ${fallback}`,
	);
	return fallback;
}

function resolveHref(rawHref: string, context: ResolveContext): string {
	const decoded = safeDecode(rawHref.trim());
	if (!decoded || isAbsoluteUrl(decoded)) {
		return rawHref;
	}
	if (decoded.startsWith("/")) {
		return toAbsoluteUrl(decoded, context.siteUrl);
	}
	// Relative links (including `#fragment`) are relative to the entry page.
	return toAbsoluteUrl(rawHref, context.pageUrl);
}

async function rewriteTokenUrls(
	tokens: MarkdownToken[],
	context: ResolveContext,
): Promise<void> {
	const tasks: Promise<void>[] = [];

	const visit = (tokenList: MarkdownToken[] | null) => {
		if (!tokenList) {
			return;
		}
		for (const token of tokenList) {
			if (token.type === "image") {
				const src = token.attrGet("src");
				if (src) {
					tasks.push(
						resolveImageSrc(src, context).then((resolved) => {
							token.attrSet("src", resolved);
						}),
					);
				}
			} else if (token.type === "link_open") {
				const href = token.attrGet("href");
				if (href) {
					token.attrSet("href", resolveHref(href, context));
				}
			}
			visit(token.children);
		}
	};

	visit(tokens);
	await Promise.all(tasks);
}

/**
 * Render a Markdown content body for an RSS feed: images and links are
 * rewritten to absolute URLs so feed readers can fetch them without knowing
 * the original post URL.
 */
export async function renderRssContent({
	entry,
	body,
	pageUrl,
	siteUrl,
}: RenderRssContentOptions): Promise<string> {
	const text = typeof body === "string" ? body : String(body ?? "");
	const cleaned = stripInvalidXmlChars(text);
	const env: Record<string, unknown> = {};
	const tokens = parser.parse(cleaned, env);

	const filePath = normalizeSourcePath(
		entry.filePath ??
			path.posix.join("src/content", entry.collection, entry.id),
	);

	await rewriteTokenUrls(tokens, {
		filePath,
		pageUrl: pageUrl instanceof URL ? pageUrl.href : pageUrl,
		siteUrl: siteUrl instanceof URL ? siteUrl.href : siteUrl,
	});

	const html = parser.renderer.render(tokens, parser.options, env);
	return sanitizeHtml(html, {
		allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
	});
}
