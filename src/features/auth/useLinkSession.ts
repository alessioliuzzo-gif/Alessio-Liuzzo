import * as Linking from 'expo-linking';
import { useEffect, useMemo, useState } from 'react';

import { requireSupabase } from '@/lib/supabase';

import { parseAuthLink } from './link-session';

/** Übernimmt die Sitzung aus dem Link, mit dem die App geöffnet wurde. */
export function useLinkSession(): 'pending' | 'ok' | 'error' {
  const url = Linking.useLinkingURL();
  const parsed = useMemo(
    () => parseAuthLink(url ?? (typeof window !== 'undefined' ? window.location?.href : null)),
    [url],
  );
  const [result, setResult] = useState<{ token: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (parsed.kind !== 'tokens') return;
    let cancelled = false;
    requireSupabase()
      .auth.setSession({ access_token: parsed.accessToken, refresh_token: parsed.refreshToken })
      .then(({ error }) => {
        if (!cancelled) setResult({ token: parsed.accessToken, ok: !error });
      });
    return () => {
      cancelled = true;
    };
  }, [parsed]);

  if (parsed.kind === 'error') return 'error';
  if (parsed.kind === 'tokens' && result?.token === parsed.accessToken) return result.ok ? 'ok' : 'error';
  return 'pending';
}
