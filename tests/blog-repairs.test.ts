import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { shiftHeadingTree } from "../src/plugins/rehype-heading-hierarchy.mjs";
import {
	type ArchiveListItem,
	filterArchiveItems,
	sortArchiveItems,
} from "../src/utils/archive-list.ts";
import {
	includeInSitemap,
	isRedirectOnlyPath,
	legacyRedirects,
} from "../src/utils/legacy-redirects.ts";
import { paginationHref } from "../src/utils/pagination-url.ts";
import {
	excerptFromMarkdown,
	resolveMetaDescription,
} from "../src/utils/plain-text.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("passage pagination stays on /passage/ and notes stay on /notes/", () => {
	assert.equal(paginationHref("/passage/", 1, 1), "/passage/");
	assert.equal(paginationHref("/passage/", 1, 2), "/passage/2/");
	assert.equal(paginationHref("/passage/2/", 2, 1), "/passage/");
	assert.equal(paginationHref("/passage/2/", 2, 2), "/passage/2/");
	assert.equal(paginationHref("/notes/", 1, 2), "/notes/2/");
	assert.equal(paginationHref("/notes/3/", 3, 1), "/notes/");
});

test("description fallback skips image-only openings and blockquote markers", () => {
	const imageFirst = excerptFromMarkdown(
		"![半拍](./images/hanpai.jpg)\n\n「为了让半拍拥有灵魂，我误打误撞闯进了代码的世界。」\n",
	);
	assert.equal(imageFirst.startsWith("!"), false);
	assert.match(imageFirst, /^「为了让半拍拥有灵魂/);

	const quoted = excerptFromMarkdown(
		"> 人总是要量力而行的，去三叠泉的路就很适合作为一个生动的教材。\n\n下一句。\n",
	);
	assert.equal(quoted.startsWith(">"), false);
	assert.match(quoted, /^人总是要量力而行的/);

	assert.equal(
		resolveMetaDescription({
			explicit: "一篇清楚的说明",
			excerpt: "不该覆盖显式摘要",
			title: "标题",
			fallback: "站点副标题",
		}),
		"一篇清楚的说明",
	);
	assert.equal(
		resolveMetaDescription({
			explicit: "标题",
			excerpt: "正文里的第一段",
			title: "标题",
			fallback: "站点副标题",
		}),
		"正文里的第一段",
	);
	assert.equal(
		resolveMetaDescription({
			explicit: "",
			excerpt: "",
			title: "标题",
			fallback: "站点副标题",
		}),
		"站点副标题",
	);
});

test("body headings move under a single page h1 without changing ids", () => {
	const tree = {
		type: "root",
		children: [
			heading(1, "第一章", "di-yi-zhang"),
			heading(2, "小节", "xiao-jie"),
			heading(3, "再下一层", "next"),
		],
	};
	shiftHeadingTree(tree);
	assert.equal(tree.children[0].tagName, "h2");
	assert.equal(tree.children[1].tagName, "h3");
	assert.equal(tree.children[2].tagName, "h4");
	assert.equal(tree.children[0].properties.id, "di-yi-zhang");
	assert.equal(tree.children[0].properties.dataHeadingRank, "1");

	const rocky = {
		type: "root",
		children: [heading(3, "SSH", "ssh"), heading(4, "用户", "user")],
	};
	shiftHeadingTree(rocky);
	assert.equal(rocky.children[0].tagName, "h2");
	assert.equal(rocky.children[1].tagName, "h3");
	assert.equal(rocky.children[0].properties.dataHeadingRank, "3");
	assert.equal(rocky.children[0].properties.id, "ssh");
});

test("archive keeps essays and fiction, and categories stay on posts and notes", () => {
	const items: ArchiveListItem[] = [
		item("post", "p", "2026-01-02", ["linux"], "技术"),
		item("note", "n", "2026-01-03", ["css"], ""),
		item("essay", "e", "2026-01-04", ["随笔"], null),
		item("fiction", "f", "2026-01-01", ["叶洛华"], null),
	];
	const all = sortArchiveItems(items).map((entry) => entry.kind);
	assert.deepEqual(all, ["essay", "note", "post", "fiction"]);

	const byTag = filterArchiveItems(items, {
		tags: ["随笔"],
		categories: [],
		uncategorized: false,
	});
	assert.deepEqual(
		byTag.map((entry) => entry.kind),
		["essay"],
	);

	const byCategory = filterArchiveItems(items, {
		tags: [],
		categories: ["技术"],
		uncategorized: false,
	});
	assert.deepEqual(
		byCategory.map((entry) => entry.kind),
		["post"],
	);

	const uncategorized = filterArchiveItems(items, {
		tags: [],
		categories: [],
		uncategorized: true,
	});
	assert.deepEqual(
		uncategorized.map((entry) => entry.kind),
		["note"],
	);
});

