/**
 * Unterstützte Sprachen und die Logik, welche Sprache beim Start gilt.
 * Reine Funktionen ohne React, damit sie einfach testbar sind.
 */
export const LANGUAGES = ['de', 'en', 'fr', 'it'] as const;
export type Language = (typeof LANGUAGES)[number];

/** Für Geräte mit einer Sprache, die wir nicht anbieten. */
export const FALLBACK_LANGUAGE: Language = 'en';

/** Sprachnamen stehen immer in der jeweiligen Sprache, darum nicht übersetzt. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  de: 'Deutsch',
  en: 'English',
  fr: 'Français',
  it: 'Italiano',
};

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

/**
 * Reihenfolge: 1. gespeicherte Wahl des Nutzers, 2. erste passende
 * Gerätesprache, 3. Englisch.
 */
export function resolveLanguage(
  stored: string | null | undefined,
  deviceLanguageCodes: readonly (string | null | undefined)[],
): Language {
  if (isLanguage(stored)) return stored;
  for (const code of deviceLanguageCodes) {
    const base = code?.toLowerCase().split('-')[0];
    if (isLanguage(base)) return base;
  }
  return FALLBACK_LANGUAGE;
}
