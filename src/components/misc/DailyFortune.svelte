<script lang="ts">
import { onMount } from "svelte";

const COOKIE_NAME = "shy_daily_fortune_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 5;

type FortuneTier = {
	min: number;
	max: number;
	title: string;
	description: string;
};

const fortuneTiers: FortuneTier[] = [
	{
		min: 1,
		max: 1,
		title: "大成功",
		description: "外神眷顾！今日代码一行不改即刻上线，Arch 滚动丝滑顺畅，世界线变动率 0.00%。",
	},
	{
		min: 2,
		max: 12,
		title: "极难成功",
		description: "灵感迸发！这是你充满了决心，逻辑严丝合缝，足以洞穿复杂的问题。",
	},
	{
		min: 13,
		max: 30,
		title: "困难成功",
		description: "稳扎稳打。今天的 Bug 像被安抚的骰娘一样乖巧，虽然还是想折腾，但效率显著提高。",
	},
	{
		min: 31,
		max: 60,
		title: "成功",
		description: "普通的一天。虽有半途而废的冲动，但好歹能完成当天的 Commit，San 值保持稳定。",
	},
	{
		max: 95,
		min: 61,
		title: "失败",
		description: "理性丧失。文档读起来像克苏鲁神话一样晦涩，逻辑检定未通过，建议多喝热水少折腾。",
	},
	{
		min: 96,
		max: 100,
		title: "大失败",
		description: "理智归零！键盘产生了自我意识并拒绝工作，建议立刻物理休眠，否则可能触发 rm -rf 惨案。",
	},
];

let fortuneValue: number | null = null;
let fortuneTitle = "";
let fortuneDescription = "";
let dateLabel = "";
let revealed = false;

function getCookie(name: string): string | null {
	const encodedName = `${encodeURIComponent(name)}=`;
	const cookies = document.cookie ? document.cookie.split("; ") : [];

	for (const cookie of cookies) {
		if (cookie.startsWith(encodedName)) {
			return decodeURIComponent(cookie.slice(encodedName.length));
		}
	}

	return null;
}

function setCookie(name: string, value: string, maxAge: number) {
	document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; samesite=lax`;
}

function createVisitorId(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}

	return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getVisitorId(): string {
	const existing = getCookie(COOKIE_NAME);
	if (existing) {
		return existing;
	}

	const nextId = createVisitorId();
	setCookie(COOKIE_NAME, nextId, COOKIE_MAX_AGE);
	return nextId;
}

function getDateKey(date: Date): string {
	const year = date.getFullYear();
	const month = `${date.getMonth() + 1}`.padStart(2, "0");
	const day = `${date.getDate()}`.padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function getDateLabel(date: Date): string {
	return new Intl.DateTimeFormat("zh-CN", {
		month: "long",
		day: "numeric",
		weekday: "long",
	}).format(date);
}

function hashString(input: string): number {
	let hash = 2166136261;

	for (let index = 0; index < input.length; index++) {
		hash ^= input.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}

	return hash >>> 0;
}

function resolveFortune(score: number): FortuneTier {
	return fortuneTiers.find((tier) => score >= tier.min && score <= tier.max) ?? fortuneTiers[2];
}

function revealFortune() {
	if (fortuneValue === null) {
		return;
	}

	revealed = true;
}

onMount(() => {
	const today = new Date();
	const dateKey = getDateKey(today);
	dateLabel = getDateLabel(today);

	const visitorId = getVisitorId();
	const score = (hashString(`${visitorId}:${dateKey}`) % 100) + 1;
	const fortune = resolveFortune(score);

	fortuneValue = score;
	fortuneTitle = fortune.title;
	fortuneDescription = fortune.description;
	});
</script>

<div class="daily-fortune-card">
	<div class="daily-fortune-head">
		<div>
			<div class="daily-fortune-title">掷骰子看今天运势</div>
			<div class="daily-fortune-subtitle">由半拍基于你的访客标识和今天的日期生成。</div>
		</div>
		<button class="daily-fortune-button" onclick={revealFortune}>
			掷个 1d100
		</button>
	</div>

	{#if revealed && fortuneValue !== null}
		<div class="daily-fortune-result" role="status" aria-live="polite">
			<div class="daily-fortune-meta">{dateLabel} · 今日判定</div>
			<div class="daily-fortune-score-row">
				<div class="daily-fortune-score">{fortuneValue}</div>
				<div>
					<div class="daily-fortune-tier">{fortuneTitle}</div>
					<div class="daily-fortune-description">{fortuneDescription}</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.daily-fortune-card {
		margin: 20px 0 24px;
		padding: 16px 18px;
		border: 1px solid rgba(128, 128, 128, 0.2);
		border-radius: 12px;
		background: rgba(128, 128, 128, 0.03);
	}

	.daily-fortune-head {
		display: flex;
		gap: 16px;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
	}

	.daily-fortune-title {
		font-weight: 700;
		opacity: 0.92;
	}

	.daily-fortune-subtitle {
		margin-top: 4px;
		font-size: 0.9rem;
		opacity: 0.65;
	}

	.daily-fortune-button {
		border: none;
		border-radius: 999px;
		padding: 0.65rem 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: transform 0.15s ease, opacity 0.15s ease, background 0.15s ease;
		background: var(--btn-regular-bg, rgba(128, 128, 128, 0.14));
		color: var(--btn-content, inherit);
	}

	.daily-fortune-button:hover {
		opacity: 0.92;
	}

	.daily-fortune-button:active {
		transform: scale(0.98);
	}

	.daily-fortune-result {
		margin-top: 16px;
		padding-top: 16px;
		border-top: 1px dashed rgba(128, 128, 128, 0.2);
	}

	.daily-fortune-meta {
		font-size: 0.88rem;
		opacity: 0.65;
	}

	.daily-fortune-score-row {
		margin-top: 10px;
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.daily-fortune-score {
		min-width: 72px;
		height: 72px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 18px;
		font-size: 1.8rem;
		font-weight: 800;
		background: rgba(128, 128, 128, 0.08);
		flex-shrink: 0;
	}

	.daily-fortune-tier {
		font-weight: 700;
		font-size: 1.05rem;
	}

	.daily-fortune-description {
		margin-top: 6px;
		line-height: 1.7;
		opacity: 0.85;
	}

	@media (max-width: 640px) {
		.daily-fortune-score-row {
			align-items: flex-start;
		}

		.daily-fortune-score {
			min-width: 60px;
			height: 60px;
			font-size: 1.5rem;
		}
	}
</style>