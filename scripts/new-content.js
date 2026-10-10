#!/usr/bin/env node
/* 交互式 / 命令行稿件创建工具（Astro content collections）
 *
 * 交互模式：pnpm new
 * 快速模式：pnpm new --type posts --title "标题" --yes
 *           pnpm new-post <文件名或路径>
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import readline from "node:readline";

const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, "src", "content");

/** 各集合的落盘规则 */
const COLLECTIONS = {
	posts: {
		dir: path.join(CONTENT_DIR, "posts"),
		label: "篇章",
		category: true,
		folder: true,
	},
	notes: {
		dir: path.join(CONTENT_DIR, "notes"),
		label: "笔记",
		category: true,
		folder: true,
	},
	essays: {
		dir: path.join(CONTENT_DIR, "essays"),
		label: "随笔",
		category: false,
		folder: true,
	},
	fiction: {
		dir: path.join(CONTENT_DIR, "fiction"),
		label: "外篇",
		category: false,
		folder: false,
	},
};

const TYPE_ALIASES = new Map([
	["posts", "posts"],
	["post", "posts"],
	["篇章", "posts"],
	["文章", "posts"],
	["notes", "notes"],
	["note", "notes"],
	["笔记", "notes"],
	["essays", "essays"],
	["essay", "essays"],
	["随笔", "essays"],
	["fiction", "fiction"],
	["novel", "fiction"],
	["外篇", "fiction"],
	["小说", "fiction"],
]);

const ORIGIN_ALIASES = new Map([
	["original", "original"],
	["原创", "original"],
	["fanfic", "fanfic"],
	["fanwork", "fanfic"],
	["同人", "fanfic"],
]);

const STATUS_ALIASES = new Map([
	["ongoing", "ongoing"],
	["连载", "ongoing"],
	["连载中", "ongoing"],
	["complete", "complete"],
	["完结", "complete"],
	["已完结", "complete"],
	["hiatus", "hiatus"],
	["停更", "hiatus"],
]);

const BOOLEAN_FLAGS = new Set([
	"yes",
	"y",
	"help",
	"h",
	"dry-run",
	"open",
	"interactive",
	"folder",
	"single-file",
	"force",
]);

/* ------------------------------------------------------------------ 基础工具 */

function formatDate(d) {
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function formatDateTime(d) {
	const hour = String(d.getHours()).padStart(2, "0");
	const minute = String(d.getMinutes()).padStart(2, "0");
	return `${formatDate(d)} ${hour}:${minute}`;
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

function collectExistingCategories(baseDir) {
	const files = walkMarkdownFiles(baseDir);
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
	console.log(`交互式 / 命令行新建稿件工具

用法:
  pnpm new                        交互式向导
  pnpm new <slug>                 非交互创建（slug 同时作为标题）
  pnpm new-post <文件名或路径>     新建篇章（兼容模式，等同 --type posts --single-file）

常用选项:
  -t, --type <posts|notes|essays|fiction>   类型，也接受 篇章/笔记/随笔/外篇
      --title <标题>                        标题
      --slug <目录名>                       文件/目录名
      --published <YYYY-MM-DD[ HH:mm]>      发布时间，默认当前时间
      --tags <a,b>                          标签，逗号分隔
      --category <分类>                     分类（篇章/笔记）
      --folder / --single-file              生成 <slug>/index.md 还是 <slug>.md
  -y, --yes                                 跳过确认
      --dry-run                             只打印将创建的内容，不落盘
      --interactive                         强制走交互问答（管道喂答案时用）
      --open                                创建后用 $EDITOR 打开
  -h, --help                                查看帮助

外篇（fiction）专用:
      --origin <original|fanfic>            原创 / 同人
      --fandom <原作>                       同人必填
      --status <ongoing|complete|hiatus>    连载中 / 已完结 / 停更
      --synopsis <简介>
      --chapters <n>                        预建 n 个章节文件（长篇，0 表示短篇）
      --cover <相对路径>                    封面，例如 images/cover.jpg

说明:
  - 交互模式会按类型只问必要的问题；给了选项就不再问对应问题
  - 非交互环境（stdin 不是终端）缺少必填选项时会直接报错，不会卡住
  - 新稿件默认 draft: true，改完再发布
`);
}

/* ------------------------------------------------------------------ 参数解析 */

function parseArgs(argv) {
	const flags = { _: [] };

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (!arg.startsWith("--")) {
			flags._.push(arg);
			continue;
		}
		const body = arg.slice(2);
		const eq = body.indexOf("=");
		const key = (eq === -1 ? body : body.slice(0, eq)).trim();
		if (BOOLEAN_FLAGS.has(key)) {
			flags[key] = eq === -1 ? true : body.slice(eq + 1) !== "false";
			continue;
		}
		if (eq !== -1) {
			flags[key] = body.slice(eq + 1);
			continue;
		}
		const next = argv[i + 1];
		if (next === undefined || next.startsWith("--")) {
			flags[key] = true;
			continue;
		}
		flags[key] = next;
		i++;
	}

	return flags;
}

function resolveAlias(map, raw, flagName) {
	const value = String(raw).trim();
	const hit = map.get(value.toLowerCase()) ?? map.get(value);
	if (!hit) {
		const allowed = [...new Set(map.values())].join(" | ");
		throw new Error(`--${flagName} 取值无效：${value}（可选：${allowed}）`);
	}
	return hit;
}

function splitList(raw) {
	if (raw === undefined || raw === true) return [];
	return String(raw)
		.split(/[,，]/)
		.map((item) => item.trim())
		.filter((item) => item.length > 0);
}

/* ------------------------------------------------------------------ 交互封装 */

let interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);

