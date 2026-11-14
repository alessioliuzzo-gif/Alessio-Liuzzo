/**
 * Zentrale Stelle für Umgebungsvariablen.
 *
 * Wichtig: Alles mit dem Präfix EXPO_PUBLIC_ wird in die App eingebaut und ist
 * damit öffentlich. Hier dürfen nur öffentliche Werte stehen (Supabase-URL,
 * anon Key). Geheime Keys (Stripe, Gelato, service_role) gehören ausschliesslich
 * in Supabase Edge Functions.
 */
export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  // Öffentliche SDK-Keys von RevenueCat (keine Geheimnisse).
  revenueCatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
  revenueCatAndroidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
};

/** true, sobald die .env-Datei ausgefüllt ist (ab Phase 1 nötig). */
export const isSupabaseConfigured = env.supabaseUrl !== '' && env.supabaseAnonKey !== '';
