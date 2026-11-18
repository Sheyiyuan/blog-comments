/**
 * Article pages render the frontmatter title as the only h1.
 * Shift body headings so the shallowest one is h2, and remember the original
 * rank so reading styles can stay put. Slug ids are left untouched.
 */
function collectHeadings(node, out) {
	if (!node || typeof node !== "object") return;
	if (node.type === "element" && /^h[1-6]$/.test(node.tagName ?? "")) {
		out.push(node);
	}
	const children = node.children;
	if (!Array.isArray(children)) return;
	for (const child of children) collectHeadings(child, out);
}

export function shiftHeadingTree(tree) {
	const headings = [];
	collectHeadings(tree, headings);
	if (headings.length === 0) return 0;

	const depths = headings.map((heading) => Number(heading.tagName.slice(1)));
	const minDepth = Math.min(...depths);
	const shift = 2 - minDepth;
	if (shift === 0) return 0;

	let changed = 0;
	for (const heading of headings) {
		const depth = Number(heading.tagName.slice(1));
		const next = Math.min(6, Math.max(1, depth + shift));
		if (next === depth) continue;
		heading.properties = heading.properties ?? {};
		heading.properties.dataHeadingRank = String(depth);
		heading.tagName = `h${next}`;
		changed += 1;
	}
	return changed;
}

function contentPath(file) {
	const raw = file?.path ?? file?.history?.[0] ?? "";
	return String(raw).replace(/\\/g, "/");
}

export function rehypeHeadingHierarchy() {
	return (tree, file) => {
		const filePath = contentPath(file);
		if (!/\/content\/(posts|notes|essays|fiction)\//.test(filePath)) return;
		shiftHeadingTree(tree);
	};
}
