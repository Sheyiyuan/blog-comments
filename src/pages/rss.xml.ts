import rss from "@astrojs/rss";
import {
  getSortedEssays,
  getSortedNotes,
  getSortedPosts,
} from "@utils/content-utils";
import {
  getEssayRouteSlug,
  getEssayDisplayTitle,
  getEssayExcerptFromBody,
} from "@utils/essay-utils";
import { getEssayUrlByRouteSlug, url } from "@utils/url-utils";
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

function renderAndSanitize(content: unknown): string {
  const text = typeof content === "string" ? content : String(content || "");
  const cleaned = stripInvalidXmlChars(text);
  return sanitizeHtml(parser.render(cleaned), {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
  });
}

export async function GET(context: APIContext) {
  const [posts, notes, essays] = await Promise.all([
    getSortedPosts(),
    getSortedNotes(),
    getSortedEssays(),
  ]);

  const postItems = posts.map((post) => ({
    title: post.data.title,
    pubDate: post.data.published,
    description: post.data.description || "",
    link: url(`/posts/${post.slug}/`),
    content: renderAndSanitize(post.body),
  }));

  const noteItems = notes.map((note) => ({
    title: note.data.title,
    pubDate: note.data.published,
    description: note.data.description || "",
    link: url(`/notes/${note.slug}/`),
    content: renderAndSanitize(note.body),
  }));

  const essayItems = essays.map((entry) => {
    const routeSlug = getEssayRouteSlug(entry);
    return {
      title: getEssayDisplayTitle(entry),
      pubDate: entry.data.published,
      description: getEssayExcerptFromBody(entry.body) || "",
      link: getEssayUrlByRouteSlug(routeSlug),
      content: renderAndSanitize(entry.body),
    };
  });

  const items = [...postItems, ...noteItems, ...essayItems].sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
  );

  return rss({
    title: siteConfig.title,
    description: siteConfig.subtitle || "No description",
    site: context.site ?? "https://fuwari.vercel.app",
    items,
    customData: `<language>${siteConfig.lang}</language>`,
  });
}