function requireValue(name, hint) {
	throw new Error(
		`非交互环境下缺少必填项：${name}${hint ? `（${hint}）` : ""}。请用命令行选项提供，或改用 pnpm new 交互模式。`,
	);
}

/** 非交互模式下取命令行值，否则回落到默认值 */
function presetOr(value, fallback) {
	if (value === undefined || value === true) {
		return interactive ? undefined : fallback;
	}
	return value;
}

/** 把命令行上的别名（篇章/小说/…）解析成集合或枚举值，非交互时用 fallback */
function selectPreset(raw, aliases, flagName, fallback) {
	const value = presetOr(raw, fallback);
	if (value === undefined) return undefined;
	return aliases ? resolveAlias(aliases, value, flagName) : value;
}

/** 章节序号固定 5 位，上限即 99999 */
const MAX_CHAPTER_COUNT = 99999;

function isChapterCount(value) {
	const num = Number(value);
	return Number.isInteger(num) && num >= 0 && num <= MAX_CHAPTER_COUNT;
}

async function readAnswer(rl, prompt) {
	const answer = await rl.question(prompt);
	if (answer === null) {
		throw new Error("输入已结束（stdin 已关闭），已中止。");
	}
	return answer.trim();
}

async function askSelect(rl, message, options, preset, defaultIndex = 0) {
	if (preset !== undefined && preset !== true) {
		const wanted = String(preset).trim();
		const hit =
			options.find((opt) => opt.value === wanted) ??
			options.find((opt) => opt.label === wanted);
		if (!hit) {
			throw new Error(
				`取值无效：${wanted}（可选：${options.map((opt) => opt.value).join(" | ")}）`,
			);
		}
		console.log(`${message}: ${hit.label}  [来自选项]`);
		return hit;
	}
	if (!interactive) requireValue(message);

	printDivider();
	console.log(message);
	options.forEach((opt, i) => {
		const isDefault = i === defaultIndex;
		console.log(`  ${i + 1}) ${opt.label}${isDefault ? " (默认)" : ""}`);
	});

	while (true) {
		const raw = await readAnswer(
			rl,
			`请选择 [1-${options.length}] (回车默认): `,
		);
		if (raw === "") return options[defaultIndex];
		const num = Number(raw);
		if (Number.isInteger(num) && num >= 1 && num <= options.length) {
			return options[num - 1];
		}
		console.log("输入无效，请输入编号。");
	}
}

