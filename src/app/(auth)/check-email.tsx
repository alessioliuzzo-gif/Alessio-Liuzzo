import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AuthScreen } from '@/components/auth-screen';
import { Button } from '@/components/form';
import { AppText } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/themes';

/** Nach der Registrierung: Der Nutzer muss zuerst den Link in der E-Mail öffnen. */
export default function CheckEmailScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();

  return (
    <AuthScreen>
      <View style={styles.center}>
        <Ionicons name="mail-unread-outline" size={56} color={theme.colors.primary} />
        <AppText variant="title" style={styles.text}>
          {t('auth.checkEmailTitle')}
        </AppText>
        <AppText muted style={styles.text}>
          {t('auth.checkEmailBody', { email: email ?? '' })}
        </AppText>
      </View>
      <Button label={t('auth.toSignIn')} onPress={() => router.replace('/sign-in')} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  text: { textAlign: 'center' },
});
