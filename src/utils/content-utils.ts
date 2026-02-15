import { type CollectionEntry, getCollection } from "astro:content";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { getCategoryUrl } from "@utils/url-utils.ts";

type ContentCollection = "posts" | "notes" | "essays";
type ContentScope = ContentCollection | "all";

function resolveCollections(scope: ContentScope): ContentCollection[] {
	if (scope === "all") return ["posts", "notes", "essays"];
	return [scope];
}

function resolveListBasePath(contentType: ContentScope): string {
	if (contentType === "notes") return "/notes/";
	if (contentType === "essays") return "/essays/";
	return "/archive/";
}

// // Retrieve posts and sort them by publication date
async function getRawSortedPosts() {
	const allBlogPosts = await getCollection("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	const sorted = allBlogPosts.sort((a, b) => {
		const pinA = Number(a.data.pin ?? 0);
		const pinB = Number(b.data.pin ?? 0);
		if (pinA !== pinB) return pinB - pinA;

		const dateA = new Date(a.data.published).getTime();
		const dateB = new Date(b.data.published).getTime();
		if (dateA !== dateB) return dateB - dateA;

		// Tie-breaker: stable-ish deterministic sort
		return a.slug.localeCompare(b.slug);
	});
	return sorted;
}

async function getRawSortedNotes() {
	const allNotes = await getCollection("notes", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	const sorted = allNotes.sort((a, b) => {
		const pinA = Number(a.data.pin ?? 0);
		const pinB = Number(b.data.pin ?? 0);
		if (pinA !== pinB) return pinB - pinA;

		const dateA = new Date(a.data.published).getTime();
		const dateB = new Date(b.data.published).getTime();
		if (dateA !== dateB) return dateB - dateA;

		return a.slug.localeCompare(b.slug);
	});
	return sorted;
}

export async function getSortedPosts() {
	const sorted = await getRawSortedPosts();

	for (let i = 1; i < sorted.length; i++) {
		sorted[i].data.nextSlug = sorted[i - 1].slug;
		sorted[i].data.nextTitle = sorted[i - 1].data.title;
	}
	for (let i = 0; i < sorted.length - 1; i++) {
		sorted[i].data.prevSlug = sorted[i + 1].slug;
		sorted[i].data.prevTitle = sorted[i + 1].data.title;
	}

	return sorted;
}

export async function getSortedNotes() {
	const sorted = await getRawSortedNotes();

	for (let i = 1; i < sorted.length; i++) {
		sorted[i].data.nextSlug = sorted[i - 1].slug;
		sorted[i].data.nextTitle = sorted[i - 1].data.title;
	}
	for (let i = 0; i < sorted.length - 1; i++) {
		sorted[i].data.prevSlug = sorted[i + 1].slug;
		sorted[i].data.prevTitle = sorted[i + 1].data.title;
	}

	return sorted;
}
export type PostForList = {
	slug: string;
	data: CollectionEntry<"posts">["data"];
};
export async function getSortedPostsList(): Promise<PostForList[]> {
	const sortedFullPosts = await getRawSortedPosts();

	// delete post.body
	const sortedPostsList = sortedFullPosts.map((post) => ({
		slug: post.slug,
		data: post.data,
	}));

	return sortedPostsList;
}

export type NoteForList = {
	slug: string;
	data: CollectionEntry<"notes">["data"];
};

export async function getSortedNotesList(): Promise<NoteForList[]> {
	const sortedFullNotes = await getRawSortedNotes();

	return sortedFullNotes.map((note) => ({
		slug: note.slug,
		data: note.data,
	}));
}
export type Tag = {
	name: string;
	count: number;
};

export async function getTagList(
	contentType: ContentScope = "posts",
): Promise<Tag[]> {
	const collections = resolveCollections(contentType);
	const grouped = await Promise.all(
		collections.map((collection) =>
			getCollection(collection, ({ data }) => {
				return import.meta.env.PROD ? data.draft !== true : true;
			}),
		),
	);
	const allBlogPosts = grouped.flat();

	const countMap: { [key: string]: number } = {};
	allBlogPosts.forEach((post: { data: { tags: string[] } }) => {
		post.data.tags.forEach((tag: string) => {
			if (!countMap[tag]) countMap[tag] = 0;
			countMap[tag]++;
		});
	});

	// sort tags
	const collatorEn = new Intl.Collator("en", { sensitivity: "base" });
	const collatorZh = new Intl.Collator("zh-CN", { sensitivity: "base" });
	const hasChinese = (value: string) => /[\u4E00-\u9FFF]/.test(value);
	const keys: string[] = Object.keys(countMap).sort((a, b) => {
		const aHasZh = hasChinese(a);
		const bHasZh = hasChinese(b);
		if (aHasZh !== bHasZh) return aHasZh ? 1 : -1; // 英文/非中文在前

		return aHasZh ? collatorZh.compare(a, b) : collatorEn.compare(a, b);
	});

	return keys.map((key) => ({ name: key, count: countMap[key] }));
}

export type Category = {
	name: string;
	count: number;
	url: string;
};

export async function getCategoryList(
	contentType: ContentScope = "posts",
): Promise<Category[]> {
	const collections = resolveCollections(contentType);
	const grouped = await Promise.all(
		collections.map((collection) =>
			getCollection(collection, ({ data }) => {
				return import.meta.env.PROD ? data.draft !== true : true;
			}),
		),
	);
	const allBlogPosts = grouped.flat();
	const count: { [key: string]: number } = {};
	allBlogPosts.forEach((post) => {
		if (!("category" in post.data)) {
			return;
		}

		const category = post.data.category;
		if (!category) {
			const ucKey = i18n(I18nKey.uncategorized);
			count[ucKey] = count[ucKey] ? count[ucKey] + 1 : 1;
			return;
		}

		const categoryName =
			typeof category === "string" ? category.trim() : String(category).trim();

		count[categoryName] = count[categoryName] ? count[categoryName] + 1 : 1;
	});

	const lst = Object.keys(count).sort((a, b) => {
		return a.toLowerCase().localeCompare(b.toLowerCase());
	});

	const ret: Category[] = [];
	const basePath = resolveListBasePath(contentType);
	for (const c of lst) {
		ret.push({
			name: c,
			count: count[c],
			url: getCategoryUrl(c, basePath),
		});
	}
	return ret;
}

// ===== Essays (随笔) =====

async function getRawSortedEssays() {
	const allEssays = await getCollection("essays", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	const sorted = allEssays.sort((a, b) => {
		const pinA = Number(a.data.pin ?? 0);
		const pinB = Number(b.data.pin ?? 0);
		if (pinA !== pinB) return pinB - pinA;

		const dateA = new Date(a.data.published).getTime();
		const dateB = new Date(b.data.published).getTime();
		if (dateA !== dateB) return dateB - dateA;

		// Tie-breaker: stable-ish deterministic sort
		return a.slug.localeCompare(b.slug);
	});

	return sorted;
}

export async function getSortedEssays() {
	return getRawSortedEssays();
}

export type EssayForList = {
	entry: CollectionEntry<"essays">;
};

export async function getSortedEssaysList(): Promise<EssayForList[]> {
	const sortedFullEssays = await getRawSortedEssays();
	return sortedFullEssays.map((entry) => ({ entry }));
}
