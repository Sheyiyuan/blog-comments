import { DateTime, FixedOffsetZone, type Zone } from "luxon";
import { siteConfig } from "@/config";

export type SiteDateTimeConfig = {
	timeZone: string;
	defaultTime: string;
};

function getSiteDateTimeConfig(): SiteDateTimeConfig {
	return {
		timeZone: siteConfig.dateTime?.timeZone || "+08:00",
		defaultTime: siteConfig.dateTime?.defaultTime || "16:00",
	};
}

function resolveTimeZone(timeZone: string): string | Zone {
	const raw = timeZone.trim();
	if (!raw) return FixedOffsetZone.instance(8 * 60);

	// Accept numeric offsets like "+8", "+08", "+08:00", "-05:30".
	const m = raw.match(/^([+-])(\d{1,2})(?::?(\d{2}))?$/);
	if (m) {
		const sign = m[1] === "-" ? -1 : 1;
		const hours = Number(m[2]);
		const minutes = m[3] ? Number(m[3]) : 0;
		if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
			throw new Error(`Invalid timeZone offset: "${timeZone}"`);
		}
		if (hours > 23 || minutes > 59) {
			throw new Error(`Invalid timeZone offset: "${timeZone}"`);
		}
		return FixedOffsetZone.instance(sign * (hours * 60 + minutes));
	}

	// Accept "UTC+8" / "UTC+08:00".
	const m2 = raw.match(/^UTC([+-])(\d{1,2})(?::?(\d{2}))?$/i);
	if (m2) {
		const sign = m2[1] === "-" ? -1 : 1;
		const hours = Number(m2[2]);
		const minutes = m2[3] ? Number(m2[3]) : 0;
		if (hours > 23 || minutes > 59) {
			throw new Error(`Invalid timeZone offset: "${timeZone}"`);
		}
		return FixedOffsetZone.instance(sign * (hours * 60 + minutes));
	}

	// Fallback: treat as IANA zone (e.g. "Asia/Shanghai").
	return raw;
}

function assertValidDefaultTime(defaultTime: string): void {
	if (!/^\d{2}:\d{2}$/.test(defaultTime)) {
		throw new Error(
			`Invalid defaultTime format: "${defaultTime}" (expected HH:mm)`,
		);
	}
}

/**
 * Parse date/time values from frontmatter.
 *
 * Supported inputs:
 * - Date instance
 * - "YYYY-MM-DD" (time will be filled with siteConfig.dateTime.defaultTime)
 * - "YYYY-MM-DD HH:mm" / "YYYY-MM-DDTHH:mm" (interpreted in siteConfig.dateTime.timeZone)
 * - ISO strings with timezone/offset (respects the provided zone)
 */
export function parseFrontmatterDateTime(input: unknown): Date {
	const { timeZone, defaultTime } = getSiteDateTimeConfig();
	const zone = resolveTimeZone(timeZone);
	assertValidDefaultTime(defaultTime);

	if (input instanceof Date) {
		if (Number.isNaN(input.getTime())) {
			throw new Error("Invalid Date in frontmatter");
		}

		// Some frontmatter parsers may coerce a plain "YYYY-MM-DD" into a Date at 00:00:00Z.
		// Treat that as a date-only input and fill the site default time in the configured timezone.
		if (
			input.getUTCHours() === 0 &&
			input.getUTCMinutes() === 0 &&
			input.getUTCSeconds() === 0 &&
			input.getUTCMilliseconds() === 0
		) {
			const ymd = DateTime.fromJSDate(input, { zone: "utc" }).toFormat(
				"yyyy-MM-dd",
			);
			const dt = DateTime.fromFormat(
				`${ymd} ${defaultTime}`,
				"yyyy-MM-dd HH:mm",
				{
					zone,
				},
			);
			if (!dt.isValid)
				throw new Error(`Invalid date value: ${input.toISOString()}`);
			return dt.toJSDate();
		}

		return input;
	}

	if (typeof input !== "string") {
		throw new Error(
			`Unsupported date type in frontmatter: ${typeof input} (expected string or Date)`,
		);
	}

	const raw = input.trim();
	if (!raw) throw new Error("Empty date string in frontmatter");

	// 1) Pure date -> fill default time in site time zone.
	if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
		const dt = DateTime.fromFormat(
			`${raw} ${defaultTime}`,
			"yyyy-MM-dd HH:mm",
			{
				zone,
			},
		);
		if (!dt.isValid) throw new Error(`Invalid date string: "${raw}"`);
		return dt.toJSDate();
	}

	// 2) Date + minutes (space or 'T'), no explicit offset -> interpret in site time zone.
	if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/.test(raw)) {
		const normalized = raw.replace("T", " ");
		const dt = DateTime.fromFormat(normalized, "yyyy-MM-dd HH:mm", {
			zone,
		});
		if (!dt.isValid) throw new Error(`Invalid datetime string: "${raw}"`);
		return dt.toJSDate();
	}

	// 3) ISO with timezone/offset -> respect the embedded zone.
	if (/(Z|[+-]\d{2}:?\d{2})$/i.test(raw)) {
		const dt = DateTime.fromISO(raw, { setZone: true });
		if (!dt.isValid) throw new Error(`Invalid ISO datetime string: "${raw}"`);
		return dt.toJSDate();
	}

	// 4) ISO without offset -> treat as site time zone.
	const iso = DateTime.fromISO(raw, { zone });
	if (!iso.isValid) throw new Error(`Invalid datetime string: "${raw}"`);
	return iso.toJSDate();
}

export function formatDateToYYYYMMDD(date: Date): string {
	const { timeZone } = getSiteDateTimeConfig();
	const zone = resolveTimeZone(timeZone);
	return DateTime.fromJSDate(date, { zone }).toFormat("yyyy-MM-dd");
}

export function formatDateTimeToYYYYMMDDHHmm(date: Date): string {
	const { timeZone } = getSiteDateTimeConfig();
	const zone = resolveTimeZone(timeZone);
	return DateTime.fromJSDate(date, { zone }).toFormat("yyyy-MM-dd HH:mm");
}

/** ISO string with timezone offset (seconds included, milliseconds suppressed). */
export function formatDateTimeToISOWithOffset(date: Date): string {
	const { timeZone } = getSiteDateTimeConfig();
	const zone = resolveTimeZone(timeZone);
	return (
		DateTime.fromJSDate(date, { zone }).toISO({
			suppressMilliseconds: true,
		}) ?? date.toISOString()
	);
}
