/**
 * Jahresübersicht: alle zwölf Monate als Collage aus Mini-Fotos.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Screen } from '@/components/ui';
import { DayCell } from '@/features/calendar/DayCell';
import { buildMonthGrid, toDateKey } from '@/features/calendar/month-grid';
import { usePhotoLibrary } from '@/features/photos/PhotoLibraryProvider';
import { useThumbUrls } from '@/features/photos/useThumbUrls';
import { useCalendarDesign, useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/themes';

const MONTHS = Array.from({ length: 12 }, (_, month) => month);

export default function YearScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ year: string }>();
  const { byDay } = usePhotoLibrary();
  const { calendarDesign } = useCalendarDesign();

  const thisYear = new Date().getFullYear();
  const parsed = Number(params.year);
  const year =
    Number.isInteger(parsed) && parsed >= 2000 && parsed <= thisYear + 1 ? parsed : thisYear;
  const todayKey = toDateKey(new Date());

  const grids = useMemo(() => MONTHS.map((month) => buildMonthGrid(year, month)), [year]);
  const prefix = `${year}-`;
  const yearPhotos = useMemo(
    () => [...byDay.values()].filter((photo) => photo.day.startsWith(prefix)),
    [byDay, prefix],
  );
  const thumbs = useThumbUrls(
    useMemo(() => yearPhotos.map((photo) => photo.storage_path), [yearPhotos]),
  );
  const monthName = new Intl.DateTimeFormat(i18n.language, { month: 'long' });

  const go = (next: number) => router.setParams({ year: String(next) });

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={12}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
        </Pressable>
        <View style={styles.yearSwitch}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={String(year - 1)}
            hitSlop={12}
            onPress={() => go(year - 1)}>
            <Ionicons name="caret-back" size={18} color={theme.colors.textMuted} />
          </Pressable>
          <AppText variant="title">{year}</AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={String(year + 1)}
            hitSlop={12}
            disabled={year >= thisYear}
            onPress={() => go(year + 1)}>
            <Ionicons
              name="caret-forward"
              size={18}
              color={year >= thisYear ? theme.colors.border : theme.colors.textMuted}
            />
          </Pressable>
        </View>
        <View style={styles.spacer} />
      </View>

      <AppText variant="caption" muted style={styles.count}>
        {t('calendar.photosInYear', { count: yearPhotos.length })}
      </AppText>

      <ScrollView contentContainerStyle={styles.months} showsVerticalScrollIndicator={false}>
        {MONTHS.map((month) => (
          <View key={month} style={styles.month}>
            <AppText variant="caption" style={styles.monthName}>
              {monthName.format(new Date(year, month, 1))}
            </AppText>
            <View style={styles.grid}>
              {grids[month].map((week) => (
                <View key={week[0].key} style={styles.week}>
                  {week.map((cell) => {
                    const photo = cell.inMonth ? byDay.get(cell.key) : undefined;
                    return (
                      <DayCell
                        key={cell.key}
                        compact
                        day={cell.day}
                        inMonth={cell.inMonth}
                        isToday={cell.key === todayKey}
                        hasPhoto={Boolean(photo)}
                        thumbUrl={photo ? thumbs.get(photo.storage_path) : undefined}
                        design={calendarDesign}
                        onPress={() =>
                          router.push({ pathname: '/photo/[day]', params: { day: cell.key } })
                        }
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
  },
  yearSwitch: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  spacer: { width: 26 },
  count: { textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.md },
  months: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.md,
    rowGap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  // Drei Monate pro Zeile.
  month: { width: '30%', flexGrow: 1 },
  monthName: { textTransform: 'capitalize', fontWeight: '600', marginBottom: spacing.xs },
  grid: { gap: 2 },
  week: { flexDirection: 'row', gap: 2 },
});
