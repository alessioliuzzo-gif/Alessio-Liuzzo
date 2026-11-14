/**
 * Profil-Karten für Belohnungen und Kalenderdesign.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText, Card, OptionRow } from '@/components/ui';
import { monthProgress } from '@/features/calendar/streak';
import { usePhotoLibrary } from '@/features/photos/PhotoLibraryProvider';
import { useCalendarDesign, useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/themes';

import {
  CALENDAR_DESIGNS,
  isDesignUnlocked,
  nextReward,
  type Reward,
  REWARDS,
  rewardKey,
} from './rewards';

function useRewardLabel() {
  const { t } = useTranslation();
  return (reward: Reward) => {
    const name =
      reward.kind === 'filter'
        ? t(`editor.filters.${reward.id}`)
        : reward.kind === 'frame'
          ? t(`editor.frames.${reward.id}`)
          : t(`rewards.designs.${reward.id}`);
    return `${t(`rewards.kinds.${reward.kind}`)} «${name}»`;
  };
}

export function RewardsCard() {
  const { t } = useTranslation();
  const theme = useTheme();
  const label = useRewardLabel();
  const { days, streak, completedMonthCount, unlocked } = usePhotoLibrary();

  const now = new Date();
  const progress = monthProgress(days, now.getFullYear(), now.getMonth());
  const next = nextReward(completedMonthCount);
  const ratio = progress.total > 0 ? progress.done / progress.total : 0;

  return (
    <Card>
      <AppText variant="heading">{t('rewards.title')}</AppText>
      <AppText variant="caption" muted>
        {t('rewards.rule')}
      </AppText>

      <AppText>{t('rewards.thisMonth', progress)}</AppText>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: progress.total, now: progress.done }}
        style={[styles.track, { backgroundColor: theme.colors.surfaceAlt }]}>
        <View
          style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: theme.colors.primary }]}
        />
      </View>
      <AppText variant="caption" muted>
        {t('rewards.longest', { count: streak.longest })}
      </AppText>

      {next ? (
        <View style={styles.row}>
          <Ionicons name="gift-outline" size={18} color={theme.colors.primary} />
          <AppText style={styles.flex}>
            {t('rewards.next')}: {label(next)}
          </AppText>
        </View>
      ) : (
        <AppText>{t('rewards.allUnlocked')}</AppText>
      )}

      {REWARDS.filter((reward) => unlocked.has(rewardKey(reward))).map((reward) => (
        <View key={rewardKey(reward)} style={styles.row}>
          <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
          <AppText style={styles.flex}>
            {t('rewards.unlocked')}: {label(reward)}
          </AppText>
        </View>
      ))}
    </Card>
  );
}

export function CalendarDesignCard() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { unlocked } = usePhotoLibrary();
  const { calendarDesign, setCalendarDesign } = useCalendarDesign();

  return (
    <Card>
      <AppText variant="heading">{t('rewards.calendarDesign')}</AppText>
      <View accessibilityRole="radiogroup" style={styles.options}>
        {CALENDAR_DESIGNS.map((design) => {
          const available = isDesignUnlocked(design, unlocked);
          return (
            <View
              key={design}
              style={{ opacity: available ? 1 : 0.55 }}
              pointerEvents={available ? 'auto' : 'none'}>
              <OptionRow
                label={
                  available
                    ? t(`rewards.designs.${design}`)
                    : `${t(`rewards.designs.${design}`)} (${t('editor.locked')})`
                }
                selected={design === calendarDesign}
                onPress={() => setCalendarDesign(design)}
                leading={
                  available ? undefined : (
                    <Ionicons name="lock-closed" size={16} color={theme.colors.textMuted} />
                  )
                }
              />
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  options: { gap: spacing.sm },
});
