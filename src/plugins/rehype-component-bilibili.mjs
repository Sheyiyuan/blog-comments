/// <reference types="mdast" />
import { h } from "hastscript";

/**
 * Creates a Bilibili Card component.
 *
 * @param {Object} properties - The properties of the component.
 * @param {string} properties.bv - The Bilibili BV ID.
 * @param {import('mdast').RootContent[]} children - The children elements.
 * @returns {import('mdast').Parent} The created Bilibili Card component.
 */
export function BilibiliComponent(properties, children) {
	if (Array.isArray(children) && children.length !== 0)
		return h("div", { class: "hidden" }, [
			'Invalid directive. ("bilibili" directive must be leaf type "::bilibili{bv="BV..."}")',
		]);

	if (!properties.bv)
		return h(
			"div",
			{ class: "hidden" },
			'Invalid video. ("bv" attribute must be provided)',
		);

	const bv = properties.bv;

	return h(
		"div",
		{
			class: "bilibili-embed",
			style:
				"width: 100%; aspect-ratio: 16 / 9; margin: 1rem 0; overflow: hidden; border-radius: 0.75rem;",
		},
		[
			h("iframe", {
				src: `//player.bilibili.com/player.html?bvid=${bv}&page=1&autoplay=0&high_quality=1&danmaku=0`,
				width: "100%",
				height: "100%",
				scrolling: "no",
				border: "0",
				frameborder: "no",
				framespacing: "0",
				allowfullscreen: "true",
				sandbox:
					"allow-top-navigation allow-same-origin allow-forms allow-scripts",
				style: "width: 100%; height: 100%; border: none;",
			}),
		],
	);
}
