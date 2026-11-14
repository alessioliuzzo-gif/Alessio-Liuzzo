/**
 * Neues Passwort setzen. Wird über den Link aus der E-Mail "Passwort
 * zurücksetzen" geöffnet.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';

import { AuthScreen } from '@/components/auth-screen';
import { Button, Notice, TextField } from '@/components/form';
import { AppText } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { authErrorKey } from '@/features/auth/errors';
import { useLinkSession } from '@/features/auth/useLinkSession';
import { PASSWORD_MIN_LENGTH, validatePassword } from '@/features/auth/validation';
import { useTheme } from '@/theme/ThemeProvider';

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { session, updatePassword } = useAuth();
  const link = useLinkSession();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const invalid = validatePassword(password);

  async function submit() {
    if (invalid) return;
    setBusy(true);
    setError(null);
    try {
      await updatePassword(password);
      setDone(true);
    } catch (e) {
      setError(authErrorKey(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreen>
      <AppText variant="title">{t('auth.newPasswordTitle')}</AppText>
      {done ? (
        <>
          <Notice>{t('auth.passwordChanged')}</Notice>
          <Button label={t('auth.continue')} onPress={() => router.replace('/')} />
        </>
      ) : link === 'error' ? (
        <>
          <Notice kind="error">{t('auth.linkInvalid')}</Notice>
          <Button label={t('auth.toSignIn')} onPress={() => router.replace('/sign-in')} />
        </>
      ) : !session ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : (
        <>
          {error && <Notice kind="error">{t(error)}</Notice>}
          <TextField
            label={t('auth.newPassword')}
            value={password}
            onChangeText={setPassword}
            secure
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            hint={t('auth.passwordHint', { min: PASSWORD_MIN_LENGTH })}
            error={password !== '' && invalid ? t(invalid, { min: PASSWORD_MIN_LENGTH }) : null}
          />
          <Button
            label={t('common.save')}
            onPress={submit}
            loading={busy}
            disabled={invalid !== null}
          />
        </>
      )}
    </AuthScreen>
  );
}
