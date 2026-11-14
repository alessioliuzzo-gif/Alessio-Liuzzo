import { authErrorKey } from '@/features/auth/errors';
import {
  normalizeUsername,
  validateBirthYear,
  validateDisplayName,
  validateEmail,
  validatePassword,
  validateUsername,
} from '@/features/auth/validation';
import { DEFAULT_APP_CONFIG, parseAppConfig } from '@/features/config/app-config';
import de from '@/i18n/locales/de.json';

describe('Eingabeprüfung', () => {
  it('prüft E-Mail-Adressen', () => {
    expect(validateEmail(' anna@example.ch ')).toBeNull();
    expect(validateEmail('')).toBe('validation.emailRequired');
    for (const bad of [
      'anna',
      'anna@',
      '@example.ch',
      'anna@example',
      'a b@example.ch',
      'a@b@c.ch',
    ]) {
      expect(validateEmail(bad)).toBe('validation.emailInvalid');
    }
  });

  it('verlangt mindestens 8 Zeichen im Passwort', () => {
    expect(validatePassword('1234567')).toBe('validation.passwordTooShort');
    expect(validatePassword('12345678')).toBeNull();
  });

  it('prüft Benutzernamen nach denselben Regeln wie die Datenbank', () => {
    expect(normalizeUsername('  Anna_1 ')).toBe('anna_1');
    expect(validateUsername('Anna_1')).toBeNull();
    expect(validateUsername('')).toBe('validation.usernameRequired');
    for (const bad of ['ab', 'a'.repeat(21), 'anna müller', 'anna-1', 'anna.1']) {
      expect(validateUsername(bad)).toBe('validation.usernameInvalid');
    }
  });

  it('prüft den Anzeigenamen', () => {
    expect(validateDisplayName('Anna')).toBeNull();
    expect(validateDisplayName('   ')).toBe('validation.displayNameRequired');
    expect(validateDisplayName('x'.repeat(41))).toBe('validation.displayNameTooLong');
  });

  it('setzt das Mindestalter über das Geburtsjahr durch', () => {
    expect(validateBirthYear('2010', 16, 2026)).toBeNull();
    expect(validateBirthYear('2011', 16, 2026)).toBe('validation.tooYoung');
    expect(validateBirthYear('', 16, 2026)).toBe('validation.birthYearRequired');
    for (const bad of ['99', '20100', 'abcd', '1899', '2027']) {
      expect(validateBirthYear(bad, 16, 2026)).toBe('validation.birthYearInvalid');
    }
  });
});

describe('authErrorKey', () => {
  it('ordnet bekannte Fehlercodes zu', () => {
    expect(authErrorKey({ code: 'invalid_credentials' })).toBe('authErrors.invalidCredentials');
    expect(authErrorKey({ code: 'email_not_confirmed' })).toBe('authErrors.emailNotConfirmed');
    expect(authErrorKey({ code: 'user_already_exists' })).toBe('authErrors.emailTaken');
    expect(authErrorKey({ status: 429 })).toBe('authErrors.rateLimited');
  });

  it('erkennt Netzwerkfehler', () => {
    expect(authErrorKey({ name: 'AuthRetryableFetchError' })).toBe('authErrors.network');
    expect(authErrorKey(new TypeError('Network request failed'))).toBe('authErrors.network');
  });

  it('fällt bei Unbekanntem auf eine allgemeine Meldung zurück', () => {
    expect(authErrorKey({ code: 'irgendwas', message: 'Database error saving new user' })).toBe(
      'authErrors.unknown',
    );
    expect(authErrorKey(null)).toBe('authErrors.unknown');
  });

  it('liefert nur Schlüssel, für die es einen Text gibt', () => {
    const inputs = [
      { code: 'invalid_credentials' },
      { code: 'email_not_confirmed' },
      { code: 'email_exists' },
      { code: 'weak_password' },
      { code: 'email_address_invalid' },
      { code: 'signup_disabled' },
      { code: 'over_request_rate_limit' },
      { name: 'AuthRetryableFetchError' },
      {},
    ];
    for (const input of inputs) {
      const key = authErrorKey(input).split('.')[1] as keyof typeof de.authErrors;
      expect(de.authErrors[key]).toEqual(expect.any(String));
    }
  });
});

describe('parseAppConfig', () => {
  it('liefert sichere Standardwerte, wenn nichts geladen wurde', () => {
    expect(parseAppConfig([])).toEqual(DEFAULT_APP_CONFIG);
    expect(DEFAULT_APP_CONFIG.subscriptionsEnabled).toBe(false);
  });

  it('übernimmt gültige Werte', () => {
    expect(
      parseAppConfig([
        { key: 'subscriptions_enabled', value: true },
        { key: 'min_age', value: 18 },
        { key: 'terms_version', value: '2027-01' },
        { key: 'unbekannt', value: 1 },
      ]),
    ).toEqual({ subscriptionsEnabled: true, minAge: 18, termsVersion: '2027-01' });
  });

  it('ignoriert Werte mit falschem Typ und senkt das Mindestalter nie unter 16', () => {
    expect(
      parseAppConfig([
        { key: 'subscriptions_enabled', value: 'true' },
        { key: 'min_age', value: 3 },
        { key: 'terms_version', value: null },
      ]),
    ).toEqual(DEFAULT_APP_CONFIG);
  });
});
