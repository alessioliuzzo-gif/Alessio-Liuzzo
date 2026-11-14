/**
 * Kalender-Tab. In Phase 0 nur das Monatsraster ohne Fotos; die Mini-Fotos,
 * die Jahres-Collage und die echte Streak kommen in Phase 3.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Screen } from '@/components/ui';
import { APP_NAME } from '@/config/brand';
import {
  buildMonthGrid,
  monthLabel,
  shiftMonth,
  toDateKey,
  weekdayLabels,
} from '@/features/calendar/month-grid';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/themes';

export default function CalendarScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const locale = i18n.language;

  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const [visible, setVisible] = useState({ year: today.getFullYear(), month: today.getMonth() });

  const weeks = useMemo(() => buildMonthGrid(visible.year, visible.month), [visible]);
  const weekdays = useMemo(() => weekdayLabels(locale), [locale]);
  const isCurrentMonth =
    visible.year === today.getFullYear() && visible.month === today.getMonth();

  const move = (delta: number) => setVisible((v) => shiftMonth(v.year, v.month, delta));

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title">{APP_NAME}</AppText>
        <View
          style={[
            styles.streak,
            { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.pill },
          ]}>
          <Ionicons name="flame" size={16} color={theme.colors.primary} />
          <AppText variant="caption">{t('calendar.streak', { count: 0 })}</AppText>
        </View>
      </View>

      <View style={styles.monthBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('calendar.previousMonth')}
          hitSlop={12}
          onPress={() => move(-1)}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('calendar.backToToday')}
          disabled={isCurrentMonth}
          onPress={() => setVisible({ year: today.getFullYear(), month: today.getMonth() })}>
          <AppText variant="heading" style={styles.monthLabel}>
            {monthLabel(visible.year, visible.month, locale)}
          </AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('calendar.nextMonth')}
          hitSlop={12}
          onPress={() => move(1)}>
          <Ionicons name="chevron-forward" size={24} color={theme.colors.text} />
        </Pressable>
      </View>

      <View style={styles.week}>
        {weekdays.map((label, i) => (
          <AppText key={i} variant="caption" muted style={styles.weekday}>
            {label}
          </AppText>
        ))}
      </View>

      <View style={styles.grid}>
        {weeks.map((week) => (
          <View key={week[0].key} style={styles.week}>
            {week.map((cell) => {
              const isToday = cell.key === todayKey;
              return (
                <View
                  key={cell.key}
                  style={[
                    styles.day,
                    {
                      borderRadius: theme.radius.sm,
                      backgroundColor: cell.inMonth ? theme.colors.surfaceAlt : 'transparent',
                      borderColor: isToday ? theme.colors.primary : 'transparent',
                    },
                  ]}>
                  {cell.inMonth && (
                    <AppText
                      variant="caption"
                      muted={!isToday}
                      style={isToday && { color: theme.colors.primary, fontWeight: '700' }}>
                      {cell.day}
                    </AppText>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <AppText muted style={styles.hint}>
        {t('calendar.emptyHint')}
      </AppText>
    </Screen>
  );
}

const GAP = 6;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + spacing.xs,
    paddingVertical: spacing.xs + 2,
  },
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  monthLabel: { textTransform: 'capitalize' },
  grid: { gap: GAP, marginTop: spacing.sm },
  week: { flexDirection: 'row', gap: GAP },
  weekday: { flex: 1, textAlign: 'center', textTransform: 'uppercase' },
  // Hochformat 3:4 wie ein Foto; später füllt das Mini-Foto diese Fläche.
  day: { flex: 1, aspectRatio: 3 / 4, padding: 4, borderWidth: 2 },
  hint: { textAlign: 'center', marginTop: spacing.lg },
});