async function askInput(
	rl,
	message,
	{ defaultValue = "", required = false, validate, preset, presetName } = {},
) {
	if (preset !== undefined && preset !== true) {
		const value = String(preset).trim();
		if (validate) {
			const ok = validate(value);
			if (ok !== true) {
				throw new Error(
					`${presetName ?? message} 取值无效：${typeof ok === "string" ? ok : value}`,
				);
			}
		}
		console.log(`${message}: ${value || "(空)"}  [来自选项]`);
		return value;
	}
	if (!interactive) {
		if (required && defaultValue === "") requireValue(message);
		return defaultValue;
	}

	printDivider();
	while (true) {
		const suffix = defaultValue ? ` (默认: ${defaultValue})` : "";
		const raw = await readAnswer(rl, `${message}${suffix}: `);
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

async function askCount(rl, message, { defaultValue = 0, preset } = {}) {
	const presetValue =
		preset === undefined || preset === true ? undefined : String(preset).trim();
	if (presetValue !== undefined) {
		const num = Number(presetValue);
		if (!Number.isInteger(num) || num < 0 || num > MAX_CHAPTER_COUNT) {
			throw new Error(
				`${message} 取值无效：${presetValue}（请填 0-${MAX_CHAPTER_COUNT}）`,
			);
		}
		console.log(`${message}: ${num}  [来自选项]`);
		return num;
	}
	if (!interactive) return defaultValue;

	const raw = await askInput(rl, message, {
		defaultValue: String(defaultValue),
		validate: (v) => {
			const num = Number(v);
			if (!Number.isInteger(num) || num < 0 || num > MAX_CHAPTER_COUNT)
				return `请填 0-${MAX_CHAPTER_COUNT}`;
			return true;
		},
	});
	return Number(raw);
}

/* ------------------------------------------------------------------ frontmatter */

function buildPostFrontmatter({ title, published, category, tags }) {
	return (
		"---\n" +
		`title: ${JSON.stringify(title)}\n` +
		`published: ${published}\n` +
		`description: ""\n` +
		`image: ""\n` +
		`firstLineIndent: "0em"\n` +
		`tags: ${JSON.stringify(tags)}\n` +
		`category: ${category ? JSON.stringify(category) : '""'}\n` +
		"draft: true\n" +
		"pin: 0\n" +
		`lang: ""\n` +
		"comments: true\n" +
		"sponsor: true\n" +
		"---\n\n"
	);
}

function buildEssayFrontmatter({ title, published, tags }) {
	return (
		"---\n" +
		`published: ${published}\n` +
		`title: ${JSON.stringify(title)}\n` +
		`tags: ${JSON.stringify(tags.length > 0 ? tags : ["随笔"])}\n` +
		"pin: 0\n" +
		"comments: true\n" +
		"draft: true\n" +
		`slugSeed: ""\n` +
		"---\n\n"
	);
}

function buildFictionFrontmatter({
	title,
	published,
	origin,
	fandom,
	status,
	synopsis,
	cover,
	tags,
}) {
	const lines = [
		"---",
		`title: ${JSON.stringify(title)}`,
		`origin: ${origin}`,
		`published: ${published}`,
		`status: ${status}`,
		`synopsis: ${JSON.stringify(synopsis)}`,
		`cover: ${JSON.stringify(cover)}`,
	];
	if (origin === "fanfic") lines.push(`fandom: ${JSON.stringify(fandom)}`);
	lines.push(
		`tags: ${JSON.stringify(tags)}`,
		"comments: true",
		"draft: true",
		"---",
		"",
		"",
	);
	return lines.join("\n");
}

function buildChapterFrontmatter({ title, published }) {
	return (
		"---\n" +
		`title: ${JSON.stringify(title)}\n` +
		`published: ${published}\n` +
		"---\n\n"
	);
}

/**
 * 按行读取输入。
 * readline/promises 的 question() 在“输入已经整段缓冲好”时会丢行（管道喂答案时只吃到第一行），
 * 这里改成自己维护行队列，交互终端和管道输入都能正常工作。
 */
function createPrompter() {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		terminal: Boolean(process.stdout.isTTY),
	});
	/** @type {string[]} */
	const lines = [];
	/** @type {((line: string | null) => void)[]} */
	const waiters = [];
	let closed = false;

	rl.on("line", (line) => {
		const waiter = waiters.shift();
		if (waiter) waiter(line);
		else lines.push(line);
	});
	rl.on("close", () => {
		closed = true;
		while (waiters.length > 0) {
			const waiter = waiters.shift();
			if (waiter) waiter(null);
		}
	});

	return {
		async question(prompt) {
			process.stdout.write(prompt);
			if (lines.length > 0) return lines.shift();
			if (closed) return null;
			return await new Promise((resolve) => {
				waiters.push(resolve);
			});
		},
		close() {
			rl.close();
		},
	};
}

/* ------------------------------------------------------------------ 主流程 */

