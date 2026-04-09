import type {
	ExpressiveCodeConfig,
	FriendsConfig,
	GiscusConfig,
	GlassConfig,
	LicenseConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
	SponsorConfig,
} from "./types/config";
import { HomeSectionPreset, LinkPreset } from "./types/config";

export const siteConfig: SiteConfig = {
	title: "社亦园的旅行笔记",
	subtitle: "一个混乱善良者的数字游牧实践",
	siteStartDate: "2024-06-16",
	dateTime: {
		timeZone: "+08:00",
		defaultTime: "16:00",
	},
	/**
	 * 站点语言代码：用于导航/按钮等 UI 文案的 i18n。
	 * 可选值见 `SiteConfig.lang` 类型定义（如：'en', 'zh_CN', 'ja' 等）。
	 */
	lang: "zh_CN",
	themeColor: {
		/**
		 * 默认主题色 Hue（0~360）。
		 * 例如：红 0，青绿 200，青蓝 250，粉 345。
		 */
		hue: 250,
		/**
		 * 是否对访客隐藏主题色选择器。
		 * - true：访客不能调主题色（固定为 hue）
		 * - false：允许访客在前端面板里调整
		 */
		fixed: true,
	},
	banner: {
		/**
		 * 是否启用顶部横幅图（通常在首页/列表页更明显）。
		 */
		enable: false,
		/**
		 * 横幅图片路径：
		 * - 不以 '/' 开头：相对 `src/`（例如 `assets/images/...`）
		 * - 以 '/' 开头：相对 `public/`（例如 `/images/...`）
		 */
		src: "assets/images/demo-banner.png",
		/**
		 * 等价于 CSS 的 `object-position`（仅支持：'top' | 'center' | 'bottom'）。
		 */
		position: "center",
		credit: {
			/** 是否展示横幅图片署名/来源信息 */
			enable: false,
			/** 署名文案 */
			text: "",
			/** （可选）跳转到原图/作者页面的链接 */
			url: "",
		},
	},
	toc: {
		/** 是否在文章页右侧展示目录（TOC） */
		enable: true,
		/** TOC 最大标题层级深度（1~3） */
		depth: 2,
	},
	background: {
		type: "image",
		/** 背景资源路径：`src/` 下相对路径或 `public/` 绝对路径 */
		src: "assets/images/bg.jpg",
		/** 背景图位置（等价 object-position） */
		position: "center",
		/** 背景图不透明度（0~1） */
		opacity: 0.7,
	},
	favicon: [
		{
			/** 浏览器标签页图标（相对 `public/`） */
			src: "/icons/01.png",
		},
	],
};

export const navBarConfig: NavBarConfig = {
	/**
	 * 导航栏菜单配置：
	 * - 顺序：按 `links` 数组从左到右显示（移动数组元素即可调整顺序）
	 * - 既支持内置预设（`LinkPreset.*`，会走 i18n），也支持自定义对象（`{ name, url }`）
	 *
	 * 自定义页面示例：
	 * 1) 先创建页面文件：`src/pages/projects.astro` -> 访问路径通常为 `/projects/`
	 * 2) 再把链接加到下面数组中，例如：
	 *    { name: "项目", url: "/projects/" },
	 *
	 * 外部链接示例：
	 *    { name: "GitHub", url: "https://github.com/<name>", external: true },
	 */
	links: [
		LinkPreset.Home,
		LinkPreset.About,
		LinkPreset.Archive,
		LinkPreset.Passage,
		LinkPreset.Notes,
		LinkPreset.Essays,
		LinkPreset.Friends,
	],
};

/**
 * 首页展示配置：
 * - sections：控制首页展示顺序/显示哪些板块（类似导航栏 links 数组）
 * - recentEssays / recentPosts：控制各板块展示数量
 */
export const homePageConfig = {
	sections: [HomeSectionPreset.Essays, HomeSectionPreset.Posts],
	recentEssays: {
		count: 4,
	},
	recentPosts: {
		count: 4,
	},
} as const;

