import { visit } from "unist-util-visit";

export function remarkMermaidAddon() {
	return (tree) => {
		visit(tree, "code", (node, index, parent) => {
			if (node.lang === "mermaid") {
				const value = node.value;
				parent.children[index] = {
					type: "html",
					value: `<div class="mermaid" style="display: flex; justify-content: center; margin-bottom: 1rem;">${value}</div>`,
				};
			}
		});
	};
}
