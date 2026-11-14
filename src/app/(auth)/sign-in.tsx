import { Link } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AuthScreen } from '@/components/auth-screen';
import { Button, Notice, TextField } from '@/components/form';
import { AppText } from '@/components/ui';
import { APP_NAME } from '@/config/brand';
import { useAuth } from '@/features/auth/AuthProvider';
import { authErrorKey } from '@/features/auth/errors';
import { validateEmail } from '@/features/auth/validation';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/themes';

export default function SignInScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailError = validateEmail(email);
  const passwordError = password === '' ? 'validation.passwordRequired' : null;

  async function submit() {
    setSubmitted(true);
    setError(null);
    if (emailError || passwordError) return;
    setBusy(true);
    try {
      await signIn(email, password);
      // Kein Navigieren nötig: Sobald eine Sitzung da ist, zeigt das
      // Root-Layout automatisch die Tabs.
    } catch (e) {
      setError(authErrorKey(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreen>
      <View style={styles.header}>
        <AppText variant="title">{APP_NAME}</AppText>
        <AppText muted>{t('auth.tagline')}</AppText>
      </View>

      <AppText variant="heading">{t('auth.signInTitle')}</AppText>
      {error && <Notice kind="error">{t(error)}</Notice>}

      <TextField
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        error={submitted && emailError ? t(emailError) : null}
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <TextField
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        error={submitted && passwordError ? t(passwordError) : null}
        secure
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={submit}
      />

      <Button label={t('auth.signIn')} onPress={submit} loading={busy} />

      <View style={styles.switch}>
        <AppText muted>{t('auth.noAccount')}</AppText>
        <Link href="/sign-up" replace>
          <AppText style={{ color: theme.colors.primary, fontWeight: '600' }}>
            {t('auth.signUp')}
          </AppText>
        </Link>
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs, marginBottom: spacing.lg },
  switch: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
});
