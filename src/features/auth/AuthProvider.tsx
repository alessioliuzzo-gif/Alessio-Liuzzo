/**
 * Hält den Login-Zustand für die ganze App: die Sitzung (wer ist angemeldet)
 * und das dazugehörige Profil.
 */
import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { Profile } from '@/lib/database.types';
import { isSupabaseConfigured } from '@/lib/env';
import { requireSupabase, supabase } from '@/lib/supabase';

export type SignUpInput = {
  email: string;
  password: string;
  username: string;
  displayName: string;
  birthYear: number;
};

type AuthContextValue = {
  /** true, wenn .env fehlt: Die App zeigt dann die Tabs ohne Konto. */
  demoMode: boolean;
  /** true, bis beim Start geklärt ist, ob jemand angemeldet ist */
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  signIn: (email: string, password: string) => Promise<void>;
  /** @returns 'signed-in' oder 'confirm-email', wenn zuerst die E-Mail bestätigt werden muss */
  signUp: (input: SignUpInput) => Promise<'signed-in' | 'confirm-email'>;
  signOut: () => Promise<void>;
  /** Schickt eine E-Mail mit einem Link, der die App zum Zurücksetzen öffnet. */
  requestPasswordReset: (email: string) => Promise<void>;
  /** Setzt ein neues Passwort für den angemeldeten Nutzer. */
  updatePassword: (password: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Eigener Fehlertyp, damit Screens ihn von Serverfehlern unterscheiden können. */
export class EmailTakenError extends Error {
  code = 'user_already_exists';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loadedProfile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  const userId = session?.user.id ?? null;
  // Ein geladenes Profil zählt nur, solange es zum angemeldeten Nutzer gehört.
  // So bleibt nach einem Logout nichts vom vorherigen Konto sichtbar.
  const profile = loadedProfile && loadedProfile.id === userId ? loadedProfile : null;

  useEffect(() => {
    if (!supabase) return;
    // Feuert sofort mit der gespeicherten Sitzung (INITIAL_SESSION) und danach
    // bei jedem Login, Logout und jeder Token-Erneuerung.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const loadProfile = useCallback(async (id: string) => {
    const { data } = await requireSupabase()
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    return data;
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void loadProfile(userId).then((next) => {
      if (!cancelled) setProfile(next);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      demoMode: !isSupabaseConfigured,
      loading,
      session,
      profile,

      async signIn(email, password) {
        const { error } = await requireSupabase().auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      },

      async signUp({ email, password, username, displayName, birthYear }) {
        const { data, error } = await requireSupabase().auth.signUp({
          email: email.trim(),
          password,
          options: {
            // Der Bestätigungslink in der E-Mail öffnet direkt die App.
            emailRedirectTo: Linking.createURL('/auth-callback'),
            // Diese Angaben liest der Datenbank-Trigger handle_new_user und
            // legt daraus das Profil an (inklusive Alters- und AGB-Prüfung).
            data: {
              username,
              display_name: displayName.trim(),
              birth_year: birthYear,
              terms_accepted: true,
            },
          },
        });
        if (error) throw error;
        // Ist die E-Mail schon registriert, meldet Supabase aus Datenschutzgründen
        // keinen Fehler, sondern liefert einen Nutzer ohne "identities".
        if (data.user && data.user.identities?.length === 0) throw new EmailTakenError();
        return data.session ? 'signed-in' : 'confirm-email';
      },

      async signOut() {
        const { error } = await requireSupabase().auth.signOut();
        if (error) throw error;
      },

      async requestPasswordReset(email) {
        const { error } = await requireSupabase().auth.resetPasswordForEmail(email.trim(), {
          redirectTo: Linking.createURL('/reset-password'),
        });
        if (error) throw error;
      },

      async updatePassword(password) {
        const { error } = await requireSupabase().auth.updateUser({ password });
        if (error) throw error;
      },

      async deleteAccount() {
        const client = requireSupabase();
        // Das Löschen läuft in einer Edge Function, weil nur der Server ein
        // Konto entfernen darf. Sie prüft das Login-Token des Aufrufers.
        const { error } = await client.functions.invoke('delete-account', { method: 'POST' });
        if (error) throw error;
        // Lokale Sitzung verwerfen; das Konto existiert serverseitig nicht mehr.
        await client.auth.signOut({ scope: 'local' });
      },

      async refreshProfile() {
        if (userId) setProfile(await loadProfile(userId));
      },
    }),
    [loading, session, profile, userId, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth muss innerhalb von AuthProvider verwendet werden');
  return ctx;
}
