/**
 * Platzhalter für Tabs, die in einer späteren Phase gebaut werden.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/themes';

import { AppText, Screen } from './ui';

export function PlaceholderScreen({
  title,
  message,
  icon,
}: {
  title: string;
  message: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}) {
  const theme = useTheme();
  return (
    <Screen>
      <AppText variant="title" style={styles.title}>
        {title}
      </AppText>
      <View style={styles.center}>
        <View
          style={[
            styles.badge,
            { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.lg },
          ]}>
          <Ionicons name={icon} size={40} color={theme.colors.primary} />
        </View>
        <AppText muted style={styles.message}>
          {message}
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  badge: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center' },
  message: { textAlign: 'center', maxWidth: 280 },
});
