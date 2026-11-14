/**
 * Kalenderdruck: Zeitraum wählen, Vorschau ansehen, bezahlen (Stripe) und
 * Bestellungen verfolgen. Gedruckt und versendet wird von Gelato.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Linking from 'expo-linking';
import { useFocusEffect, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Notice } from '@/components/form';
import { AppText, Card, Screen } from '@/components/ui';
import { DayCell } from '@/features/calendar/DayCell';
import { buildMonthGrid, monthLabel, toDateKey } from '@/features/calendar/month-grid';
import { useAppConfig } from '@/features/config/AppConfigProvider';
import { usePhotoLibrary } from '@/features/photos/PhotoLibraryProvider';
import { useThumbUrls } from '@/features/photos/useThumbUrls';
import { listOrders, type PrintOrder, startCheckout } from '@/features/print/api';
import { coverage, finalPrice, monthKey, twelveMonths } from '@/features/print/logic';
import { useSubscription } from '@/features/subscription/SubscriptionProvider';
import { useCalendarDesign, useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/themes';

export default function PrintScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { printPriceChf, printPremiumDiscountPercent, printEnabled } = useAppConfig();
  const { isPremium } = useSubscription();
  const { byDay, days } = usePhotoLibrary();
  const { calendarDesign } = useCalendarDesign();

  const now = new Date();
  const options = useMemo(() => {
    const year = now.getFullYear();
    return [
      { key: `${year}-01`, label: t('print.year', { year }) },
      { key: `${year + 1}-01`, label: t('print.year', { year: year + 1 }) },
      {
        key: monthKey({ year: year - 1, month: now.getMonth() + 1 > 11 ? 0 : now.getMonth() + 1 }),
        label: t('print.last12'),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);
  const [start, setStart] = useState(options[0].key);
  const [orders, setOrders] = useState<PrintOrder[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const months = useMemo(() => twelveMonths(start), [start]);
  const stats = coverage(days, start);
  const discount = isPremium ? printPremiumDiscountPercent : 0;
  const price = finalPrice(printPriceChf, discount);
  const chf = (value: number) =>
    new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'CHF' }).format(value);

  const paths = useMemo(() => {
    const keys = new Set(months.map(monthKey));
    return [...byDay.values()]
      .filter((p) => keys.has(p.day.slice(0, 7)))
      .map((p) => p.storage_path);
  }, [byDay, months]);
  const thumbs = useThumbUrls(paths);
  const todayKey = toDateKey(now);

  const loadOrders = useCallback(() => {
    listOrders()
      .then(setOrders)
      .catch(() => {});
  }, []);
  useFocusEffect(loadOrders);

  async function order() {
    setBusy(true);
    setError(null);
    try {
      const returnUrl = Linking.createURL('/print');
      const url = await startCheckout(start, returnUrl);
      await WebBrowser.openAuthSessionAsync(url, returnUrl);
      loadOrders();
    } catch (e) {
      setError(
        e instanceof Error && e.message === 'not_available' ? 'print.notAvailable' : 'print.failed',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={12}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
        </Pressable>
        <AppText variant="heading">{t('print.title')}</AppText>
        <View style={styles.spacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppText muted>{t('print.intro')}</AppText>
        {!printEnabled && <Notice>{t('print.notAvailable')}</Notice>}

        <View accessibilityRole="radiogroup" style={styles.chips}>
          {options.map((option) => {
            const active = option.key === start;
            return (
              <Pressable
                key={option.key}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => setStart(option.key)}
                style={[
                  styles.chip,
                  {
                    borderRadius: theme.radius.pill,
                    backgroundColor: active ? theme.colors.primary : theme.colors.surfaceAlt,
                  },
                ]}>
                <AppText
                  variant="caption"
                  style={{
                    color: active ? theme.colors.onPrimary : theme.colors.text,
                    fontWeight: '600',
                  }}>
                  {option.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <AppText variant="caption" muted>
          {t('print.coverage', stats)}
        </AppText>

        {/* Vorschau: die 12 Monatsseiten im Kleinformat */}
        <View style={styles.preview}>
          {months.map((ref) => (
            <View
              key={monthKey(ref)}
              style={[
                styles.page,
                { backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm },
              ]}>
              <AppText variant="caption" style={styles.pageTitle} numberOfLines={1}>
                {monthLabel(ref.year, ref.month, i18n.language)}
              </AppText>
              <View style={styles.grid}>
                {buildMonthGrid(ref.year, ref.month).map((week) => (
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
                        />
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        <Card>
          <View style={styles.priceRow}>
            <AppText style={styles.bold}>{t('print.product')}</AppText>
            <AppText style={styles.bold}>{chf(price)}</AppText>
          </View>
          {discount > 0 && (
            <AppText variant="caption" style={{ color: theme.colors.success }}>
              {t('print.discount', { percent: discount, before: chf(printPriceChf) })}
            </AppText>
          )}
          <AppText variant="caption" muted>
            {t('print.priceNote')}
          </AppText>
          {error && <Notice kind="error">{t(error)}</Notice>}
          <Button
            label={t('print.order')}
            onPress={order}
            loading={busy}
            disabled={!printEnabled || stats.photos === 0}
          />
        </Card>

        {orders.length > 0 && (
          <Card>
            <AppText variant="heading">{t('print.orders')}</AppText>
            {orders.map((o) => (
              <View key={o.id} style={styles.priceRow}>
                <AppText>{t('print.orderLine', { month: o.start_month })}</AppText>
                <AppText variant="caption" muted>
                  {t(`print.status.${o.status}`)}
                </AppText>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  spacer: { width: 26 },
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  preview: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  page: { width: '31%', flexGrow: 1, padding: 6, gap: 4 },
  pageTitle: { fontWeight: '700', textTransform: 'capitalize' },
  grid: { gap: 1 },
  week: { flexDirection: 'row', gap: 1 },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  bold: { fontWeight: '700' },
});
