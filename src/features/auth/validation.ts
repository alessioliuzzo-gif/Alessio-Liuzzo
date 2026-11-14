/**
 * Eingabeprüfungen für Registrierung und Profil. Reine Funktionen.
 * Jede Funktion gibt null zurück (gültig) oder einen Übersetzungsschlüssel.
 * Dieselben Regeln prüft die Datenbank noch einmal; die App prüft nur, damit
 * der Nutzer sofort eine verständliche Meldung bekommt.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
export const DISPLAY_NAME_MAX_LENGTH = 40;

export type ValidationError = string | null;

export function validateEmail(email: string): ValidationError {
  const value = email.trim();
  if (value === '') return 'validation.emailRequired';
  // Bewusst einfach: genau ein @, davor und danach etwas, Punkt in der Domain.
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) ? null : 'validation.emailInvalid';
}

export function validatePassword(password: string): ValidationError {
  return password.length >= PASSWORD_MIN_LENGTH ? null : 'validation.passwordTooShort';
}

/** Macht aus einer Eingabe die Form, in der Benutzernamen gespeichert werden. */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function validateUsername(username: string): ValidationError {
  const value = normalizeUsername(username);
  if (value === '') return 'validation.usernameRequired';
  return USERNAME_PATTERN.test(value) ? null : 'validation.usernameInvalid';
}

export function validateDisplayName(name: string): ValidationError {
  const value = name.trim();
  if (value === '') return 'validation.displayNameRequired';
  return value.length <= DISPLAY_NAME_MAX_LENGTH ? null : 'validation.displayNameTooLong';
}

/**
 * Wir fragen nur das Geburtsjahr ab (Datensparsamkeit). Zusätzlich bestätigt
 * der Nutzer mit einem Häkchen, dass er das Mindestalter erreicht hat.
 */
export function validateBirthYear(
  input: string,
  minAge: number,
  currentYear: number = new Date().getFullYear(),
): ValidationError {
  const value = input.trim();
  if (value === '') return 'validation.birthYearRequired';
  if (!/^\d{4}$/.test(value)) return 'validation.birthYearInvalid';
  const year = Number(value);
  if (year < 1900 || year > currentYear) return 'validation.birthYearInvalid';
  return currentYear - year >= minAge ? null : 'validation.tooYoung';
}
