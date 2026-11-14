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
  /** Feature Flag für den Kalenderdruck (Phase 10). */
  printEnabled: boolean;
  printPriceChf: number;
  printPremiumDiscountPercent: number;
};

/**
 * Sichere Standardwerte. Sie gelten, bis die Konfiguration geladen ist, und
 * auch dann, wenn das Laden fehlschlägt: Bezahlfunktionen bleiben im Zweifel aus.
 */
export const DEFAULT_APP_CONFIG: AppConfig = {
  subscriptionsEnabled: false,
  minAge: 16,
  termsVersion: '2026-11-entwurf',
  printEnabled: false,
  printPriceChf: 29.9,
  printPremiumDiscountPercent: 0,
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
    } else if (key === 'print_enabled' && typeof value === 'boolean') {
      config.printEnabled = value;
    } else if (key === 'print_price_chf' && typeof value === 'number' && value > 0) {
      config.printPriceChf = value;
    } else if (key === 'print_premium_discount_percent' && typeof value === 'number') {
      config.printPremiumDiscountPercent = Math.min(100, Math.max(0, Math.round(value)));
    }
  }
  return config;
}
