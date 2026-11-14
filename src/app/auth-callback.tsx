/**
 * Ziel des Bestätigungslinks aus der Registrierungs-E-Mail. Meldet an und
 * leitet in die App weiter.
 */
import { Redirect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, Notice } from '@/components/form';
import { AppText, Screen } from '@/components/ui';
import { useLinkSession } from '@/features/auth/useLinkSession';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/themes';

export default function AuthCallbackScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const state = useLinkSession();

  if (state === 'ok') return <Redirect href="/" />;

  return (
    <Screen style={styles.center}>
      {state === 'pending' ? (
        <>
          <ActivityIndicator color={theme.colors.primary} />
          <AppText muted>{t('auth.confirming')}</AppText>
        </>
      ) : (
        <View style={styles.box}>
          <Notice kind="error">{t('auth.linkInvalid')}</Notice>
          <Button label={t('auth.toSignIn')} onPress={() => router.replace('/sign-in')} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  box: { width: '100%', gap: spacing.md },
});
