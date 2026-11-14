/**
 * Kleine Animationen, die der App Leben geben. Sie nutzen die eingebaute
 * Animated-API von React Native und laufen auf dem Grafik-Thread
 * (useNativeDriver), also flüssig auch wenn JavaScript beschäftigt ist.
 */
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, type StyleProp, type ViewStyle } from 'react-native';

/** Blendet den Inhalt beim Erscheinen sanft von unten ein. */
export function FadeIn({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const progress = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 320,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress, delay]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
          ],
        },
      ]}>
      {children}
    </Animated.View>
  );
}

/** Schaltfläche, die beim Antippen federnd nachgibt. */
export function PressableScale({
  children,
  onPress,
  disabled,
  accessibilityLabel,
  style,
}: {
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const scale = useState(() => new Animated.Value(1))[0];
  const to = (value: number) =>
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 40,
      bounciness: 8,
    }).start();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => to(0.95)}
      onPressOut={() => to(1)}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** Lässt den Inhalt dauerhaft sanft pulsieren, um Aufmerksamkeit zu lenken. */
export function Pulse({
  children,
  active = true,
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  const scale = useState(() => new Animated.Value(1))[0];
  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.035,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scale, active]);

  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
}
