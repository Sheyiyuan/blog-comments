import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { LinkPreset, type NavBarLink } from "@/types/config";

export const LinkPresets: { [key in LinkPreset]: NavBarLink } = {
	[LinkPreset.Home]: {
		name: i18n(I18nKey.home),
		url: "/",
	},
	[LinkPreset.Passage]: {
		name: i18n(I18nKey.passage),
		url: "/passage/",
	},
	[LinkPreset.Notes]: {
		name: i18n(I18nKey.notes),
		url: "/notes/",
	},
	[LinkPreset.Essays]: {
		name: i18n(I18nKey.essays),
		url: "/essays/",
	},
	[LinkPreset.About]: {
		name: i18n(I18nKey.about),
		url: "/about/",
	},
	[LinkPreset.Archive]: {
		name: i18n(I18nKey.archive),
		url: "/archive/",
	},
	[LinkPreset.Friends]: {
		name: i18n(I18nKey.friends),
		url: "/links/",
	},
};
