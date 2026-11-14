import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AuthScreen } from '@/components/auth-screen';
import { Button, Checkbox, Notice, TextField } from '@/components/form';
import { AppText } from '@/components/ui';
import { EmailTakenError, useAuth } from '@/features/auth/AuthProvider';
import { authErrorKey } from '@/features/auth/errors';
import {
  normalizeUsername,
  PASSWORD_MIN_LENGTH,
  validateBirthYear,
  validateDisplayName,
  validateEmail,
  validatePassword,
  validateUsername,
} from '@/features/auth/validation';
import { useAppConfig } from '@/features/config/AppConfigProvider';
import { isUsernameAvailable } from '@/features/profile/api';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/themes';

export default function SignUpScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { signUp } = useAuth();
  const { minAge } = useAppConfig();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [accepted, setAccepted] = useState(false);

  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameTaken, setUsernameTaken] = useState(false);

  const errors = {
    displayName: validateDisplayName(displayName),
    username: usernameTaken ? 'validation.usernameTaken' : validateUsername(username),
    email: validateEmail(email),
    password: validatePassword(password),
    birthYear: validateBirthYear(birthYear, minAge),
  };
  const show = (key: keyof typeof errors) => {
    const message = errors[key];
    return submitted && message ? t(message, { minAge, min: PASSWORD_MIN_LENGTH }) : null;
  };

  async function submit() {
    setSubmitted(true);
    setError(null);
    if (Object.values(errors).some(Boolean) || !accepted) return;

    setBusy(true);
    try {
      const name = normalizeUsername(username);
      if (!(await isUsernameAvailable(name))) {
        setUsernameTaken(true);
        return;
      }
      const result = await signUp({
        email,
        password,
        username: name,
        displayName,
        birthYear: Number(birthYear),
      });
      if (result === 'confirm-email') {
        router.replace({ pathname: '/check-email', params: { email: email.trim() } });
      }
    } catch (e) {
      setError(e instanceof EmailTakenError ? 'authErrors.emailTaken' : authErrorKey(e));
    } finally {
      setBusy(false);
    }
  }

  const link = { color: theme.colors.primary, fontWeight: '600' as const };

  return (
    <AuthScreen>
      <AppText variant="title">{t('auth.signUpTitle')}</AppText>
      {error && <Notice kind="error">{t(error)}</Notice>}

      <TextField
        label={t('auth.displayName')}
        value={displayName}
        onChangeText={setDisplayName}
        error={show('displayName')}
        autoComplete="name"
        textContentType="name"
        maxLength={40}
      />
      <TextField
        label={t('auth.username')}
        value={username}
        onChangeText={(value) => {
          setUsername(value);
          setUsernameTaken(false);
        }}
        error={show('username')}
        hint={t('auth.usernameHint')}
        autoCapitalize="none"
        autoComplete="username-new"
        autoCorrect={false}
        maxLength={20}
      />
      <TextField
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        error={show('email')}
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
        error={show('password')}
        hint={t('auth.passwordHint', { min: PASSWORD_MIN_LENGTH })}
        secure
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <TextField
        label={t('auth.birthYear')}
        value={birthYear}
        onChangeText={setBirthYear}
        error={show('birthYear')}
        hint={t('auth.birthYearHint', { minAge })}
        keyboardType="number-pad"
        maxLength={4}
      />

      <Checkbox
        checked={accepted}
        onChange={setAccepted}
        error={submitted && !accepted}
        accessibilityLabel={t('auth.acceptLabel')}>
        <AppText variant="caption">
          {t('auth.acceptPrefix', { minAge })}{' '}
          <Link href="/legal/terms">
            <AppText variant="caption" style={link}>
              {t('legal.terms')}
            </AppText>
          </Link>{' '}
          {t('auth.acceptMiddle')}{' '}
          <Link href="/legal/privacy">
            <AppText variant="caption" style={link}>
              {t('legal.privacy')}
            </AppText>
          </Link>
          {t('auth.acceptSuffix')}
        </AppText>
        {submitted && !accepted && (
          <AppText variant="caption" style={{ color: theme.colors.danger }}>
            {t('validation.acceptRequired')}
          </AppText>
        )}
      </Checkbox>

      <Button label={t('auth.createAccount')} onPress={submit} loading={busy} />

      <View style={styles.switch}>
        <AppText muted>{t('auth.haveAccount')}</AppText>
        <Link href="/sign-in" replace>
          <AppText style={link}>{t('auth.signIn')}</AppText>
        </Link>
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  switch: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
});
