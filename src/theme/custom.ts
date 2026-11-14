/**
 * Eigenes Design: Der Nutzer wählt hell/dunkel, Akzentfarbe, Eckenform und
 * Schrift. Daraus entsteht ein vollständiges Theme. Reine Funktionen.
 */
import { contrastRatio } from './contrast';
import { type Theme, themes } from './themes';

export type CustomShape = 'sharp' | 'soft' | 'round';
export type CustomFont = 'sans' | 'serif' | 'rounded';

export type CustomThemeSettings = {
  dark: boolean;
  accent: string;
  shape: CustomShape;
  font: CustomFont;
};

export const DEFAULT_CUSTOM: CustomThemeSettings = {
  dark: false,
  accent: '#1F5FE0',
  shape: 'soft',
  font: 'sans',
};

/**
 * Akzentfarben zur Auswahl. Je eine Variante für helle und dunkle Flächen,
 * damit Schaltflächen und Symbole immer gut erkennbar bleiben (per Test geprüft).
 */
export const ACCENTS: readonly { id: string; light: string; dark: string }[] = [
  { id: 'blue', light: '#1F5FE0', dark: '#6EA8FF' },
  { id: 'violet', light: '#7650C8', dark: '#B79BFF' },
  { id: 'pink', light: '#C2306E', dark: '#FF86B8' },
  { id: 'red', light: '#C0392B', dark: '#FF7A6B' },
  { id: 'orange', light: '#B5521A', dark: '#FFA057' },
  { id: 'green', light: '#2E7D32', dark: '#6FD17A' },
  { id: 'teal', light: '#0F766E', dark: '#4FD1C5' },
  { id: 'lime', light: '#4D7C0F', dark: '#B6F23C' },
  { id: 'gold', light: '#946200', dark: '#F4C542' },
  { id: 'ink', light: '#111111', dark: '#F5F5F7' },
];

export const SHAPES: readonly CustomShape[] = ['sharp', 'soft', 'round'];
export const FONTS: readonly CustomFont[] = ['sans', 'serif', 'rounded'];

const RADII: Record<CustomShape, Theme['radius']> = {
  sharp: { sm: 2, md: 4, lg: 8, pill: 999 },
  soft: { sm: 8, md: 14, lg: 22, pill: 999 },
  round: { sm: 12, md: 20, lg: 30, pill: 999 },
};

const FONT_SOURCE: Record<CustomFont, Theme['fonts']> = {
  sans: themes.minimal.fonts,
  serif: { heading: themes.warm.fonts.heading, body: themes.warm.fonts.body },
  rounded: themes.pastel.fonts,
};

/** Prüft gespeicherte Einstellungen und ersetzt Ungültiges durch Standardwerte. */
export function parseCustomSettings(raw: string | null): CustomThemeSettings {
  if (!raw) return DEFAULT_CUSTOM;
  try {
    const value = JSON.parse(raw) as Partial<CustomThemeSettings>;
    const accent = ACCENTS.find((a) => a.light === value.accent || a.dark === value.accent);
    return {
      dark: value.dark === true,
      accent: accent ? accent.light : DEFAULT_CUSTOM.accent,
      shape: SHAPES.includes(value.shape as CustomShape)
        ? (value.shape as CustomShape)
        : DEFAULT_CUSTOM.shape,
      font: FONTS.includes(value.font as CustomFont)
        ? (value.font as CustomFont)
        : DEFAULT_CUSTOM.font,
    };
  } catch {
    return DEFAULT_CUSTOM;
  }
}

export function buildCustomTheme(settings: CustomThemeSettings): Theme {
  const base = settings.dark ? themes.bold : themes.minimal;
  const accent = ACCENTS.find((a) => a.light === settings.accent) ?? ACCENTS[0];
  const primary = settings.dark ? accent.dark : accent.light;
  // Text auf der Akzentfarbe: Weiss oder Schwarz, je nachdem was besser lesbar ist.
  const onPrimary =
    contrastRatio('#FFFFFF', primary) >= contrastRatio('#111111', primary) ? '#FFFFFF' : '#111111';
  return {
    id: 'custom',
    isDark: settings.dark,
    colors: { ...base.colors, primary, onPrimary, accent: primary },
    radius: RADII[settings.shape],
    fonts: FONT_SOURCE[settings.font],
  };
}
