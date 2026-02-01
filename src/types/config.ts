import type { AUTO_MODE, DARK_MODE, LIGHT_MODE } from "@constants/constants";

export type SiteConfig = {
	title: string;
	subtitle: string;

	lang:
		| "en"
		| "zh_CN"
		| "zh_TW"
		| "ja"
		| "ko"
		| "es"
		| "th"
		| "vi"
		| "tr"
		| "id";

	themeColor: {
		hue: number;
		fixed: boolean;
	};
	banner: {
		enable: boolean;
		src: string;
		position?: "top" | "center" | "bottom";
		credit: {
			enable: boolean;
			text: string;
			url?: string;
		};
	};
	toc: {
		enable: boolean;
		depth: 1 | 2 | 3;
	};

	background?: SiteBackground;

	favicon: Favicon[];
};

export type SiteBackground =
	| {
			type: "color";
			color: string;
			opacity?: number;
	  }
	| {
			type: "image";
			src: string;
			position?: "top" | "center" | "bottom";
			basePath?: string;
			opacity?: number;
	  }
	| {
			type: "auto";
			position?: "top" | "center" | "bottom";
			opacity?: number;
	  };

export type Favicon = {
	src: string;
	theme?: "light" | "dark";
	sizes?: string;
};

export enum LinkPreset {
	Home = 0,
	Archive = 1,
	About = 2,
}

export type NavBarLink = {
	name: string;
	url: string;
	external?: boolean;
};

export type NavBarConfig = {
	links: (NavBarLink | LinkPreset)[];
	background?: NavBarBackground;
};

export type NavBarBackground =
	| {
			type: "color";
			color: string;
			opacity?: number;
	  }
	| {
			type: "image";
			src: string;
			position?: "top" | "center" | "bottom";
			basePath?: string;
			opacity?: number;
	  }
	| {
			type: "auto";
			position?: "top" | "center" | "bottom";
			opacity?: number;
	  };

export type ProfileConfig = {
	avatar?: string;
	name: string;
	bio?: string;
	links: {
		name: string;
		url: string;
		icon: string;
	}[];
};

export type LicenseConfig = {
	enable: boolean;
	name: string;
	url: string;
};

export type LIGHT_DARK_MODE =
	| typeof LIGHT_MODE
	| typeof DARK_MODE
	| typeof AUTO_MODE;

export type BlogPostData = {
	body: string;
	title: string;
	published: Date;
	description: string;
	tags: string[];
	draft?: boolean;
	image?: string;
	category?: string;
	prevTitle?: string;
	prevSlug?: string;
	nextTitle?: string;
	nextSlug?: string;
};

export type ExpressiveCodeConfig = {
	theme: string;
};

export type GlassConfig = {
	/** 是否启用毛玻璃（半透明 + backdrop blur） */
	enable: boolean;

	/** blur 半径（px） */
	blur: number;

	/**
	 * 卡片背景不透明度（0~1）。
	 * 值越小越“透”，但对比度会下降。
	 */
	cardOpacity: number;

	/** 顶栏弹出面板/浮层不透明度（0~1） */
	panelOpacity: number;

	/** 是否显示细边框（提升玻璃边缘层次） */
	border: boolean;
};

export type GiscusConfig = {
	enable: boolean;

	/** GitHub repo, e.g. "owner/repo" */
	repo: string;
	repoId: string;
	category: string;
	categoryId: string;

	/**
	 * See https://giscus.app
	 * Usually "pathname" is the most stable mapping for static sites.
	 */
	mapping?: "pathname" | "url" | "title" | "og:title" | "specific" | "number";
	strict?: "0" | "1";
	reactionsEnabled?: "0" | "1";
	emitMetadata?: "0" | "1";
	inputPosition?: "top" | "bottom";
	lang?: string;
	loading?: "lazy" | "eager";

	theme?: {
		light: string;
		dark: string;
	};
};

export type SponsorConfig = {
	/** 是否启用文章末尾赞助按钮 */
	enable: boolean;

	/** 按钮文案 */
	buttonText: string;

	/** 弹窗标题 */
	title: string;

	/** (可选) 按钮旁提示文案 */
	tip?: string;

	/** (可选) 弹窗底部补充说明 */
	footerText?: string;

	/** 赞助方式二维码 */
	methods: {
		name: string;
		qrImage: string;
	}[];
};
