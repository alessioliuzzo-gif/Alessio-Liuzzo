/**
 * Fern-Konfiguration aus der Supabase-Tabelle "app_config". Sie wird beim
 * App-Start geladen. So lassen sich z. B. das Abo ein- und ausschalten, ohne
 * ein App-Update zu veröffentlichen.
 */
export type AppConfig = {
  /** Feature Flag für Abo und Paywall (Phase 9). */
  subscriptionsEnabled: boolean;
  minAge: number;
  termsVersion: string;
};

/**
 * Sichere Standardwerte. Sie gelten, bis die Konfiguration geladen ist, und
 * auch dann, wenn das Laden fehlschlägt: Bezahlfunktionen bleiben im Zweifel aus.
 */
export const DEFAULT_APP_CONFIG: AppConfig = {
  subscriptionsEnabled: false,
  minAge: 16,
  termsVersion: '2026-11-entwurf',
};

/** Wandelt die Zeilen der Tabelle in ein typisiertes Objekt um und ignoriert Unsinn. */
export function parseAppConfig(rows: readonly { key: string; value: unknown }[]): AppConfig {
  const config = { ...DEFAULT_APP_CONFIG };
  for (const { key, value } of rows) {
    if (key === 'subscriptions_enabled' && typeof value === 'boolean') {
      config.subscriptionsEnabled = value;
    } else if (key === 'min_age' && typeof value === 'number' && Number.isInteger(value)) {
      // Nie unter den eingebauten Wert fallen, auch nicht durch einen Tippfehler im Dashboard.
      config.minAge = Math.max(value, DEFAULT_APP_CONFIG.minAge);
    } else if (key === 'terms_version' && typeof value === 'string' && value !== '') {
      config.termsVersion = value;
    }
  }
  return config;
}
