/**
 * Formular-Bausteine: Button, Textfeld, Häkchen und Hinweisbox.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/themes';

import { AppText } from './ui';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'text';

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const { colors } = theme;
  const palette = {
    primary: { background: colors.primary, text: colors.onPrimary, border: colors.primary },
    secondary: { background: 'transparent', text: colors.text, border: colors.border },
    danger: { background: 'transparent', text: colors.danger, border: colors.danger },
    text: { background: 'transparent', text: colors.primary, border: 'transparent' },
  }[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
          borderRadius: theme.radius.md,
          opacity: inactive ? 0.5 : pressed ? 0.8 : 1,
        },
      ]}>
      {loading && <ActivityIndicator color={palette.text} />}
      <AppText style={[styles.buttonLabel, { color: palette.text }]}>{label}</AppText>
    </Pressable>
  );
}

export function TextField({
  label,
  error,
  hint,
  secure = false,
  ...rest
}: TextInputProps & { label: string; error?: string | null; hint?: string; secure?: boolean }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secure);
  const borderColor = error
    ? theme.colors.danger
    : focused
      ? theme.colors.primary
      : theme.colors.border;

  return (
    <View style={styles.field}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      <View
        style={[
          styles.inputRow,
          { borderColor, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface },
        ]}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry={hidden}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, { color: theme.colors.text, fontFamily: theme.fonts.body }]}
          {...rest}
        />
        {secure && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(hidden ? 'common.showPassword' : 'common.hidePassword')}
            hitSlop={8}
            onPress={() => setHidden((value) => !value)}
            style={styles.eye}>
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={theme.colors.textMuted}
            />
          </Pressable>
        )}
      </View>
      {error ? (
        <AppText variant="caption" style={{ color: theme.colors.danger }}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" muted>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

export function Checkbox({
  checked,
  onChange,
  error = false,
  accessibilityLabel,
  children,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  error?: boolean;
  accessibilityLabel: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.checkboxRow}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ checked }}
        hitSlop={10}
        onPress={() => onChange(!checked)}
        style={[
          styles.checkbox,
          {
            borderRadius: theme.radius.sm,
            borderColor: error
              ? theme.colors.danger
              : checked
                ? theme.colors.primary
                : theme.colors.textMuted,
            backgroundColor: checked ? theme.colors.primary : 'transparent',
          },
        ]}>
        {checked && <Ionicons name="checkmark" size={16} color={theme.colors.onPrimary} />}
      </Pressable>
      <View style={styles.checkboxText}>{children}</View>
    </View>
  );
}

export function Notice({ kind = 'info', children }: { kind?: 'info' | 'error'; children: string }) {
  const theme = useTheme();
  const color = kind === 'error' ? theme.colors.danger : theme.colors.textMuted;
  return (
    <View
      accessibilityRole={kind === 'error' ? 'alert' : undefined}
      style={[
        styles.notice,
        {
          borderColor: kind === 'error' ? theme.colors.danger : theme.colors.border,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.surface,
        },
      ]}>
      <Ionicons
        name={kind === 'error' ? 'alert-circle-outline' : 'information-circle-outline'}
        size={20}
        color={color}
      />
      <AppText variant="caption" style={[styles.noticeText, { color: theme.colors.text }]}>
        {children}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
  },
  buttonLabel: { fontWeight: '600' },
  field: { gap: spacing.xs },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  input: { flex: 1, minHeight: 48, paddingHorizontal: spacing.md, fontSize: 16 },
  eye: { paddingHorizontal: spacing.md },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm + spacing.xs },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxText: { flex: 1 },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm + spacing.xs,
    borderWidth: 1,
  },
  noticeText: { flex: 1 },
});
