/**
 * Profil-Karte mit den Einstiegen zu Premium und Kalenderdruck. Beide
 * erscheinen nur, wenn der jeweilige Schalter in app_config an ist.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/motion';
import { AppText } from '@/components/ui';
import { useAppConfig } from '@/features/config/AppConfigProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/themes';

import { useSubscription } from './SubscriptionProvider';

export function ExtrasCard() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { printEnabled } = useAppConfig();
  const { available, isPremium } = useSubscription();
  if (!available && !printEnabled) return null;

  const tile = (
    icon: React.ComponentProps<typeof Ionicons>['name'],
    label: string,
    onPress: () => void,
    strong: boolean,
  ) => (
    <PressableScale
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        styles.tile,
        {
          borderRadius: theme.radius.lg,
          backgroundColor: strong ? theme.colors.primary : theme.colors.surfaceAlt,
        },
      ]}>
      <Ionicons
        name={icon}
        size={26}
        color={strong ? theme.colors.onPrimary : theme.colors.primary}
      />
      <AppText
        style={{ color: strong ? theme.colors.onPrimary : theme.colors.text, fontWeight: '700' }}>
        {label}
      </AppText>
    </PressableScale>
  );

  return (
    <View style={styles.row}>
      {available &&
        tile(
          'sparkles',
          t(isPremium ? 'premium.entryActive' : 'premium.entry'),
          () => router.push('/premium'),
          !isPremium,
        )}
      {printEnabled && tile('print-outline', t('print.entry'), () => router.push('/print'), false)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  tile: { flex: 1, minHeight: 92, padding: spacing.md, gap: spacing.sm, justifyContent: 'center' },
});
