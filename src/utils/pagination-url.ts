/**
 * Numbered links follow the route that rendered the pager.
 * Page 1 stays on that section root (`/passage/`, `/notes/`) instead of the site home.
 */
export function paginationBase(
	currentUrl: string,
	currentPage: number,
): string {
	const withSlash = currentUrl.endsWith("/") ? currentUrl : `${currentUrl}/`;
	if (currentPage <= 1) return withSlash;

	const suffix = `${currentPage}/`;
	if (withSlash.endsWith(`/${suffix}`)) {
		return withSlash.slice(0, -suffix.length);
	}
	return withSlash;
}

export function paginationHref(
	currentUrl: string,
	currentPage: number,
	targetPage: number,
): string {
	const base = paginationBase(currentUrl, currentPage);
	if (targetPage <= 1) return base;
	return `${base}${targetPage}/`;
}
