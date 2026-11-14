/**
 * Der Supabase-Client: die einzige Verbindung der App zum Backend.
 * Er benutzt den öffentlichen anon Key. Was ein Nutzer lesen und ändern darf,
 * entscheidet die Datenbank über Row Level Security, nicht die App.
 */
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from './database.types';
import { env, isSupabaseConfigured } from './env';

/** null, solange .env nicht ausgefüllt ist. Die App läuft dann im Demo-Modus. */
export const supabase = isSupabaseConfigured
  ? createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        storage: AsyncStorage, // Sitzung bleibt nach einem App-Neustart erhalten
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // nur für Web-Logins per Link nötig
      },
    })
  : null;

// Das Login-Token läuft nach kurzer Zeit ab und wird automatisch erneuert,
// aber nur solange die App im Vordergrund ist.
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') void supabase.auth.startAutoRefresh();
    else void supabase.auth.stopAutoRefresh();
  });
}

/** Für Stellen, die nur mit verbundenem Backend erreichbar sind. */
export function requireSupabase() {
  if (!supabase) throw new Error('Supabase ist nicht konfiguriert (.env fehlt).');
  return supabase;
}
