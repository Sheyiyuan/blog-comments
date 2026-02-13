#!/usr/bin/env node
/* Interactive content creator for Fuwari Blog (Astro content collections) */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import readline from "node:readline/promises";

const ROOT = process.cwd();
const POSTS_DIR = path.join(ROOT, "src", "content", "posts");
const ESSAYS_DIR = path.join(ROOT, "src", "content", "essays");

function formatDate(d) {
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function formatDateTime(d) {
	const date = formatDate(d);
	const hour = String(d.getHours()).padStart(2, "0");
	const minute = String(d.getMinutes()).padStart(2, "0");
	return `${date} ${hour}:${minute}`;
}

function slugifyTitle(title) {
	const sanitized = title
		.trim()
		.toLowerCase()
		.replace(/[\\/:*?"<>|]/g, " ")
		.replace(/[^\p{L}\p{N}\s_-]+/gu, "")
		.replace(/[\s_]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-+|-+$/g, "");

	if (sanitized.length > 0) return sanitized;
	const now = new Date();
	return `${formatDate(now)}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseFrontmatterCategory(markdown) {
	if (!markdown.startsWith("---")) return null;
	const end = markdown.indexOf("\n---", 3);
	if (end === -1) return null;
	const frontmatter = markdown.slice(3, end);
	const match = frontmatter.match(/^\s*category\s*:\s*(.*?)\s*$/m);
	if (!match) return null;
	let value = match[1].trim();
	if (value === "" || value === "''" || value === '""') return null;
	if (
		(value.startsWith('"') && value.endsWith('"')) ||
		(value.startsWith("'") && value.endsWith("'"))
	) {
		value = value.slice(1, -1);
	}
	return value.trim() || null;
}

function walkMarkdownFiles(dir) {
	/** @type {string[]} */
	const result = [];
	/** @type {string[]} */
	const stack = [dir];

	while (stack.length > 0) {
		const current = stack.pop();
		if (!current) continue;

		let entries;
		try {
			entries = fs.readdirSync(current, { withFileTypes: true });
		} catch {
			continue;
		}

		for (const entry of entries) {
			const full = path.join(current, entry.name);
			if (entry.isDirectory()) {
				stack.push(full);
				continue;
			}
			if (!entry.isFile()) continue;
			if (/\.(md|mdx)$/i.test(entry.name)) result.push(full);
		}
	}

	return result;
}

function collectExistingPostCategories() {
	const files = walkMarkdownFiles(POSTS_DIR);
	const categories = new Set();

	for (const file of files) {
		let content;
		try {
			content = fs.readFileSync(file, "utf8");
		} catch {
			continue;
		}
		const category = parseFrontmatterCategory(content);
		if (category) categories.add(category);
	}

	return [...categories].sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
}

function printDivider() {
	process.stdout.write(`\n${"-".repeat(56)}\n`);
}

function printHelp() {
	console.log(
		"交互式新建稿件工具\n\n用法:\n  pnpm new\n\n选项:\n  --dry-run   仅输出将创建的路径与 frontmatter（不落盘）\n\n说明:\n  - 交互式选择类型（篇章/随笔）、格式（文件夹/单文件）、标题、（篇章）分类、时间\n  - 默认创建“文件夹模式”：<slug>/index.md\n",
	);
}

async function promptSelect(rl, message, options, defaultIndex = 0) {
	printDivider();
	console.log(message);
	options.forEach((opt, i) => {
		const isDefault = i === defaultIndex;
		console.log(`  ${i + 1}) ${opt}${isDefault ? " (默认)" : ""}`);
	});

	while (true) {
		const raw = (
			await rl.question(`请选择 [1-${options.length}] (回车默认): `)
		).trim();
		if (raw === "") return options[defaultIndex];
		const num = Number(raw);
		if (Number.isInteger(num) && num >= 1 && num <= options.length) {
			return options[num - 1];
		}
		console.log("输入无效，请输入编号。");
	}
}

async function promptInput(
	rl,
	message,
	{ defaultValue = "", required = false, validate } = {},
) {
	printDivider();
	while (true) {
		const suffix = defaultValue ? ` (默认: ${defaultValue})` : "";
		const raw = (await rl.question(`${message}${suffix}: `)).trim();
		const value = raw === "" ? defaultValue : raw;

		if (required && value.trim() === "") {
			console.log("此项为必填。");
			continue;
		}
		if (validate) {
			const ok = validate(value);
			if (ok !== true) {
				console.log(typeof ok === "string" ? ok : "输入不合法。");
				continue;
			}
		}
		return value;
	}
}

function ensureDir(dirPath) {
	if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function buildPostFrontmatter({ title, published, category }) {
	return (
		"---\n" +
		`title: ${JSON.stringify(title)}\n` +
		`published: ${published}\n` +
		`description: ""\n` +
		`image: ""\n` +
		`firstLineIndent: "0em"\n` +
		"tags: []\n" +
		`category: ${category ? JSON.stringify(category) : '""'}\n` +
		"draft: true\n" +
		"pin: 0\n" +
		`lang: ""\n` +
		"comments: true\n" +
		"sponsor: true\n" +
		"---\n\n"
	);
}

function buildEssayFrontmatter({ title, published }) {
	return (
		"---\n" +
		`published: ${published}\n` +
		`title: ${JSON.stringify(title)}\n` +
		`tags: ["随笔"]\n` +
		"pin: 0\n" +
		"comments: true\n" +
		"draft: true\n" +
		`slugSeed: ""\n` +
		"---\n\n"
	);
}

function validateDateOrDateTime(value) {
	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return true;
	if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}$/.test(value)) return true;
	return "请输入 YYYY-MM-DD 或 YYYY-MM-DD HH:mm";
}

async function main() {
	const args = process.argv.slice(2);
	const dryRun = args.includes("--dry-run");
	if (args.includes("-h") || args.includes("--help")) {
		printHelp();
		return;
	}

	if (!fs.existsSync(POSTS_DIR) || !fs.existsSync(ESSAYS_DIR)) {
		console.error(
			"未找到 src/content/posts 或 src/content/essays，请在项目根目录运行。",
		);
		process.exitCode = 1;
		return;
	}

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	try {
		console.log("交互式新建稿件 (pnpm new)\n");

		const typeLabel = await promptSelect(
			rl,
			"选择类型",
			["篇章 (posts)", "随笔 (essays)"],
			0,
		);
		const isPost = typeLabel.startsWith("篇章");

		const structureLabel = await promptSelect(
			rl,
			"选择生成格式",
			["文件夹 (默认)：<slug>/index.md", "单文件：<slug>.md"],
			0,
		);
		const useFolder = structureLabel.startsWith("文件夹");

		const title = await promptInput(rl, "标题", { required: true });
		const defaultSlug = slugifyTitle(title);
		const slug = await promptInput(rl, "文件名/目录名 (slug)", {
			defaultValue: defaultSlug,
			required: true,
			validate: (v) => {
				if (/[\\/:*?"<>|]/.test(v)) return 'slug 不能包含 /\\:*?"<>|';
				if (v.includes("..")) return "slug 不能包含 ..";
				return true;
			},
		});

		let category = "";
		if (isPost) {
			const existing = collectExistingPostCategories();
			const options = ["(不填写)", ...existing, "(新建分类...)"];
			const picked = await promptSelect(rl, "选择分类（仅篇章）", options, 0);
			if (picked === "(不填写)") {
				category = "";
			} else if (picked === "(新建分类...)") {
				category = await promptInput(rl, "输入新分类名称", { required: true });
			} else {
				category = picked;
			}
		}

		const now = new Date();
		const defaultPublished = formatDateTime(now);
		const publishedRaw = await promptInput(rl, "发布时间", {
			defaultValue: defaultPublished,
			required: true,
			validate: validateDateOrDateTime,
		});
		let published = publishedRaw;
		if (/^\d{4}-\d{2}-\d{2}$/.test(published)) {
			const hour = String(now.getHours()).padStart(2, "0");
			const minute = String(now.getMinutes()).padStart(2, "0");
			published = `${published} ${hour}:${minute}`;
		}

		const baseDir = isPost ? POSTS_DIR : ESSAYS_DIR;
		const targetPath = useFolder
			? path.join(baseDir, slug, "index.md")
			: path.join(baseDir, `${slug}.md`);

		printDivider();
		console.log("即将创建：");
		console.log(`  类型: ${typeLabel}`);
		console.log(`  结构: ${structureLabel}`);
		console.log(`  标题: ${title}`);
		if (isPost) console.log(`  分类: ${category || "(不填写)"}`);
		console.log(`  时间: ${published}`);
		console.log(`  路径: ${path.relative(ROOT, targetPath)}`);

		if (!dryRun) {
			const confirm = await promptSelect(rl, "确认创建？", ["是", "否"], 0);
			if (confirm !== "是") {
				console.log("已取消。\n");
				return;
			}
		}

		if (!dryRun && fs.existsSync(targetPath)) {
			console.error(`目标文件已存在：${path.relative(ROOT, targetPath)}`);
			process.exitCode = 1;
			return;
		}

		const frontmatter = isPost
			? buildPostFrontmatter({ title, published, category })
			: buildEssayFrontmatter({ title, published });

		if (dryRun) {
			printDivider();
			console.log("DRY RUN（不落盘）");
			console.log(`将创建：${path.relative(ROOT, targetPath)}`);
			console.log(frontmatter);
			return;
		}

		ensureDir(path.dirname(targetPath));
		fs.writeFileSync(targetPath, frontmatter, "utf8");
		console.log(`创建成功：${path.relative(ROOT, targetPath)}`);
	} finally {
		rl.close();
	}
}

main().catch((err) => {
	console.error(err);
	process.exitCode = 1;
});
