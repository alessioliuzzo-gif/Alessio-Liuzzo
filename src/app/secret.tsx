/**
 * Versteckte Credits-Seite. Erreichbar über 5 schnelle Taps auf die
 * Versionsnummer im Profil.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { Confetti } from '@/components/confetti';
import { AppText, Screen } from '@/components/ui';
import { AUTHOR } from '@/config/author';
import { APP_NAME, APP_VERSION } from '@/config/brand';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/themes';

export default function SecretScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const [float] = useState(() => new Animated.Value(0));
  const [confetti, setConfetti] = useState(true);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [float]);

  const today = new Date();
  const mmdd = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const showDedication = AUTHOR.dedicationDate !== null && AUTHOR.dedicationDate === mmdd;

  return (
    <Screen style={styles.screen}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
        hitSlop={12}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))}
        style={styles.close}>
        <Ionicons name="close" size={28} color={theme.colors.text} />
      </Pressable>

      <Animated.View
        style={{
          transform: [
            { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) },
          ],
        }}>
        <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
          <Ionicons name="camera" size={56} color={theme.colors.onPrimary} />
        </View>
      </Animated.View>

      <AppText variant="title" style={styles.center}>
        {APP_NAME}
      </AppText>
      <AppText muted style={styles.center}>
        {t('secrets.creditsFound')}
      </AppText>

      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.lg,
            borderColor: theme.colors.border,
          },
        ]}>
        <AppText variant="caption" muted>
          {t('secrets.createdBy')}
        </AppText>
        <AppText variant="heading">{AUTHOR.name}</AppText>
        <AppText muted>{AUTHOR.role}</AppText>
      </View>

      {showDedication && (
        <AppText variant="heading" style={[styles.center, { color: theme.colors.primary }]}>
          {AUTHOR.dedicationText}
        </AppText>
      )}

      <AppText variant="caption" muted style={styles.center}>
        {t('profile.version', { version: APP_VERSION })} · {t('secrets.madeIn')}
      </AppText>
      {confetti && <Confetti onDone={() => setConfetti(false)} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  close: { position: 'absolute', top: spacing.md, right: spacing.md },
  badge: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
  card: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.lg,
    borderWidth: 1,
    width: '100%',
  },
});
