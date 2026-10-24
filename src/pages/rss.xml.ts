import rss from "@astrojs/rss";
import {
	getSortedEssays,
	getSortedNotes,
	getSortedPosts,
} from "@utils/content-utils";
import {
	getEssayDisplayTitle,
	getEssayExcerptFromBody,
	getEssayRouteSlug,
} from "@utils/essay-utils";
import { getFictionWorks } from "@utils/fiction-utils";
import { renderRssContent } from "@utils/rss-utils";
import {
	getEssayUrlByRouteSlug,
	getFictionChapterUrl,
	getFictionWorkUrl,
	url,
} from "@utils/url-utils";
import type { APIContext } from "astro";
import { siteConfig } from "@/config";

function itemCategories(base: string, extra?: string | null): string[] {
	const categories = [base];
	const trimmed = extra?.trim();
	if (trimmed) {
		categories.push(trimmed);
	}
	return categories;
}

export async function GET(context: APIContext) {
	const [posts, notes, essays, fictionWorks] = await Promise.all([
		getSortedPosts(),
		getSortedNotes(),
		getSortedEssays(),
		getFictionWorks(),
	]);

	const site = context.site ?? "https://fuwari.vercel.app";
	const absoluteUrl = (pathname: string) => new URL(pathname, site).href;
	const feedUrl = absoluteUrl(url("rss.xml"));

	const postItems = await Promise.all(
		posts.map(async (post) => {
			const link = absoluteUrl(url(`/posts/${post.slug}/`));
			return {
				title: post.data.title,
				pubDate: post.data.published,
				description: post.data.description || "",
				categories: itemCategories("篇章", post.data.category),
				link,
				content: await renderRssContent({
					entry: post,
					body: post.body,
					pageUrl: link,
					siteUrl: site,
				}),
			};
		}),
	);

	const noteItems = await Promise.all(
		notes.map(async (note) => {
			const link = absoluteUrl(url(`/notes/${note.slug}/`));
			return {
				title: note.data.title,
				pubDate: note.data.published,
				description: note.data.description || "",
				categories: ["笔记"],
				link,
				content: await renderRssContent({
					entry: note,
					body: note.body,
					pageUrl: link,
					siteUrl: site,
				}),
			};
		}),
	);

	const essayItems = await Promise.all(
		essays.map(async (entry) => {
			const routeSlug = getEssayRouteSlug(entry);
			const link = absoluteUrl(getEssayUrlByRouteSlug(routeSlug));
			return {
				title: getEssayDisplayTitle(entry),
				pubDate: entry.data.published,
				description: getEssayExcerptFromBody(entry.body) || "",
				categories: ["随笔"],
				link,
				content: await renderRssContent({
					entry,
					body: entry.body,
					pageUrl: link,
					siteUrl: site,
				}),
			};
		}),
	);

	const fictionItems = (
		await Promise.all(
			fictionWorks.map(async (work) => {
				const categories = itemCategories("外篇", "小说");
				categories.push(work.origin === "fanfic" ? "同人" : "原创");
				if (work.fandom) {
					categories.push(work.fandom);
				}

				if (work.isSerial && work.chapters.length > 0) {
					return Promise.all(
						work.chapters.map(async (chapter) => {
							const link = absoluteUrl(
								getFictionChapterUrl(work.slug, chapter.slug),
							);
							return {
								title: `${work.title} · ${chapter.title}`,
								pubDate: chapter.published,
								description: work.synopsis || "",
								categories: [...categories],
								link,
								content: await renderRssContent({
									entry: chapter.entry,
									body: chapter.entry.body,
									pageUrl: link,
									siteUrl: site,
								}),
							};
						}),
					);
				}

				const link = absoluteUrl(getFictionWorkUrl(work.slug));
				return [
					{
						title: work.title,
						pubDate: work.published,
						description: work.synopsis || "",
						categories: [...categories],
						link,
						content: await renderRssContent({
							entry: work.entry,
							body: work.entry.body,
							pageUrl: link,
							siteUrl: site,
						}),
					},
				];
			}),
		)
	).flat();

	const items = [
		...postItems,
		...noteItems,
		...essayItems,
		...fictionItems,
	].sort(
		(a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
	);

	return rss({
		title: siteConfig.title,
		description: siteConfig.subtitle || "No description",
		site,
		items,
		xmlns: { atom: "http://www.w3.org/2005/Atom" },
		customData: [
			`<language>${siteConfig.lang}</language>`,
			`<atom:link href="${feedUrl}" rel="self" type="application/rss+xml"/>`,
		].join(""),
	});
}
