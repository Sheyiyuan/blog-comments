/**
 * Turn a slice of Markdown into readable plain text for titles and descriptions.
 * Image-only lines and raw blockquote markers are not left in the result.
 */
export function normalizeMetaText(value: string | null | undefined): string {
	if (!value) return "";

	let text = value.replace(/\r\n/g, "\n").trim();
	text = text.replace(/!\[[^\]]*]\([^)]*\)/g, " ");
	text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
	text = text.replace(/^(?:>\s*)+/gm, "");
	text = text.replace(/^#{1,6}\s+/gm, "");
	text = text.replace(/<\/?[^>]+>/g, " ");
	text = text.replace(/[*_~`]+/g, "");
	text = text.replace(/\s+/g, " ").trim();
	return text;
}

export function isUsableDescription(
	text: string,
	title?: string | null,
): boolean {
	if (!text) return false;
	if (!/[\p{L}\p{N}]/u.test(text)) return false;
	const normalizedTitle = (title ?? "").trim();
	if (normalizedTitle && text === normalizedTitle) return false;
	return true;
}

export function resolveMetaDescription(options: {
	explicit?: string | null;
	excerpt?: string | null;
	title?: string | null;
	fallback?: string | null;
}): string {
	const title = options.title ?? "";
	for (const candidate of [
		options.explicit,
		options.excerpt,
		options.fallback,
	]) {
		const text = normalizeMetaText(candidate);
		if (isUsableDescription(text, title)) return text;
	}
	return "";
}

function isSkippableOpening(line: string): boolean {
	if (!line) return true;
	if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) return true;
	if (/^<!--[\s\S]*-->$/.test(line)) return true;
	if (/^!\[[^\]]*]\([^)]*\)$/.test(line)) return true;
	return false;
}

/** First readable paragraph, skipping image-only openings and thematic breaks. */
export function firstMeaningfulMarkdown(rawBody: string): string {
	const lines = rawBody.split(/\r?\n/);
	let inFence = false;
	const buf: string[] = [];

	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (line.startsWith("```")) {
			if (buf.length > 0) break;
			inFence = !inFence;
			continue;
		}
		if (inFence) continue;
		if (!line) {
			if (buf.length > 0) break;
			continue;
		}
		if (buf.length === 0 && isSkippableOpening(line)) continue;
		buf.push(line);
	}

	return buf.join(" ");
}

export function excerptFromMarkdown(rawBody: string, maxLen = 160): string {
	const plain = normalizeMetaText(firstMeaningfulMarkdown(rawBody));
	if (!plain) return "";
	if (plain.length <= maxLen) return plain;
	return `${plain.slice(0, maxLen).trim()}…`;
}

export function titleFromMarkdown(rawBody: string): string {
	const lines = rawBody.split(/\r?\n/);
	let inFence = false;
	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (!line) continue;
		if (line.startsWith("```")) {
			inFence = !inFence;
			continue;
		}
		if (inFence) continue;
		if (isSkippableOpening(line)) continue;
		return normalizeMetaText(line);
	}
	return "";
}

export function toAbsoluteUrl(
	site: URL | string | undefined,
	value: string,
): string {
	if (/^https?:\/\//i.test(value)) return value;
	const base =
		site instanceof URL ? site : new URL(site || "https://blog.sheyiyuan.com/");
	return new URL(value, base).href;
}

export const DEFAULT_SHARE_IMAGE = "/icons/01.png";
