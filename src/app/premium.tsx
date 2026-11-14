/**
 * Paywall: Vorteile des Abos, Pläne mit Preisen aus dem Store, Kaufen und
 * Wiederherstellen. Die Angaben zur automatischen Verlängerung und die Links
 * zu den Rechtstexten verlangt Apple auf dieser Seite.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Notice } from '@/components/form';
import { FadeIn } from '@/components/motion';
import { AppText, Card, Screen } from '@/components/ui';
import { useAppConfig } from '@/features/config/AppConfigProvider';
import { useSubscription } from '@/features/subscription/SubscriptionProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/themes';

const PERKS = [
  { icon: 'color-wand-outline', key: 'effects' },
  { icon: 'grid-outline', key: 'designs' },
  { icon: 'cloud-done-outline', key: 'quality' },
  { icon: 'film-outline', key: 'video' },
  { icon: 'pricetag-outline', key: 'discount' },
] as const;

export default function PremiumScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { printPremiumDiscountPercent } = useAppConfig();
  const { available, isPremium, plans, loading, purchase, restore } = useSubscription();
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'info' | 'error'; text: string } | null>(null);

  const plan =
    plans.find((p) => p.id === selected) ?? plans.find((p) => p.period === 'annual') ?? plans[0];
  const close = () => (router.canGoBack() ? router.back() : router.replace('/profile'));

  async function buy() {
    if (!plan) return;
    setBusy(true);
    setMessage(null);
    try {
      if ((await purchase(plan.id)) === 'purchased')
        setMessage({ kind: 'info', text: t('premium.thanks') });
    } catch {
      setMessage({ kind: 'error', text: t('premium.failed') });
    } finally {
      setBusy(false);
    }
  }

  async function doRestore() {
    setBusy(true);
    setMessage(null);
    try {
      setMessage({
        kind: 'info',
        text: t((await restore()) ? 'premium.restored' : 'premium.nothingToRestore'),
      });
    } catch {
      setMessage({ kind: 'error', text: t('premium.failed') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          hitSlop={12}
          onPress={close}>
          <Ionicons name="close" size={28} color={theme.colors.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FadeIn style={styles.hero}>
          <Ionicons name="sparkles" size={44} color={theme.colors.primary} />
          <AppText variant="title" style={styles.center}>
            {t('premium.title')}
          </AppText>
          <AppText muted style={styles.center}>
            {t('premium.subtitle')}
          </AppText>
        </FadeIn>

        <Card>
          {PERKS.map((perk) => (
            <View key={perk.key} style={styles.perk}>
              <Ionicons name={perk.icon} size={22} color={theme.colors.primary} />
              <AppText style={styles.flex}>
                {t(`premium.perks.${perk.key}`, { percent: printPremiumDiscountPercent })}
              </AppText>
            </View>
          ))}
        </Card>

        {message && <Notice kind={message.kind}>{message.text}</Notice>}

        {!available ? (
          <Notice>{t('premium.unavailable')}</Notice>
        ) : isPremium ? (
          <Notice>{t('premium.active')}</Notice>
        ) : loading ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : (
          <>
            {plans.map((p) => {
              const active = p.id === plan?.id;
              return (
                <Pressable
                  key={p.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  onPress={() => setSelected(p.id)}
                  style={[
                    styles.plan,
                    {
                      borderRadius: theme.radius.lg,
                      borderColor: active ? theme.colors.primary : theme.colors.border,
                      backgroundColor: active ? theme.colors.surfaceAlt : theme.colors.surface,
                    },
                  ]}>
                  <View style={styles.flex}>
                    <AppText style={styles.planTitle}>{t(`premium.period.${p.period}`)}</AppText>
                    {p.period === 'annual' && (
                      <AppText
                        variant="caption"
                        style={{ color: theme.colors.primary, fontWeight: '700' }}>
                        {t('premium.bestValue')}
                      </AppText>
                    )}
                  </View>
                  <AppText style={styles.planTitle}>{p.price}</AppText>
                </Pressable>
              );
            })}
            <Button label={t('premium.subscribe')} onPress={buy} loading={busy} disabled={!plan} />
          </>
        )}

        {available && (
          <Button label={t('premium.restore')} variant="text" onPress={doRestore} disabled={busy} />
        )}

        <AppText variant="caption" muted style={styles.center}>
          {t('premium.legal')}
        </AppText>
        <View style={styles.links}>
          <Link href="/legal/terms">
            <AppText variant="caption" style={{ color: theme.colors.primary }}>
              {t('legal.terms')}
            </AppText>
          </Link>
          <Link href="/legal/privacy">
            <AppText variant="caption" style={{ color: theme.colors.primary }}>
              {t('legal.privacy')}
            </AppText>
          </Link>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md },
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  hero: { alignItems: 'center', gap: spacing.sm },
  center: { textAlign: 'center' },
  perk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  flex: { flex: 1 },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 2,
  },
  planTitle: { fontWeight: '700' },
  links: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg },
});
