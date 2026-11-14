/**
 * Konfetti-Regen über dem ganzen Screen. Rein dekorativ, blockiert keine Eingaben.
 */
import { useEffect, useMemo, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

const PIECES = 36;
const DURATION = 2600;

/** Kleiner, vorhersagbarer Zufallsgenerator, damit jede Konfettiwolke gleich aussieht. */
function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

export function Confetti({ onDone }: { onDone?: () => void }) {
  const theme = useTheme();
  const [progress] = useState(() => new Animated.Value(0));
  const { width, height } = Dimensions.get('window');

  const pieces = useMemo(() => {
    const random = seeded(42);
    const colors = [
      theme.colors.primary,
      theme.colors.accent,
      '#F4C542',
      '#2E86DE',
      '#E4572E',
      '#4ADE80',
    ];
    return Array.from({ length: PIECES }, (_, i) => ({
      x: random() * width,
      drift: (random() - 0.5) * 160,
      delay: random() * 0.35,
      size: 6 + random() * 8,
      spin: (random() > 0.5 ? 1 : -1) * (360 + random() * 720),
      color: colors[i % colors.length],
      round: random() > 0.6,
    }));
  }, [theme, width]);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: DURATION,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => onDone?.());
  }, [progress, onDone]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((piece, i) => {
        const local = progress.interpolate({
          inputRange: [0, piece.delay, 1],
          outputRange: [0, 0, 1],
          extrapolate: 'clamp',
        });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: piece.x,
              top: -20,
              width: piece.size,
              height: piece.round ? piece.size : piece.size * 1.6,
              borderRadius: piece.round ? piece.size / 2 : 2,
              backgroundColor: piece.color,
              opacity: local.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }),
              transform: [
                {
                  translateY: local.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, height + 40],
                  }),
                },
                {
                  translateX: local.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, piece.drift],
                  }),
                },
                {
                  rotate: local.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', `${piece.spin}deg`],
                  }),
                },
              ],
            }}
          />
        );
      })}
    </View>
  );
}