function validateDateOrDateTime(value) {
	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return true;
	if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}$/.test(value)) return true;
	return "请输入 YYYY-MM-DD 或 YYYY-MM-DD HH:mm";
}

function validateSlug(value, { nested = true } = {}) {
	if (value.startsWith("/") || /^[A-Za-z]:/.test(value)) {
		return "slug 不能是绝对路径";
	}
	if (/[*?"<>|]/.test(value)) return 'slug 不能包含 *?"<>|';
	const parts = value.split(/[\\/]+/);
	if (parts.some((part) => part === "" || part === "." || part === "..")) {
		return "slug 的路径片段不能为空、. 或 ..";
	}
	if (!nested && parts.length > 1) {
		return "外篇的作品目录只能是一层，不能包含 /";
	}
	return true;
}

/** 去掉顺手写上的扩展名，并统一用 / 分隔 */
function normalizeSlug(value) {
	return value
		.replace(/\.(md|mdx)$/i, "")
		.split(/[\\/]+/)
		.join("/");
}

function ensureDir(dirPath) {
	if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function openInEditor(targetPath) {
	const editor = process.env.VISUAL || process.env.EDITOR;
	const candidates = editor
		? [editor]
		: interactive
			? ["code", "nano", "vim"]
			: [];
	for (const candidate of candidates) {
		const result = spawnSync(candidate, [targetPath], {
			stdio: "inherit",
			shell: false,
		});
		if (!result.error) return true;
	}
	console.log(
		`未找到可用的编辑器（可设置 $EDITOR），文件已创建：${path.relative(ROOT, targetPath)}`,
	);
	return false;
}

async function main() {
	const flags = parseArgs(process.argv.slice(2));

	if (flags.help || flags.h) {
		printHelp();
		return;
	}

	if (flags.interactive) interactive = true;

	const dryRun = Boolean(flags["dry-run"]);
	const assumeYes = Boolean(flags.yes || flags.y);
	const shouldOpen = Boolean(flags.open);
	const missingDirs = Object.values(COLLECTIONS)
		.filter((collection) => !fs.existsSync(collection.dir))
		.map((collection) => path.relative(ROOT, collection.dir));
	if (missingDirs.length > 0) {
		console.error(
			`未找到内容目录：${missingDirs.join("、")}。请在项目根目录运行。`,
		);
		process.exitCode = 1;
		return;
	}

	const rl = createPrompter();
	try {
		console.log("新建稿件 (pnpm new)\n");
		if (!interactive) {
			console.log("（检测到非交互环境，只使用命令行选项）\n");
		}

		/* 类型 */
		const typeOptions = [
			{ value: "posts", label: "篇章 (posts)" },
			{ value: "notes", label: "笔记 (notes)" },
			{ value: "essays", label: "随笔 (essays)" },
			{ value: "fiction", label: "外篇 (fiction)" },
		];
		const typePreset = selectPreset(
			flags.type ?? flags.t,
			TYPE_ALIASES,
			"type",
			undefined,
		);
		if (typePreset === undefined && !interactive) {
			requireValue("类型", "--type posts|notes|essays|fiction");
		}
		const pickedType = await askSelect(rl, "选择类型", typeOptions, typePreset);
		const type = pickedType.value;
		const collection = COLLECTIONS[type];
		const isFiction = type === "fiction";

		/* 结构 */
		let useFolder = collection.folder && !isFiction;
		if (isFiction) {
			console.log("生成格式: 作品目录（index.md + chapters/）  [外篇固定]");
		} else {
			let structurePreset;
			if (flags.folder) structurePreset = "folder";
			if (flags["single-file"]) structurePreset = "single";
			if (structurePreset === undefined && !interactive) {
				structurePreset = "folder";
			}
			const structure = await askSelect(
				rl,
				"选择生成格式",
				[
					{ value: "folder", label: "文件夹：<slug>/index.md" },
					{ value: "single", label: "单文件：<slug>.md" },
				],
				structurePreset,
			);
			useFolder = structure.value === "folder";
		}

		/* 标题与 slug */
		const positional = flags._[0];
		const title = await askInput(rl, "标题", {
			required: true,
			preset: flags.title ?? positional,
			presetName: "标题",
		});
		const slugRaw = await askInput(rl, "文件名/目录名 (slug)", {
			defaultValue: slugifyTitle(title),
			required: true,
			validate: (value) => validateSlug(value, { nested: !isFiction }),
			preset: flags.slug ?? positional,
			presetName: "slug",
		});
		const slug = normalizeSlug(slugRaw);

		/* 外篇专属 */
		let origin = "original";
		let fandom = "";
		let status = "complete";
		let synopsis = "";
		let cover = "";
		let chapterCount = 0;
		const chapterFiles = [];

		if (isFiction) {
			const chaptersFlag =
				flags.chapters === undefined || flags.chapters === true
					? undefined
					: String(flags.chapters);
			if (chaptersFlag !== undefined && !isChapterCount(chaptersFlag)) {
				throw new Error(
					`--chapters 取值无效：${chaptersFlag}（请填 0-${MAX_CHAPTER_COUNT}）`,
				);
			}
			let formPreset;
			if (chaptersFlag !== undefined) {
				formPreset = Number(chaptersFlag) > 0 ? "serial" : "short";
			} else if (!interactive) {
				formPreset = "short";
			}

			const originPicked = await askSelect(
				rl,
				"作品类型",
				[
					{ value: "original", label: "原创" },
					{ value: "fanfic", label: "同人" },
				],
				selectPreset(flags.origin, ORIGIN_ALIASES, "origin", "original"),
			);
			origin = originPicked.value;
			if (origin === "fanfic") {
				fandom = await askInput(rl, "原作 (fandom)", {
					required: true,
					preset: flags.fandom,
					presetName: "原作",
				});
			}

			const formPicked = await askSelect(
				rl,
				"篇幅",
				[
					{ value: "short", label: "短篇（正文写在 index.md）" },
					{ value: "serial", label: "长篇（分章，正文写在 chapters/）" },
				],
				formPreset,
			);
			const isSerial = formPicked.value === "serial";

			if (isSerial) {
				const statusPicked = await askSelect(
					rl,
					"连载状态",
					[
						{ value: "ongoing", label: "连载中" },
						{ value: "complete", label: "已完结" },
						{ value: "hiatus", label: "停更" },
					],
					selectPreset(flags.status, STATUS_ALIASES, "status", "ongoing"),
				);
				status = statusPicked.value;
				chapterCount = await askCount(rl, "预建几个章节文件", {
					defaultValue: 3,
					preset: chaptersFlag,
				});
			} else {
				status = "complete";
			}

			synopsis = await askInput(rl, "一句话简介 (synopsis)", {
				preset: flags.synopsis,
				presetName: "简介",
			});
			cover =
				flags.cover === undefined || flags.cover === true
					? ""
					: String(flags.cover);
		}

		/* 分类：命令行给什么就用什么，空字符串表示不填；交互模式才出选择列表 */
		let category = "";
		if (collection.category) {
			if (flags.category !== undefined) {
				category = flags.category === true ? "" : String(flags.category).trim();
			} else if (interactive) {
				const existing = collectExistingCategories(collection.dir);
				const options = [
					{ value: "(不填写)", label: "(不填写)" },
					...existing.map((item) => ({ value: item, label: item })),
					{ value: "(新建分类...)", label: "(新建分类...)" },
				];
				const picked = await askSelect(
					rl,
					`选择分类（仅${collection.label}）`,
					options,
				);
				if (picked.value === "(新建分类...)") {
					category = await askInput(rl, "输入新分类名称", { required: true });
				} else if (picked.value !== "(不填写)") {
					category = picked.value;
				}
			}
		}

		/* 标签 */
		const tagPreset =
			flags.tags === undefined || flags.tags === true
				? type === "essays"
					? "随笔"
					: ""
				: String(flags.tags);
		const tagsRaw = await askInput(rl, "标签，逗号分隔（可留空）", {
			defaultValue: tagPreset,
			preset: flags.tags,
			presetName: "标签",
		});
		const tags = splitList(tagsRaw);

		/* 时间 */
		const now = new Date();
		const publishedRaw = await askInput(rl, "发布时间", {
			defaultValue: formatDateTime(now),
			required: true,
			validate: validateDateOrDateTime,
			preset: flags.published,
			presetName: "发布时间",
		});
		let published = publishedRaw;
		if (/^\d{4}-\d{2}-\d{2}$/.test(published)) {
			published = `${published} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
		}

		/* 目标路径 */
		const workDir = path.join(collection.dir, slug);
		const targetPath = isFiction
			? path.join(workDir, "index.md")
			: useFolder
				? path.join(collection.dir, slug, "index.md")
				: path.join(collection.dir, `${slug}.md`);

		const frontmatter = isFiction
			? buildFictionFrontmatter({
					title,
					published,
					origin,
					fandom,
					status,
					synopsis,
					cover,
					tags,
				})
			: type === "essays"
				? buildEssayFrontmatter({ title, published, tags })
				: buildPostFrontmatter({ title, published, category, tags });

		if (isFiction && chapterCount > 0) {
			for (let i = 1; i <= chapterCount; i++) {
				// 章节文件名固定为 5 位定长序号，不带标题，便于排序与增删
				const order = String(i).padStart(5, "0");
				const chapterTitle = `第${i}章`;
				chapterFiles.push({
					path: path.join(workDir, "chapters", `${order}.md`),
					content: buildChapterFrontmatter({
						title: chapterTitle,
						published,
					}),
				});
			}
		}

		/* 汇总确认 */
		printDivider();
		console.log("即将创建：");
		console.log(`  类型: ${collection.label} (${type})`);
		console.log(
			`  结构: ${isFiction ? "作品目录 index.md" : useFolder ? "<slug>/index.md" : "<slug>.md"}`,
		);
		console.log(`  标题: ${title}`);
		if (collection.category) console.log(`  分类: ${category || "(不填写)"}`);
		if (tags.length > 0) console.log(`  标签: ${tags.join("、")}`);
		if (isFiction) {
			console.log(
				`  来源: ${origin === "fanfic" ? `同人（${fandom}）` : "原创"}`,
			);
			console.log(`  状态: ${status}`);
			if (chapterCount > 0)
				console.log(
					`  章节: 预建 ${chapterCount} 个（chapters/00001.md 起，5 位定长序号）`,
				);
		}
		console.log(`  时间: ${published}`);
		console.log(`  路径: ${path.relative(ROOT, targetPath)}`);
		if (chapterFiles.length > 0) {
			console.log(
				`  附带: ${chapterFiles.map((file) => path.relative(ROOT, file.path)).join("\n        ")}`,
			);
		}

		if (!dryRun && !assumeYes) {
			const confirm = await askSelect(rl, "确认创建？", [
				{ value: "yes", label: "是" },
				{ value: "no", label: "否" },
			]);
			if (confirm.value !== "yes") {
				console.log("已取消。\n");
				return;
			}
		}

		const existing = [
			targetPath,
			...chapterFiles.map((file) => file.path),
		].filter((file) => fs.existsSync(file));
		if (existing.length > 0 && !flags.force) {
			console.error(
				`目标文件已存在：\n  ${existing.map((file) => path.relative(ROOT, file)).join("\n  ")}\n如需覆盖请加 --force。`,
			);
			process.exitCode = 1;
			return;
		}

		if (dryRun) {
			printDivider();
			console.log("DRY RUN（不落盘）");
			console.log(`将创建：${path.relative(ROOT, targetPath)}`);
			console.log(frontmatter);
			for (const file of chapterFiles) {
				console.log(`将创建：${path.relative(ROOT, file.path)}`);
				console.log(file.content);
			}
			return;
		}

		ensureDir(path.dirname(targetPath));
		fs.writeFileSync(targetPath, frontmatter, "utf8");
		const created = [path.relative(ROOT, targetPath)];
		if (isFiction && cover.trim() === "")
			ensureDir(path.join(workDir, "images"));
		for (const file of chapterFiles) {
			ensureDir(path.dirname(file.path));
			fs.writeFileSync(file.path, file.content, "utf8");
			created.push(path.relative(ROOT, file.path));
		}

		printDivider();
		console.log("创建成功：");
		for (const file of created) console.log(`  ${file}`);
		if (isFiction) {
			if (cover.trim() === "") {
				console.log(
					`  封面：把图片放进 ${path.relative(ROOT, path.join(workDir, "images"))}/ 再填 cover`,
				);
			}
			if (chapterCount > 0) {
				console.log(
					"  章节顺序取自文件名开头的 5 位序号（00001、00002…），前导零要写全",
				);
			}
		}
		console.log("  新稿件默认 draft: true，改完记得改成 false\n");

		if (shouldOpen && !openInEditor(targetPath)) {
			process.exitCode = 0;
		}
	} finally {
		rl.close();
	}
}

main().catch((err) => {
	console.error(`\n${err instanceof Error ? err.message : err}`);
	process.exitCode = 1;
});
