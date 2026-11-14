import { Redirect } from 'expo-router';

/**
 * Einstieg in den Login-Bereich. Wer nicht angemeldet ist, wird vom
 * Root-Layout hierher geschickt und landet auf dem Anmelde-Screen.
 */
export default function AuthIndex() {
  return <Redirect href="/sign-in" />;
}
