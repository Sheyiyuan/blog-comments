// biome-ignore lint/suspicious/noShadowRestrictedNames: <toString from mdast-util-to-string>
import { toString } from "mdast-util-to-string";

function meaningfulText(node) {
	if (!node) return "";
	const children = Array.isArray(node.children) ? node.children : [];
	const hasText = children.some((child) => {
		if (child.type === "image" || child.type === "break") return false;
		if (child.type === "text") return child.value.trim().length > 0;
		return true;
	});
	if (!hasText) return "";
	return toString(node).trim();
}

/* Use the first readable paragraph, including an opening blockquote. */
export function remarkExcerpt() {
	return (tree, { data }) => {
		let excerpt = "";
		for (const node of tree.children ?? []) {
			if (node.type === "paragraph") {
				excerpt = meaningfulText(node);
			} else if (node.type === "blockquote") {
				const paragraph = (node.children ?? []).find(
					(child) => child.type === "paragraph",
				);
				excerpt = paragraph ? meaningfulText(paragraph) : toString(node).trim();
			} else {
				continue;
			}
			if (excerpt) break;
		}
		data.astro.frontmatter.excerpt = excerpt;
	};
}
