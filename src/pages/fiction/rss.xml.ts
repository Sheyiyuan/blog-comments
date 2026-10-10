import rss from "@astrojs/rss";
import { getFictionWorks } from "@utils/fiction-utils";
import { getFictionChapterUrl, getFictionWorkUrl } from "@utils/url-utils";
import type { APIContext } from "astro";
import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";
import { siteConfig } from "@/config";

const parser = new MarkdownIt();

function stripInvalidXmlChars(str: string): string {
	return str.replace(
		// biome-ignore lint/suspicious/noControlCharactersInRegex: https://www.w3.org/TR/xml/#charsets
		/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFDD0-\uFDEF\uFFFE\uFFFF]/g,
		"",
	);
}

function renderAndSanitize(content: string): string {
	return sanitizeHtml(parser.render(stripInvalidXmlChars(content)), {
		allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
	});
}

export async function GET(context: APIContext) {
	const works = await getFictionWorks();
	const items = works.flatMap((work) => {
		if (!work.isSerial) {
			return [
				{
					title: work.title,
					pubDate: work.published,
					description: work.synopsis,
					link: getFictionWorkUrl(work.slug),
					content: renderAndSanitize(work.entry.body ?? ""),
				},
			];
		}
		return work.chapters.map((chapter) => ({
			title: `${work.title} · ${chapter.title}`,
			pubDate: chapter.published,
			description: work.synopsis,
			link: getFictionChapterUrl(work.slug, chapter.slug),
			content: renderAndSanitize(chapter.entry.body ?? ""),
		}));
	});

	items.sort(
		(a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
	);

	return rss({
		title: `${siteConfig.title} · 外篇`,
		description: "短篇、同人与长篇",
		site: context.site ?? "https://fuwari.vercel.app",
		items,
		customData: `<language>${siteConfig.lang}</language>`,
	});
}
