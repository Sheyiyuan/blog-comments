import { type CollectionEntry, getCollection } from "astro:content";
import getReadingTime from "reading-time";

export type FictionOrigin = "original" | "fanfic";
export type FictionStatus = "ongoing" | "complete" | "hiatus";
export type FictionShelf = "serial" | "short" | "fanfic";

export type FictionChapter = {
	slug: string;
	order: number;
	title: string;
	published: Date;
	updated?: Date;
	draft: boolean;
	comments: boolean;
	words: number;
	entry: CollectionEntry<"fiction">;
};

export type FictionWork = {
	slug: string;
	title: string;
	published: Date;
	updated?: Date;
	draft: boolean;
	synopsis: string;
	cover: string;
	origin: FictionOrigin;
	fandom: string;
	series: string;
	tags: string[];
	status: FictionStatus;
	lang: string;
	comments: boolean;
	shelf: FictionShelf;
	isSerial: boolean;
	activityTime: number;
	chapterCount: number;
	words: number;
	latestChapter: FictionChapter | null;
	chapters: FictionChapter[];
	entry: CollectionEntry<"fiction">;
};

type ClassifiedChapter = {
	kind: "chapter";
	entry: CollectionEntry<"fiction">;
	workSlug: string;
	chapterSlug: string;
	order: number;
};

function stripCollectionId(id: string): string {
	return id.replace(/\\/g, "/").replace(/\.mdx?$/i, "");
}

function classifyEntry(
	entry: CollectionEntry<"fiction">,
): { kind: "work"; slug: string } | ClassifiedChapter {
	const id = stripCollectionId(entry.id);
	const chapterMatch = id.match(/^([^/]+)\/chapters\/([^/]+)$/);
	if (chapterMatch) {
		const chapterSlug = chapterMatch[2];
		// 章节文件名统一为 5 位定长序号，前导零必须写全：00001.md 或 00001-标题.md
		const orderMatch = chapterSlug.match(/^(\d{5})(?:-|$)/);
		if (!orderMatch) {
			throw new Error(
				`外篇章节 ${entry.id} 的文件名需要以 5 位序号开头，例如 00001.md 或 00001-遗书.md`,
			);
		}
		return {
			entry,
			kind: "chapter",
			workSlug: chapterMatch[1],
			chapterSlug,
			order: Number(orderMatch[1]),
		};
	}

	const workMatch = id.match(/^([^/]+)\/index$/);
	if (workMatch) {
		return { kind: "work", slug: workMatch[1] };
	}

	throw new Error(
		`外篇 ${entry.id} 应放在「作品名/index.md」，章节放在「作品名/chapters/00001.md」`,
	);
}

function isVisible(draft: boolean): boolean {
	return import.meta.env.PROD ? draft !== true : true;
}

/**
 * 正文里去掉图片、链接地址与常见标记后再计数。
 * 中文按字计，西文按词计，与阅读页的 remark-reading-time 口径接近。
 */
