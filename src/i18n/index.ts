/**
 * Richtet i18next ein (Bibliothek für Übersetzungen). Alle sichtbaren Texte
 * stehen in src/i18n/locales/*.json, nie direkt im Code.
 */
import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { readSetting, StorageKeys, writeSetting } from '@/lib/storage';

import { FALLBACK_LANGUAGE, type Language, resolveLanguage } from './languages';
import de from './locales/de.json';
import en from './locales/en.json';
import fr from './locales/fr.json';
import it from './locales/it.json';

export const resources = {
  de: { translation: de },
  en: { translation: en },
  fr: { translation: fr },
  it: { translation: it },
} as const;

function deviceLanguageCodes(): (string | null)[] {
  try {
    return getLocales().map((locale) => locale.languageCode);
  } catch {
    return [];
  }
}

const i18n = createInstance();

// Sofort mit der Gerätesprache starten, damit der erste Screen schon übersetzt ist.
void i18n.use(initReactI18next).init({
  resources,
  lng: resolveLanguage(null, deviceLanguageCodes()),
  fallbackLng: FALLBACK_LANGUAGE,
  interpolation: { escapeValue: false }, // React schützt bereits vor XSS
});

/** Lädt die gespeicherte Sprachwahl und wendet sie an. */
export async function restoreLanguage(): Promise<void> {
  const stored = await readSetting(StorageKeys.language);
  const language = resolveLanguage(stored, deviceLanguageCodes());
  if (language !== i18n.language) await i18n.changeLanguage(language);
}

export async function setLanguage(language: Language): Promise<void> {
  await i18n.changeLanguage(language);
  await writeSetting(StorageKeys.language, language);
}

export default i18n;
