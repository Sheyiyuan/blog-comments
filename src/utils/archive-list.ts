export type ArchiveKind = "post" | "note" | "essay" | "fiction";

export type ArchiveListItem = {
	slug: string;
	url: string;
	kind: ArchiveKind;
	data: {
		title: string;
		tags: string[];
		category?: string | null;
		published: Date | string;
		pin?: number;
	};
};

export type ArchiveQuery = {
	tags: string[];
	categories: string[];
	uncategorized: boolean;
};

/** Essays and fiction do not use the post/note category field. */
export function supportsCategory(kind: ArchiveKind): boolean {
	return kind === "post" || kind === "note";
}

export function sortArchiveItems(items: ArchiveListItem[]): ArchiveListItem[] {
	return [...items].sort((a, b) => {
		const pinA = Number(a.data.pin ?? 0);
		const pinB = Number(b.data.pin ?? 0);
		if (pinA !== pinB) return pinB - pinA;

		const dateA = new Date(a.data.published).getTime();
		const dateB = new Date(b.data.published).getTime();
		if (dateA !== dateB) return dateB - dateA;

		return a.slug.localeCompare(b.slug);
	});
}

export function filterArchiveItems(
	items: ArchiveListItem[],
	query: ArchiveQuery,
): ArchiveListItem[] {
	let filtered = items;

	if (query.tags.length > 0) {
		filtered = filtered.filter((item) =>
			(item.data.tags ?? []).some((tag) => query.tags.includes(tag)),
		);
	}

	if (query.categories.length > 0) {
		filtered = filtered.filter(
			(item) =>
				supportsCategory(item.kind) &&
				!!item.data.category &&
				query.categories.includes(item.data.category),
		);
	}

	if (query.uncategorized) {
		filtered = filtered.filter(
			(item) => supportsCategory(item.kind) && !item.data.category,
		);
	}

	return filtered;
}
