/**
 * Der grosse, einladende Aufnahme-Knopf im "Heute"-Tab: ein pulsierender
 * Kreis mit Leuchtring, der beim Antippen federt. Darunter Serie und Anreiz.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/themes';

import { AppText } from './ui';

const SIZE = 168;

export function CaptureHero({
  streak,
  onCamera,
  disabled,
}: {
  streak: number;
  onCamera: () => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [pulse] = useState(() => new Animated.Value(0));
  const [press] = useState(() => new Animated.Value(1));
  const [spin] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const ring = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    const rotate = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 9000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    ring.start();
    rotate.start();
    return () => {
      ring.stop();
      rotate.stop();
    };
  }, [pulse, spin]);

  const springTo = (value: number) =>
    Animated.spring(press, {
      toValue: value,
      useNativeDriver: true,
      speed: 30,
      bounciness: 12,
    }).start();

  // Der Leuchtring wächst und verblasst immer wieder.
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.45, 0.08, 0] });
  const rotation = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.wrap}>
      <View style={styles.stage}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            {
              backgroundColor: theme.colors.primary,
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
            },
          ]}
        />
        {/* Gestrichelter Kreis, der sich langsam dreht wie ein Objektiv. */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.dashed,
            { borderColor: theme.colors.accent, transform: [{ rotate: rotation }] },
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('today.camera')}
          disabled={disabled}
          onPress={onCamera}
          onPressIn={() => springTo(0.9)}
          onPressOut={() => springTo(1)}>
          <Animated.View
            style={[
              styles.button,
              {
                backgroundColor: theme.colors.primary,
                shadowColor: theme.colors.primary,
                transform: [{ scale: press }],
                opacity: disabled ? 0.6 : 1,
              },
            ]}>
            <Ionicons name="camera" size={58} color={theme.colors.onPrimary} />
            <AppText style={[styles.label, { color: theme.colors.onPrimary }]}>
              {t('today.cameraShort')}
            </AppText>
          </Animated.View>
        </Pressable>
      </View>

      <View
        style={[
          styles.streakPill,
          { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.pill },
        ]}>
        <Ionicons name="flame" size={18} color={theme.colors.primary} />
        <AppText style={styles.streakText}>
          {streak > 0 ? t('today.keepStreak', { count: streak }) : t('today.startStreak')}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.lg },
  stage: { width: SIZE * 1.5, height: SIZE * 1.5, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2 },
  dashed: {
    position: 'absolute',
    width: SIZE + 26,
    height: SIZE + 26,
    borderRadius: (SIZE + 26) / 2,
    borderWidth: 3,
    borderStyle: 'dashed',
  },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  label: { fontWeight: '800', fontSize: 15, letterSpacing: 0.5, textTransform: 'uppercase' },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  streakText: { fontWeight: '600' },
});
