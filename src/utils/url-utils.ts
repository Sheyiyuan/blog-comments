import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";

export function pathsEqual(path1: string, path2: string) {
	const normalizedPath1 = path1.replace(/^\/|\/$/g, "").toLowerCase();
	const normalizedPath2 = path2.replace(/^\/|\/$/g, "").toLowerCase();
	return normalizedPath1 === normalizedPath2;
}

function joinUrl(...parts: string[]): string {
	const joined = parts.join("/");
	return joined.replace(/\/+/g, "/");
}

export function getPostUrlBySlug(slug: string): string {
	return url(`/posts/${slug}/`);
}

export function getNoteUrlBySlug(slug: string): string {
	return url(`/notes/${slug}/`);
}

export function getEssayUrlByRouteSlug(routeSlug: string): string {
	return url(`/essays/${routeSlug}/`);
}

export function getTagUrl(tag: string, basePath = "/archive/"): string {
	if (!tag) return url(basePath);
	return url(`${basePath}?tag=${encodeURIComponent(tag.trim())}`);
}

export function getCategoryUrl(
	category: string | null,
	basePath = "/archive/",
): string {
	if (
		!category ||
		category.trim() === "" ||
		category.trim().toLowerCase() === i18n(I18nKey.uncategorized).toLowerCase()
	)
		return url(`${basePath}?uncategorized=true`);
	return url(`${basePath}?category=${encodeURIComponent(category.trim())}`);
}

export function getDir(path: string): string {
	const lastSlashIndex = path.lastIndexOf("/");
	if (lastSlashIndex < 0) {
		return "/";
	}
	return path.substring(0, lastSlashIndex + 1);
}

export function url(path: string) {
	return joinUrl("", import.meta.env.BASE_URL, path);
}

export function isActiveLink(
	linkUrl: string,
	currentPath: string,
	external?: boolean,
): boolean {
	if (external) return false;

	const resolvedLink = url(linkUrl);
	const normalizedLink = resolvedLink.replace(/\/$/, "");
	const normalizedCurrent = currentPath.replace(/\/$/, "");

	if (linkUrl === "/") {
		return normalizedLink === normalizedCurrent;
	}

	return normalizedCurrent.startsWith(normalizedLink);
}
