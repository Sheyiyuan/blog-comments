/**
 * Public paths from before the English slug rename, plus the parenthesis-less
 * KVM URL that article text actually linked to.
 * Destinations keep the current fiction spelling, including `unecpected-meeting`.
 */
export const legacyRedirects: Record<string, string> = {
	"/posts/arch-linux中的conda/": "/posts/arch-linux-conda/",
	"/posts/arch-linux中的虚拟机（kvm）-软件安装/": "/posts/arch-linux-kvm/",
	"/posts/arch-linux中的虚拟机kvm-软件安装/": "/posts/arch-linux-kvm/",
	"/posts/archlinux脚本安装与gnome桌面环境配置指南/":
		"/posts/arch-linux-script-install-gnome/",
	"/posts/操作系统测评/": "/posts/do-you-really-need-linux/",
	"/posts/双硬盘双系统翻车全复盘/": "/posts/dual-boot-disk-recovery/",
	"/posts/gitea-遭到-spam-恶意批量注册-批量建仓我的一次应急封禁与清理复盘/":
		"/posts/gitea-spam-emergency-cleanup/",
	"/posts/把代码放到-github-上就是开源吗你可能误解了开源/":
		"/posts/github-not-equals-open-source/",
	"/posts/linux-qq-bot-部署从入门到入土-以-debian12-为例/":
		"/posts/linux-qq-bot-deploy-debian12/",
	"/posts/n-卡驱动安装后-wayland-丢失原来是这里出了问题/":
		"/posts/nvidia-driver-wayland-lost/",
	"/posts/开源就是免费开源对抗商业你可能对开源有这些误解/":
		"/posts/open-source-misconceptions/",
	"/posts/rocky-linux-服务器开荒记/": "/posts/rocky-linux-server-setup/",
	"/posts/winapps-linux日用的最后一块拼图/": "/posts/winapps-linux/",
	"/posts/遥远的重逢/": "/fiction/far-reunion/",
	"/posts/星光寥落之夜/": "/fiction/starless-night/",
	"/posts/邂逅/": "/fiction/unecpected-meeting/",
	"/notes/css-盒模型/": "/notes/css-box-model/",
	"/notes/css-选择器/": "/notes/css-selectors/",
	"/notes/css-文本样式/": "/notes/css-text-styles/",
	"/notes/dart-基本语法/": "/notes/dart-basics/",
};

export function normalizeSitePath(pathname: string): string {
	let decoded = pathname;
	try {
		decoded = decodeURI(pathname);
	} catch {
		decoded = pathname;
	}
	if (!decoded.startsWith("/")) decoded = `/${decoded}`;
	return decoded.endsWith("/") ? decoded : `${decoded}/`;
}

const redirectSources = new Set(
	Object.keys(legacyRedirects).map((path) => normalizeSitePath(path)),
);

/** Root pagers (`/2/`) and other redirect-only routes should not be indexed. */
export function isRedirectOnlyPath(pathname: string): boolean {
	const normalized = normalizeSitePath(pathname);
	if (/^\/\d+\/$/.test(normalized)) return true;
	if (normalized === "/friends/") return true;
	return redirectSources.has(normalized);
}

export function includeInSitemap(pageUrl: string): boolean {
	try {
		return !isRedirectOnlyPath(new URL(pageUrl).pathname);
	} catch {
		return true;
	}
}
