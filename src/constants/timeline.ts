export interface TimelineItem {
	date: string;
	title: string;
	content: string;
}

export const timelineData: TimelineItem[] = [
	{
		date: "2025-10",
		title: "博客新生",
		content: "兜兜转转，基于 Astro 和 Fuwari 主题搭建了新的博客环境。",
	},
	{
		date: "2025-09",
		title: "寻找最适合的生产力形态",
		content:
			"这一年里在操作系统上反复横跳：年初因为数据丢失彻底告别了 Windows，转向 Linux 和 macOS。后来因为 Arch Linux 滚动更新的激进，主力开发机又回归了 Debian 13 的稳定怀抱。至此，macOS + Debian + Arch 的生产力矩阵才算基本定型。",
	},
	{
		date: "2025-04",
		title: "跑团的新伙伴，全栈的转折点",
		content:
			"骰娘圈迎来大变。为了开发一个新的跑团平台，机缘巧合下加入了 tuanchat 的开发团队。这是我编程方向的一个重大转折点：开始学习并转战前端开发领域，认识了许多有趣的朋友，也迎来了新的跑团伙伴。"
	},
	{
		date: "2024 下半年",
		title: "被迫成为“运维”：服务器与 Linux 踩坑记",
		content:
			"为了给半拍提供一个稳定长久的家，我从最开始的阿里云 Windows Server 开始折腾，一路经历了 CentOS 的痛苦摸索、试水 WordPress 博客，最终在年底为她安家在了 Debian 12。也是在这段频繁换服的过程中，我第一次感受到了命令行的魅力。",
	},
	{
		date: "2024-04",
		title: "你好，半拍",
		content:
			"复活了高中时期的半成品骰娘，并给她取了新名字——「滩间铁半拍」。为了让她真正拥有灵魂，我一头扎进了代码的世界，从零开始学习 TypeScript 和 Go，试着为她添加各种有趣的功能。命运的齿轮开始转动。",
	},
	{
		date: "2023-09",
		title: "踏入统计学大门",
		content:
			"入学左家垅皇家男子职业技术学校，成为一名统计学专业的学生，开始在 p < 0.05 的边缘反复试探。同年认识了大学网上的跑团伙伴，结下了新的跑团羁绊。",
	},
	{
		date: "2022-10",
		title: "跑团的启蒙",
		content:
			"在学校社团杂志上偶然了解到了跑团，开始尝试带着同学在课余时间玩 TRPG。一开始只是自己瞎写一些规则和模组，后来慢慢接触到了 COC (克苏鲁的呼唤) 的正统规则，就此深深陷入了这个充满概率与故事性的世界。",
	},
];
