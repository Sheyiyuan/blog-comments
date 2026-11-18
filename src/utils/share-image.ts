import path from "node:path";
import { DEFAULT_SHARE_IMAGE, toAbsoluteUrl } from "@utils/plain-text";

const files = import.meta.glob<ImageMetadata>(
	"../**/*.{png,jpg,jpeg,webp,gif,avif,svg}",
	{ import: "default" },
);

/**
 * Resolve a content-relative image to the URL Astro will emit.
 * Missing files fall back to the site icon in `public/icons/01.png`.
 */
export async function resolveShareImage(
	site: URL | undefined,
	src: string | null | undefined,
	basePath = "",
): Promise<string> {
	const fallback = toAbsoluteUrl(site, DEFAULT_SHARE_IMAGE);
	const image = (src ?? "").trim();
	if (!image) return fallback;
	if (/^https?:\/\//i.test(image)) return image;
	if (image.startsWith("/")) return toAbsoluteUrl(site, image);

	const normalizedPath = path
		.normalize(path.join("../", basePath, image))
		.replace(/\\/g, "/");
	const load = files[normalizedPath];
	if (!load) {
		console.warn(`[share-image] not found: ${normalizedPath}`);
		return fallback;
	}
	const meta = await load();
	if (!meta?.src) return fallback;
	return toAbsoluteUrl(site, meta.src);
}
