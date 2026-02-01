import type {
	ExpressiveCodeConfig,
	GiscusConfig,
	GlassConfig,
	LicenseConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
	SponsorConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";

export const siteConfig: SiteConfig = {
	title: "社亦园的旅行笔记",
	subtitle: "平淡无奇笔记本",
	lang: "zh_CN", // Language code, e.g. 'en', 'zh_CN', 'ja', etc.
	themeColor: {
		hue: 250, // Default hue for the theme color, from 0 to 360. e.g. red: 0, teal: 200, cyan: 250, pink: 345
		fixed: false, // Hide the theme color picker for visitors
	},
	banner: {
		enable: false,
		src: "assets/images/demo-banner.png", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
		position: "center", // Equivalent to object-position, only supports 'top', 'center', 'bottom'. 'center' by default
		credit: {
			enable: false, // Display the credit text of the banner image
			text: "", // Credit text to be displayed
			url: "", // (Optional) URL link to the original artwork or artist's page
		},
	},
	toc: {
		enable: true, // Display the table of contents on the right side of the post
		depth: 2, // Maximum heading depth to show in the table, from 1 to 3
	},
	background: {
		type: "image",
		src: "assets/images/bg.jpg", // /src 下相对路径或 /public 绝对路径
		position: "center",
		opacity: 0.7,
	},
	favicon: [
		{
			src: "/icons/01.png",
		},
	],
};

export const navBarConfig: NavBarConfig = {
	links: [LinkPreset.Home, LinkPreset.Archive, LinkPreset.About],
};

export const profileConfig: ProfileConfig = {
	avatar: "assets/images/avatar.png", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
	name: "Sheyiyuan",
	bio: "对代码感兴趣的普通人",
	links: [
		{
			name: "E-mail",
			icon: "fa6-regular:envelope",
			url: "mailto:sheyiyuantan90@qq.com",
		},
		{
			name: "GitHub",
			icon: "fa6-brands:github",
			url: "https://github.com/Sheyiyuan",
		},
	],
};

export const licenseConfig: LicenseConfig = {
	enable: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	// Note: Some styles (such as background color) are being overridden, see the astro.config.mjs file.
	// Please select a dark theme, as this blog theme currently only supports dark background color
	theme: "github-dark",
};

/**
 * 毛玻璃（半透明 + backdrop blur）效果配置。
 * 说明：
 * - enable=false 会自动回退为不透明背景 + 无模糊。
 * - opacity 建议在 0.7~0.9，太低会影响可读性。
 */
export const glassConfig: GlassConfig = {
	enable: true,
	blur: 14,
	cardOpacity: 0.75,
	panelOpacity: 0.75,
	border: true,
};

export const giscusConfig: GiscusConfig = {
	// 填好下面的 repo/repoId/category/categoryId 后，将 enable 改为 true 即可启用
	enable: true,
	repo: "Sheyiyuan/blog-comments",
	repoId: "R_kgDORF2quw",
	category: "Comments",
	categoryId: "DIC_kwDORF2qu84C1tXq",

	mapping: "pathname",
	strict: "0",
	reactionsEnabled: "1",
	emitMetadata: "0",
	inputPosition: "top",
	lang: "zh-CN",
	loading: "lazy",

	theme: {
		light: "light",
		dark: "transparent_dark",
	},
};

export const sponsorConfig: SponsorConfig = {
	enable: true,
	buttonText: "赞助",
	title: "感谢你的支持",
	tip: "如果这篇文章对你有帮助，可以请我喝杯咖啡～",
	methods: [
		{
			name: "使用微信扫描二维码赞助我",
			qrImage: "/images/sponsor/wechat.jpg",
		},
	],
};