export function countFictionWords(body: string): number {
	const plain = body
		.replace(/```[\s\S]*?```/g, " ")
		.replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
		.replace(/^\s{0,3}#{1,6}\s*/gm, "")
		.replace(/[>*_`~]/g, " ");
	return Math.max(1, Math.round(getReadingTime(plain).words));
}

function toChapter(classified: ClassifiedChapter): FictionChapter {
	const data = classified.entry.data;
	return {
		slug: classified.chapterSlug,
		order: classified.order,
		title: data.title,
		published: data.published,
		updated: data.updated,
		draft: data.draft,
		comments: data.comments,
		words: countFictionWords(classified.entry.body ?? ""),
		entry: classified.entry,
	};
}

export async function getFictionWorks(): Promise<FictionWork[]> {
	const entries = await getCollection("fiction");
	const chapterGroups = new Map<string, ClassifiedChapter[]>();
	const workEntries: { entry: CollectionEntry<"fiction">; slug: string }[] = [];

	for (const entry of entries) {
		const classified = classifyEntry(entry);
		if (classified.kind === "work") {
			workEntries.push({ entry, slug: classified.slug });
			continue;
		}
		const group = chapterGroups.get(classified.workSlug) ?? [];
		group.push(classified);
		chapterGroups.set(classified.workSlug, group);
	}

	const workSlugs = new Set(workEntries.map((work) => work.slug));
	for (const workSlug of chapterGroups.keys()) {
		if (!workSlugs.has(workSlug)) {
			throw new Error(
				`外篇章节指向了不存在的作品「${workSlug}」。请补上 ${workSlug}/index.md`,
			);
		}
	}

	const works: FictionWork[] = workEntries.map(({ entry, slug }) => {
		const data = entry.data;
		if (!data.origin) {
			throw new Error(`外篇「${slug}」需要填写 origin: original 或 fanfic`);
		}
		const fandom = data.fandom.trim();
		if (data.origin === "fanfic" && !fandom) {
			throw new Error(`同人「${slug}」需要填写 fandom`);
		}

		const grouped = chapterGroups.get(slug) ?? [];
		const orders = new Set<number>();
		for (const chapter of grouped) {
			if (orders.has(chapter.order)) {
				throw new Error(`外篇「${slug}」的章节序号 ${chapter.order} 重复了`);
			}
			orders.add(chapter.order);
		}

		const allChapters = grouped
			.map(toChapter)
			.sort(
				(a, b) => a.order - b.order || a.slug.localeCompare(b.slug, "zh-CN"),
			);
		const declaredSerial =
			data.status === "ongoing" || data.status === "hiatus";
		const isSerial = allChapters.length > 0 || declaredSerial;
		const shelf: FictionShelf =
			data.origin === "fanfic" ? "fanfic" : isSerial ? "serial" : "short";
		const status: FictionStatus = isSerial
			? (data.status ?? "ongoing")
			: "complete";
		const chapters = allChapters.filter((chapter) => isVisible(chapter.draft));
		const activityTime = Math.max(
			data.updated?.getTime() ?? 0,
			data.published.getTime(),
			...chapters.map((chapter) => chapter.published.getTime()),
		);
		const chapterWords = allChapters.reduce(
			(sum, chapter) => sum + chapter.words,
			0,
		);
		const words =
			chapterWords > 0 ? chapterWords : countFictionWords(entry.body ?? "");

		return {
			slug,
			title: data.title,
			published: data.published,
			updated: data.updated,
			draft: data.draft,
			synopsis: data.synopsis.trim(),
			cover: data.cover,
			origin: data.origin,
			fandom,
			series: data.series.trim(),
			tags: data.tags,
			status,
			lang: data.lang,
			comments: data.comments,
			shelf,
			isSerial,
			activityTime,
			chapterCount: chapters.length,
			words,
			latestChapter: chapters.length > 0 ? chapters[chapters.length - 1] : null,
			chapters,
			entry,
		};
	});

	return works
		.filter((work) => isVisible(work.draft))
		.sort(
			(a, b) =>
				b.activityTime - a.activityTime ||
				a.slug.localeCompare(b.slug, "zh-CN"),
		);
}

export function fictionStatusKey(
	status: FictionStatus,
): "fictionOngoing" | "fictionComplete" | "fictionHiatus" {
	if (status === "ongoing") return "fictionOngoing";
	if (status === "hiatus") return "fictionHiatus";
	return "fictionComplete";
}

/**
 * 阅读进度写在 localStorage，键名由服务端与客户端脚本共用。
 * 值形如 {"chapter":"02-天台上的花","order":2,"total":4,"done":false,"at":1760000000000}
 */
export const FICTION_PROGRESS_PREFIX = "fiction:read:";

export function formatFictionNumber(value: number): string {
	return new Intl.NumberFormat("en-US").format(value);
}

export function fictionCopyrightNotice(work: {
	origin: FictionOrigin;
	fandom: string;
}): string {
	if (work.origin === "fanfic") {
		const source = work.fandom ? `《${work.fandom}》` : "";
		return `本篇为${source}同人作品。原作角色与世界观的权利归原权利人所有。作者保留自己撰写的文字，未经许可不得转载，禁止商业使用。`;
	}
	return "版权所有，未经许可不得转载或用于商业用途。";
}
