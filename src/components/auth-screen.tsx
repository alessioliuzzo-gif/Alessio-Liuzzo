/**
 * Gemeinsamer Rahmen der Login-Screens: scrollbar und so gebaut, dass die
 * Tastatur keine Felder verdeckt.
 */
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { spacing } from '@/theme/themes';

import { Screen } from './ui';

export function AuthScreen({ children }: { children: React.ReactNode }) {
  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, gap: spacing.md, paddingTop: spacing.xl, paddingBottom: spacing.xl },
});
