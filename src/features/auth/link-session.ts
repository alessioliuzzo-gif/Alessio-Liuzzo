/**
 * Liest die Anmeldedaten aus einem E-Mail-Link (Bestätigung oder Passwort
 * zurücksetzen). Supabase hängt sie nach einem "#" an die Adresse an.
 */
export type LinkTokens =
  | { kind: 'tokens'; accessToken: string; refreshToken: string; type: string | null }
  | { kind: 'error'; description: string }
  | { kind: 'none' };

export function parseAuthLink(url: string | null | undefined): LinkTokens {
  if (!url) return { kind: 'none' };
  const hash = url.includes('#') ? url.slice(url.indexOf('#') + 1) : '';
  const query = url.includes('?') ? url.slice(url.indexOf('?') + 1).split('#')[0] : '';
  const params = new URLSearchParams(hash || query);
  const error = params.get('error_description') ?? params.get('error');
  if (error) return { kind: 'error', description: error.replace(/\+/g, ' ') };
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken)
    return { kind: 'tokens', accessToken, refreshToken, type: params.get('type') };
  return { kind: 'none' };
}