export const profileConfig: ProfileConfig = {
	/**
	 * 头像路径：
	 * - 不以 '/' 开头：相对 `src/`
	 * - 以 '/' 开头：相对 `public/`
	 */
	avatar: "assets/images/avatar.png",
	name: "Sheyiyuan",
	bio: "对代码感兴趣的普通人",
	/** 社交链接：`icon` 使用 iconify 图标名（项目中通过 `astro-icon` 渲染） */
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

export const friendsConfig: FriendsConfig = {
	/**
	 * 友人帐（友情链接）列表：
	 * - 顺序：按数组顺序展示（可直接拖动排序）
	 * - 建议把头像放到 `public/` 下，然后用 `/images/...` 引用
	 */
	links: [
		// {
		// 	name: "社亦园的旅行笔记",
		// 	url: "https://blog.sheyiyuan.cn/",
		// 	description: "世界没了我可能会更好，所以我要继续活着",
		// 	avatar: "/icons/01.png",
		// 	newTab: true,
		// },
		{
			name: "一曝十寒",
			url: "https://yuhhhy.cn/",
			description: "纵使不安彷徨，即便茫然无措，也依然迈步前行",
			avatar: "https://yuhhhy.cn/images/avatar.jpg",
			newTab: true,
		},
		{
			name: "Lunarain_079's Inn",
			url: "https://www.lunarain.top/",
			description: "暂伴月将影 行乐须及春",
			avatar: "https://www.lunarain.top/avatar.png",
			newTab: true,
		},
		{
			name: "moi",
			url: "https://hagumiaoi.pages.dev/",
			description: "moi 的个人创作小站",
			avatar: "https://hagumiaoi.pages.dev/favicon/favicon.ico",
			newTab: true,
		},
		{
			name: "澪羽",
			url: "https://blog.baios.net",
			description: "科技 共享 二次元",
			avatar:
				"http://blog.baios.net/wp-content/uploads/2024/07/1720800619-1718780941-1666863869324.ico",
			newTab: true,
		},
	],
};

export const licenseConfig: LicenseConfig = {
	/** 是否在文章页展示许可协议模块 */
	enable: true,
	/** 许可名称展示文本 */
	name: "CC BY-NC-SA 4.0",
	/** 许可链接 */
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	/**
	 * 代码块高亮（Expressive Code）主题配置。
	 * 注意：部分样式（例如背景色）可能在 astro 配置或全局样式里被覆盖。
	 * 建议选择深色主题：本主题目前主要以深色代码背景为基准做了适配。
	 */
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
	/**
	 * Giscus 评论系统配置。
	 * - 先填好 repo/repoId/category/categoryId
	 * - 再将 enable 改为 true 即可启用
	 */
	enable: true,
	repo: "Sheyiyuan/blog-comments",
	repoId: "R_kgDORF2quw",
	category: "Comments",
	categoryId: "DIC_kwDORF2qu84C1tXq",
	/**
	 * 文章与 Discussion 的映射方式。
	 * - pathname：用 URL 路径（不含域名）做映射，通常更适合博客迁移时保持稳定。
	 */
	mapping: "pathname",
	/** 是否严格匹配（Giscus 参数，字符串形式） */
	strict: "0",
	/** 是否启用表情反应（Giscus 参数，字符串形式） */
	reactionsEnabled: "1",
	/** 是否输出页面元数据（Giscus 参数，字符串形式） */
	emitMetadata: "0",
	/** 评论框位置：'top' 或 'bottom' */
	inputPosition: "top",
	/** Giscus UI 语言 */
	lang: "zh-CN",
	/** 加载策略 */
	loading: "lazy",

	theme: {
		light: "light",
		dark: "transparent_dark",
	},
};

export const sponsorConfig: SponsorConfig = {
	/** 是否启用赞助入口 */
	enable: true,
	/** 导航/按钮展示的文字 */
	buttonText: "赞助",
	/** 弹窗标题 */
	title: "感谢你的支持",
	/** 弹窗提示文案 */
	tip: "如果这篇文章对你有帮助，可以请我喝杯咖啡～",
	/** 赞助方式列表（可放多种：微信/支付宝/爱发电等） */
	methods: [
		{
			name: "使用微信扫描二维码赞助我",
			qrImage: "/images/sponsor/wechat.jpg",
		},
	],
};
