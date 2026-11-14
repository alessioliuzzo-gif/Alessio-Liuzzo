/**
 * Grundbausteine der Oberfläche. Sie lesen alle Farben aus dem aktiven Theme.
 */
import { Pressable, StyleSheet, Text, type TextProps, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/themes';

type TextVariant = 'title' | 'heading' | 'body' | 'caption';

export function AppText({
  variant = 'body',
  muted = false,
  style,
  ...rest
}: TextProps & { variant?: TextVariant; muted?: boolean }) {
  const theme = useTheme();
  const isHeading = variant === 'title' || variant === 'heading';
  return (
    <Text
      style={[
        textStyles[variant],
        {
          color: muted ? theme.colors.textMuted : theme.colors.text,
          fontFamily: isHeading ? theme.fonts.heading : theme.fonts.body,
        },
        style,
      ]}
      {...rest}
    />
  );
}

const textStyles = StyleSheet.create({
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700' },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24 },
  caption: { fontSize: 13, lineHeight: 18 },
});

/** Rahmen für einen ganzen Screen: Hintergrundfarbe und sichere Ränder (Notch). */
export function Screen({ children, style, ...rest }: ViewProps) {
  const theme = useTheme();
  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.screenInner, style]} {...rest}>
        {children}
      </View>
    </SafeAreaView>
  );
}

export function Card({ style, ...rest }: ViewProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
        },
        style,
      ]}
      {...rest}
    />
  );
}

/** Auswahlzeile mit Häkchen, z. B. für Theme und Sprache. */
export function OptionRow({
  label,
  selected,
  onPress,
  leading,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  leading?: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        {
          borderRadius: theme.radius.md,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          backgroundColor: selected ? theme.colors.surfaceAlt : 'transparent',
          opacity: pressed ? 0.7 : 1,
        },
      ]}>
      {leading}
      <AppText style={styles.optionLabel}>{label}</AppText>
      <View
        style={[
          styles.radio,
          {
            borderColor: selected ? theme.colors.primary : theme.colors.border,
            backgroundColor: selected ? theme.colors.primary : 'transparent',
          },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  screenInner: {
    flex: 1,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
  },
  card: { padding: spacing.md, borderWidth: StyleSheet.hairlineWidth, gap: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
  },
  optionLabel: { flex: 1 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
});