test("sitemap skips legacy pagers and old public slugs", () => {
	assert.equal(includeInSitemap("https://blog.sheyiyuan.com/passage/"), true);
	assert.equal(includeInSitemap("https://blog.sheyiyuan.com/passage/2/"), true);
	assert.equal(includeInSitemap("https://blog.sheyiyuan.com/2/"), false);
	assert.equal(includeInSitemap("https://blog.sheyiyuan.com/friends/"), false);
	assert.equal(
		includeInSitemap("https://blog.sheyiyuan.com/posts/arch-linux中的conda/"),
		false,
	);
	assert.equal(
		includeInSitemap("https://blog.sheyiyuan.com/posts/arch-linux-conda/"),
		true,
	);
	assert.equal(isRedirectOnlyPath("/posts/邂逅/"), true);
	assert.equal(legacyRedirects["/posts/邂逅/"], "/fiction/unecpected-meeting/");
	assert.equal(
		legacyRedirects["/posts/arch-linux中的虚拟机kvm-软件安装/"],
		"/posts/arch-linux-kvm/",
	);

	for (const target of Object.values(legacyRedirects)) {
		const relative = target.replace(/\/$/, "");
		const full = path.join(root, "src/content", relative);
		assert.equal(statSync(full).isDirectory(), true, target);
	}
});

test("markdown links resolve to current pages", () => {
	const known = collectRoutes();
	const broken: string[] = [];
	for (const file of walk(path.join(root, "src/content"))) {
		if (!file.endsWith(".md") && !file.endsWith(".mdx")) continue;
		const markdown = readFileSync(file, "utf8");
		const base = publicBase(file);
		for (const href of markdownLinks(markdown)) {
			if (/^(https?:|mailto:|tel:)/i.test(href)) continue;
			if (href.startsWith("#")) continue;
			const resolved = new URL(href, `https://blog.sheyiyuan.com${base}`);
			if (resolved.origin !== "https://blog.sheyiyuan.com") continue;
			const pathname = resolved.pathname.endsWith("/")
				? resolved.pathname
				: `${resolved.pathname}/`;
			if (!known.has(pathname)) {
				broken.push(`${path.relative(root, file)} -> ${href} => ${pathname}`);
			}
		}
	}
	assert.deepEqual(broken, []);
});

function heading(depth: number, text: string, id: string) {
	return {
		type: "element",
		tagName: `h${depth}`,
		properties: { id },
		children: [{ type: "text", value: text }],
	};
}

function item(
	kind: ArchiveListItem["kind"],
	slug: string,
	published: string,
	tags: string[],
	category: string | null,
): ArchiveListItem {
	return {
		kind,
		slug,
		url: `/${kind}/${slug}/`,
		data: { title: slug, tags, category, published, pin: 0 },
	};
}

function walk(dir: string): string[] {
	const out: string[] = [];
	for (const name of readdirSync(dir)) {
		const full = path.join(dir, name);
		if (statSync(full).isDirectory()) out.push(...walk(full));
		else out.push(full);
	}
	return out;
}

function collectRoutes(): Set<string> {
	const routes = new Set<string>([
		"/",
		"/passage/",
		"/notes/",
		"/essays/",
		"/fiction/",
		"/archive/",
		"/about/",
		"/links/",
		"/rss.xml/",
	]);
	const addCollection = (collection: string, prefix: string) => {
		const dir = path.join(root, "src/content", collection);
		for (const name of readdirSync(dir)) {
			const full = path.join(dir, name);
			if (statSync(full).isDirectory()) routes.add(`${prefix}${name}/`);
			else if (name.endsWith(".md") || name.endsWith(".mdx")) {
				routes.add(`${prefix}${name.replace(/\.mdx?$/, "")}/`);
			}
		}
	};
	addCollection("posts", "/posts/");
	addCollection("notes", "/notes/");
	const fiction = path.join(root, "src/content/fiction");
	for (const work of readdirSync(fiction)) {
		const workDir = path.join(fiction, work);
		if (!statSync(workDir).isDirectory()) continue;
		routes.add(`/fiction/${work}/`);
		const chapters = path.join(workDir, "chapters");
		try {
			for (const chapter of readdirSync(chapters)) {
				if (!chapter.endsWith(".md") && !chapter.endsWith(".mdx")) continue;
				routes.add(`/fiction/${work}/${chapter.replace(/\.mdx?$/, "")}/`);
			}
		} catch {
			// A work can have no chapter directory.
		}
	}
	return routes;
}

function publicBase(file: string): string {
	const parts = path
		.relative(path.join(root, "src/content"), file)
		.split(path.sep);
	const [collection, slug, third, fourth] = parts;
	if (collection === "posts" || collection === "notes") {
		if (!slug) return `/${collection}/`;
		if (slug.endsWith(".md") || slug.endsWith(".mdx")) {
			return `/${collection}/${slug.replace(/\.mdx?$/, "")}/`;
		}
		return `/${collection}/${slug}/`;
	}
	if (collection === "fiction" && slug) {
		if (third === "chapters" && fourth) {
			return `/fiction/${slug}/${fourth.replace(/\.mdx?$/, "")}/`;
		}
		return `/fiction/${slug}/`;
	}
	return "/essays/";
}

function markdownLinks(markdown: string): string[] {
	const withoutFences = markdown.replace(/```[\s\S]*?```/g, "");
	const withoutInline = withoutFences.replace(/`[^`\n]*`/g, "");
	const hrefs: string[] = [];
	const pattern = /(!?)\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
	for (const match of withoutInline.matchAll(pattern)) {
		if (match[1] === "!") continue;
		hrefs.push(match[3]);
	}
	return hrefs;
}
