/**
 * Passwort vergessen: E-Mail eingeben, Supabase schickt einen Link.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AuthScreen } from '@/components/auth-screen';
import { Button, Notice, TextField } from '@/components/form';
import { AppText } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { authErrorKey } from '@/features/auth/errors';
import { validateEmail } from '@/features/auth/validation';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const invalid = validateEmail(email);

  async function submit() {
    if (invalid) return;
    setBusy(true);
    setError(null);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (e) {
      setError(authErrorKey(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreen>
      <AppText variant="title">{t('auth.forgotTitle')}</AppText>
      {sent ? (
        <Notice>{t('auth.forgotSent', { email: email.trim() })}</Notice>
      ) : (
        <>
          <AppText muted>{t('auth.forgotBody')}</AppText>
          {error && <Notice kind="error">{t(error)}</Notice>}
          <TextField
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onSubmitEditing={submit}
          />
          <Button
            label={t('auth.sendLink')}
            onPress={submit}
            loading={busy}
            disabled={invalid !== null}
          />
        </>
      )}
      <Button
        label={t('auth.toSignIn')}
        variant="text"
        onPress={() => router.replace('/sign-in')}
      />
    </AuthScreen>
  );
}
