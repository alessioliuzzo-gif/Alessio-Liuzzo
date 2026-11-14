/**
 * Kleine Hülle um AsyncStorage (lokaler Schlüssel-Wert-Speicher auf dem Gerät).
 * Hier liegen nur unkritische Einstellungen wie Theme und Sprache.
 * Fehler werden geschluckt: Die App muss auch ohne Speicher starten.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const StorageKeys = {
  theme: 'dayshot.theme',
  language: 'dayshot.language',
  calendarDesign: 'dayshot.calendarDesign',
  customTheme: 'dayshot.customTheme',
  secretNeon: 'dayshot.secret.neon',
} as const;

type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];

export async function readSetting(key: StorageKey): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function writeSetting(key: StorageKey, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    // Einstellung gilt dann nur bis zum nächsten App-Start.
  }
}
