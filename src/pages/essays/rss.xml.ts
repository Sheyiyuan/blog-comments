import rss from "@astrojs/rss";
import { getSortedEssays } from "@utils/content-utils";
import {
	getEssayDisplayTitle,
	getEssayExcerptFromBody,
	getEssayRouteSlug,
} from "@utils/essay-utils";
import { getEssayUrlByRouteSlug } from "@utils/url-utils";
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

export async function GET(context: APIContext) {
	const essays = await getSortedEssays();

	return rss({
		title: `${siteConfig.title} · 随笔`,
		description: "短篇记录与碎片化想法",
		site: context.site ?? "https://fuwari.vercel.app",
		items: essays.map((entry) => {
			const content =
				typeof entry.body === "string" ? entry.body : String(entry.body || "");
			const cleanedContent = stripInvalidXmlChars(content);
			const routeSlug = getEssayRouteSlug(entry);
			return {
				title: getEssayDisplayTitle(entry),
				pubDate: entry.data.published,
				description: getEssayExcerptFromBody(entry.body) || "",
				link: getEssayUrlByRouteSlug(routeSlug),
				content: sanitizeHtml(parser.render(cleanedContent), {
					allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
				}),
			};
		}),
		customData: `<language>${siteConfig.lang}</language>`,
	});
}
