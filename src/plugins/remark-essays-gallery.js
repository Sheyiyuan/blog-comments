/**
 * Extract all Markdown images from essays (src/content/essays/**) into
 * `data.astro.frontmatter.galleryImages`.
 *
 * Note: this plugin does NOT remove images from the Markdown AST.
 * The essay body rendering stays unchanged; the gallery is used only for
 * list-card previews.
 */

function isEssaysFile(filePath) {
	if (typeof filePath !== "string" || filePath.length === 0) return false;
	return filePath.replace(/\\/g, "/").includes("/src/content/essays/");
}

function ensureFrontmatter(data) {
	data.astro ??= {};
	data.astro.frontmatter ??= {};
	return data.astro.frontmatter;
}

function collectImages(node, out) {
	if (!node || typeof node !== "object") return;
	const children = /** @type {any[]} */ (node.children);
	if (Array.isArray(children)) {
		for (const child of children) {
			if (child?.type === "image") {
				const src = typeof child.url === "string" ? child.url : "";
				const alt = typeof child.alt === "string" ? child.alt : "";
				if (src) out.push({ src, alt });
			}
			collectImages(child, out);
		}
	}
}

export function remarkEssaysGallery() {
	return (tree, file) => {
		const filePath = file?.path ?? file?.history?.[0];
		if (!isEssaysFile(filePath)) return;

		const images = [];
		collectImages(tree, images);

		const frontmatter = ensureFrontmatter(file.data);
		frontmatter.galleryImages = images;
	};
}
