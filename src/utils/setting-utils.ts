import {
	AUTO_MODE,
	DARK_MODE,
	DEFAULT_THEME,
	LIGHT_MODE,
} from "@constants/constants.ts";
import { expressiveCodeConfig } from "@/config";
import type { LIGHT_DARK_MODE } from "@/types/config";

export function getDefaultHue(): number {
	const fallback = "250";
	if (typeof document === "undefined") {
		return Number.parseInt(fallback, 10);
	}
	const configCarrier = document.getElementById("config-carrier");
	return Number.parseInt(configCarrier?.dataset.hue || fallback, 10);
}

/**
 * Returns the Web Storage API only when it is actually usable.
 *
 * `typeof localStorage === "undefined"` is NOT a safe guard: Node 25 exposes a
 * placeholder `localStorage` object without `getItem`/`setItem`, and some
 * browsers throw on access when storage is disabled. So verify the API exists
 * and swallow any access error.
 */
function getStorage(): Storage | null {
	try {
		const storage = (globalThis as { localStorage?: unknown }).localStorage;
		if (
			storage &&
			typeof (storage as Storage).getItem === "function" &&
			typeof (storage as Storage).setItem === "function"
		) {
			return storage as Storage;
		}
	} catch {
		// Ignore: storage unavailable or access denied.
	}
	return null;
}

export function getHue(): number {
	const storage = getStorage();
	if (!storage) {
		return getDefaultHue();
	}
	const stored = storage.getItem("hue");
	return stored ? Number.parseInt(stored, 10) : getDefaultHue();
}

export function setHue(hue: number): void {
	const storage = getStorage();
	if (!storage || typeof document === "undefined") {
		return;
	}
	storage.setItem("hue", String(hue));
	const r = document.querySelector(":root") as HTMLElement;
	if (!r) {
		return;
	}
	r.style.setProperty("--hue", String(hue));
}

export function applyThemeToDocument(theme: LIGHT_DARK_MODE) {
	if (typeof document === "undefined") {
		return;
	}

	switch (theme) {
		case LIGHT_MODE:
			document.documentElement.classList.remove("dark");
			break;
		case DARK_MODE:
			document.documentElement.classList.add("dark");
			break;
		case AUTO_MODE:
			if (
				typeof window !== "undefined" &&
				window.matchMedia("(prefers-color-scheme: dark)").matches
			) {
				document.documentElement.classList.add("dark");
			} else {
				document.documentElement.classList.remove("dark");
			}
			break;
	}

	// Set the theme for Expressive Code
	document.documentElement.setAttribute(
		"data-theme",
		expressiveCodeConfig.theme,
	);
}

export function setTheme(theme: LIGHT_DARK_MODE): void {
	const storage = getStorage();
	if (storage) {
		storage.setItem("theme", theme);
	}
	applyThemeToDocument(theme);
}

export function getStoredTheme(): LIGHT_DARK_MODE {
	const storage = getStorage();
	if (!storage) {
		return DEFAULT_THEME;
	}
	return (storage.getItem("theme") as LIGHT_DARK_MODE) || DEFAULT_THEME;
}
