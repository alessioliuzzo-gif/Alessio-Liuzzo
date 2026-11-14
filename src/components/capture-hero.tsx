/**
 * Der grosse Aufnahme-Knopf im "Heute"-Tab mit dem DayShot-Zeichen:
 * Die Blendenlamellen drehen sich langsam, ein Leuchtring pulsiert. Beim
 * Antippen schnappt die Blende wie ein Verschluss und es blitzt kurz auf.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { bladesSvg, frameSvg } from '@/features/brand/logo';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/themes';

import { AppText } from './ui';

const SIZE = 200;

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
  const [spin] = useState(() => new Animated.Value(0));
  const [snap] = useState(() => new Animated.Value(0));
  const [pulse] = useState(() => new Animated.Value(0));
  const [flash] = useState(() => new Animated.Value(0));
  const [press] = useState(() => new Animated.Value(1));

  const colors = useMemo(
    () => ({
      base: theme.colors.primary,
      blade: theme.colors.onPrimary,
      sun: theme.colors.accent,
      rings: theme.colors.text,
    }),
    [theme],
  );
  const blades = useMemo(() => bladesSvg(colors), [colors]);
  const frame = useMemo(() => frameSvg(colors), [colors]);

  useEffect(() => {
    const rotate = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 14000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const ring = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 2000,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    rotate.start();
    ring.start();
    return () => {
      rotate.stop();
      ring.stop();
    };
  }, [spin, pulse]);

  function shoot() {
    snap.setValue(0);
    flash.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(snap, {
          toValue: 1,
          duration: 140,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(snap, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.back(2)),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(flash, { toValue: 1, duration: 90, useNativeDriver: true }),
        Animated.timing(flash, { toValue: 0, duration: 380, useNativeDriver: true }),
      ]),
    ]).start(() => onCamera());
  }

  const springTo = (value: number) =>
    Animated.spring(press, {
      toValue: value,
      useNativeDriver: true,
      speed: 30,
      bounciness: 12,
    }).start();

  const rotation = Animated.add(spin, Animated.multiply(snap, 0.18)).interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  // Beim Auslösen zieht sich die Blende kurz zusammen.
  const bladeScale = snap.interpolate({ inputRange: [0, 1], outputRange: [1, 0.86] });
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.38] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.4, 0.07, 0] });

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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('today.camera')}
          disabled={disabled}
          onPress={shoot}
          onPressIn={() => springTo(0.92)}
          onPressOut={() => springTo(1)}>
          <Animated.View
            style={[
              styles.logo,
              {
                shadowColor: theme.colors.primary,
                opacity: disabled ? 0.6 : 1,
                transform: [{ scale: press }],
              },
            ]}>
            <View style={[styles.disc, { backgroundColor: theme.colors.primary }]} />
            <Animated.View
              style={[styles.layer, { transform: [{ rotate: rotation }, { scale: bladeScale }] }]}>
              <SvgXml xml={blades} width={SIZE} height={SIZE} />
            </Animated.View>
            <View style={styles.layer} pointerEvents="none">
              <SvgXml xml={frame} width={SIZE} height={SIZE} />
            </View>
            <Animated.View pointerEvents="none" style={[styles.flash, { opacity: flash }]} />
          </Animated.View>
        </Pressable>
      </View>

      <View
        style={[
          styles.cta,
          { backgroundColor: theme.colors.primary, borderRadius: theme.radius.pill },
        ]}>
        <AppText style={[styles.ctaText, { color: theme.colors.onPrimary }]}>
          {t('today.cameraCta')}
        </AppText>
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
  wrap: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  stage: { width: SIZE * 1.3, height: SIZE * 1.3, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: SIZE * 0.86, height: SIZE * 0.86, borderRadius: SIZE },
  logo: {
    width: SIZE,
    height: SIZE,
    shadowOpacity: 0.5,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  // Gefüllter Kreis hinter den Lamellen, passend zum Innenrand des Rings.
  disc: {
    position: 'absolute',
    left: SIZE * 0.155,
    top: SIZE * 0.155,
    width: SIZE * 0.69,
    height: SIZE * 0.69,
    borderRadius: SIZE,
  },
  layer: { position: 'absolute', left: 0, top: 0, width: SIZE, height: SIZE },
  flash: {
    position: 'absolute',
    left: SIZE * 0.1,
    top: SIZE * 0.1,
    width: SIZE * 0.8,
    height: SIZE * 0.8,
    borderRadius: SIZE,
    backgroundColor: '#FFFFFF',
  },
  cta: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2 },
  ctaText: { fontWeight: '800', fontSize: 16, letterSpacing: 0.6, textTransform: 'uppercase' },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  streakText: { fontWeight: '600' },
});
