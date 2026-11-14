/**
 * Kalender-Tab: Monatsansicht mit Mini-Fotos, Serie, "Heute vor einem Jahr"
 * und Einstieg in die Jahresübersicht.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { FadeIn } from '@/components/motion';
import { AppText, Card, Screen } from '@/components/ui';
import { APP_NAME } from '@/config/brand';
import { DayCell } from '@/features/calendar/DayCell';
import {
  buildMonthGrid,
  monthLabel,
  shiftMonth,
  toDateKey,
  weekdayLabels,
} from '@/features/calendar/month-grid';
import { monthProgress, oneYearAgo } from '@/features/calendar/streak';
import { usePhotoLibrary } from '@/features/photos/PhotoLibraryProvider';
import { useThumbUrls } from '@/features/photos/useThumbUrls';
import { Confetti } from '@/components/confetti';
import { StreakStats } from '@/features/secrets/StreakStats';
import { createTapCounter, reachedMilestone } from '@/features/secrets/secrets';
import { useCalendarDesign, useTheme, useThemeControls } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/themes';

export default function CalendarScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const { calendarDesign } = useCalendarDesign();
  const { byDay, days, streak, reload, loaded: libraryLoaded } = usePhotoLibrary();

  // Beim Öffnen des Tabs frisch laden (z. B. nach einem neuen Foto).
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const { neonUnlocked, unlockNeon, setThemeId } = useThemeControls();
  const [confetti, setConfetti] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [secretMessage, setSecretMessage] = useState<string | null>(null);
  const [titleTaps] = useState(() => createTapCounter(7, 2500));

  function onTitleTap() {
    if (!titleTaps()) return;
    if (!neonUnlocked) unlockNeon();
    setThemeId('neon');
    setSecretMessage(t('secrets.neonUnlocked'));
    setConfetti(true);
  }

  // Meilensteine der Serie feiern, jeweils nur einmal pro Wert. Der erste
  // geladene Stand zählt nicht: Gefeiert wird nur, wenn die Serie während der
  // Nutzung wächst (z. B. nach dem Speichern des Tagesfotos).
  const [celebrated, setCelebrated] = useState<number | null>(null);
  if (libraryLoaded && streak.current !== celebrated) {
    const milestone = celebrated === null ? null : reachedMilestone(celebrated, streak.current);
    setCelebrated(streak.current);
    if (milestone) {
      setSecretMessage(t('secrets.milestone', { count: milestone }));
      setConfetti(true);
    }
  }

  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const [visible, setVisible] = useState({ year: today.getFullYear(), month: today.getMonth() });

  const weeks = useMemo(() => buildMonthGrid(visible.year, visible.month), [visible]);
  const weekdays = useMemo(() => weekdayLabels(locale), [locale]);
  const isCurrentMonth = visible.year === today.getFullYear() && visible.month === today.getMonth();
  const progress = monthProgress(days, visible.year, visible.month);

  const memory = byDay.get(oneYearAgo(todayKey));
  const paths = useMemo(() => {
    const list = weeks
      .flat()
      .filter((cell) => cell.inMonth)
      .map((cell) => byDay.get(cell.key)?.storage_path)
      .filter((path): path is string => Boolean(path));
    if (memory) list.push(memory.storage_path);
    return list;
  }, [weeks, byDay, memory]);
  const thumbs = useThumbUrls(paths);

  const move = (delta: number) => setVisible((v) => shiftMonth(v.year, v.month, delta));
  const dateLabel = (key: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(`${key}T12:00:00`));

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          {/* Versteckt: 7 schnelle Taps auf den Titel schalten das Neon-Theme frei. */}
          <Pressable onPress={onTitleTap} accessibilityRole="header">
            <AppText variant="title">{APP_NAME}</AppText>
          </Pressable>
          {/* Versteckt: langer Druck auf die Flamme zeigt die Serien-Statistik. */}
          <Pressable
            onLongPress={() => setStatsOpen(true)}
            delayLongPress={450}
            accessibilityHint={t('secrets.flameHint')}
            style={[
              styles.streak,
              { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.pill },
            ]}>
            <Ionicons name="flame" size={16} color={theme.colors.primary} />
            <AppText variant="caption">{t('calendar.streak', { count: streak.current })}</AppText>
          </Pressable>
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

        <FadeIn key={`${visible.year}-${visible.month}`} style={styles.grid}>
          {weeks.map((week) => (
            <View key={week[0].key} style={styles.week}>
              {week.map((cell) => {
                const photo = byDay.get(cell.key);
                return (
                  <DayCell
                    key={cell.key}
                    day={cell.day}
                    inMonth={cell.inMonth}
                    isToday={cell.key === todayKey}
                    hasPhoto={Boolean(photo)}
                    thumbUrl={photo ? thumbs.get(photo.storage_path) : undefined}
                    design={calendarDesign}
                    label={photo ? dateLabel(cell.key) : undefined}
                    onPress={() =>
                      router.push({ pathname: '/photo/[day]', params: { day: cell.key } })
                    }
                  />
                );
              })}
            </View>
          ))}
        </FadeIn>

        <View style={styles.footerRow}>
          <AppText variant="caption" muted>
            {t('calendar.progress', progress)}
          </AppText>
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() =>
              router.push({ pathname: '/year/[year]', params: { year: String(visible.year) } })
            }
            style={styles.yearLink}>
            <Ionicons name="grid-outline" size={16} color={theme.colors.primary} />
            <AppText variant="caption" style={{ color: theme.colors.primary, fontWeight: '600' }}>
              {t('calendar.yearOverview', { year: visible.year })}
            </AppText>
          </Pressable>
        </View>

        {days.size === 0 && (
          <AppText muted style={styles.hint}>
            {t('calendar.emptyHint')}
          </AppText>
        )}

        {memory && (
          <FadeIn delay={200}>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({ pathname: '/photo/[day]', params: { day: memory.day } })
              }>
              <Card style={styles.memory}>
                <Image
                  source={{ uri: thumbs.get(memory.storage_path) }}
                  contentFit="cover"
                  style={[
                    styles.memoryImage,
                    { borderRadius: theme.radius.sm, backgroundColor: theme.colors.surfaceAlt },
                  ]}
                />
                <View style={styles.memoryText}>
                  <AppText variant="heading">{t('calendar.yearAgo')}</AppText>
                  <AppText muted>{dateLabel(memory.day)}</AppText>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
              </Card>
            </Pressable>
          </FadeIn>
        )}
      </ScrollView>
      {secretMessage && (
        <FadeIn
          style={[
            styles.toast,
            { backgroundColor: theme.colors.primary, borderRadius: theme.radius.lg },
          ]}>
          <AppText
            style={{ color: theme.colors.onPrimary, fontWeight: '700', textAlign: 'center' }}>
            {secretMessage}
          </AppText>
        </FadeIn>
      )}
      {confetti && (
        <Confetti
          onDone={() => {
            setConfetti(false);
            setSecretMessage(null);
          }}
        />
      )}
      <StreakStats visible={statsOpen} onClose={() => setStatsOpen(false)} />
    </Screen>
  );
}

const GAP = 6;

const styles = StyleSheet.create({
  content: { paddingTop: spacing.md, paddingBottom: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  yearLink: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  hint: { textAlign: 'center', marginTop: spacing.lg },
  memory: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg },
  memoryImage: { width: 54, height: 72 },
  memoryText: { flex: 1 },
  toast: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.lg,
    padding: spacing.md,
  },
});
