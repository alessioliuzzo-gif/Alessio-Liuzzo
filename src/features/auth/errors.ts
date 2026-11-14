/**
 * Übersetzt Fehler von Supabase in Übersetzungsschlüssel. So sieht der Nutzer
 * nie eine rohe englische Servermeldung.
 */
type MaybeAuthError = { code?: string; status?: number; message?: string; name?: string } | null;

const BY_CODE: Record<string, string> = {
  invalid_credentials: 'authErrors.invalidCredentials',
  email_not_confirmed: 'authErrors.emailNotConfirmed',
  user_already_exists: 'authErrors.emailTaken',
  email_exists: 'authErrors.emailTaken',
  weak_password: 'authErrors.weakPassword',
  email_address_invalid: 'authErrors.emailInvalid',
  over_email_send_rate_limit: 'authErrors.rateLimited',
  over_request_rate_limit: 'authErrors.rateLimited',
  signup_disabled: 'authErrors.signupDisabled',
};

export function authErrorKey(error: unknown): string {
  const e = error as MaybeAuthError;
  if (e?.code && BY_CODE[e.code]) return BY_CODE[e.code];
  if (e?.status === 429) return 'authErrors.rateLimited';
  const message = e?.message ?? '';
  if (
    e?.name === 'AuthRetryableFetchError' ||
    /network request failed|failed to fetch/i.test(message)
  ) {
    return 'authErrors.network';
  }
  return 'authErrors.unknown';
}
