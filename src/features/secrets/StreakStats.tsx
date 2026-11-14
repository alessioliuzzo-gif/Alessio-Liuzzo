/**
 * Versteckte Serien-Statistik (langer Druck auf die Flamme im Kalender).
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/form';
import { AppText } from '@/components/ui';
import { usePhotoLibrary } from '@/features/photos/PhotoLibraryProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/themes';

export function StreakStats({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { streak, days, completedMonthCount } = usePhotoLibrary();
  const [dance] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dance, {
          toValue: 1,
          duration: 260,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(dance, {
          toValue: -1,
          duration: 520,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(dance, {
          toValue: 0,
          duration: 260,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, dance]);

  const rotate = dance.interpolate({ inputRange: [-1, 1], outputRange: ['-14deg', '14deg'] });
  const scale = dance.interpolate({ inputRange: [-1, 0, 1], outputRange: [1.08, 1, 1.12] });

  const stats = [
    { label: t('secrets.current'), value: streak.current },
    { label: t('secrets.longest'), value: streak.longest },
    { label: t('secrets.total'), value: days.size },
    { label: t('secrets.fullMonths'), value: completedMonthCount },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          onPress={() => {}}
          style={[
            styles.card,
            { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg },
          ]}>
          <Animated.View style={{ transform: [{ rotate }, { scale }] }}>
            <Ionicons name="flame" size={72} color={theme.colors.primary} />
          </Animated.View>
          <AppText variant="heading">{t('secrets.statsTitle')}</AppText>
          <View style={styles.grid}>
            {stats.map((stat) => (
              <View
                key={stat.label}
                style={[
                  styles.stat,
                  { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.md },
                ]}>
                <AppText variant="title" style={{ color: theme.colors.primary }}>
                  {stat.value}
                </AppText>
                <AppText variant="caption" muted style={styles.center}>
                  {stat.label}
                </AppText>
              </View>
            ))}
          </View>
          <Button label={t('common.close')} variant="secondary" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000000AA',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, width: '100%' },
  stat: { width: '48%', flexGrow: 1, alignItems: 'center', paddingVertical: spacing.md },
  center: { textAlign: 'center' },
});
