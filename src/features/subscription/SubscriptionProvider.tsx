/**
 * Abo (Freemium) mit RevenueCat. Komplett eingebaut, aber nur aktiv, wenn
 *   1. app_config.subscriptions_enabled = true ist (Schalter ohne App-Update) und
 *   2. die öffentlichen RevenueCat-Keys in der Umgebung stehen.
 * Sonst verhält sich die App so, als gäbe es kein Abo.
 *
 * Wer Premium hat, entscheidet RevenueCat (Berechtigung "premium"). Zusätzlich
 * meldet ein Webhook den Status an Supabase, damit auch der Server ihn kennt.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { useAppConfig } from '@/features/config/AppConfigProvider';
import { env } from '@/lib/env';

export const ENTITLEMENT = 'premium';

export type Plan = {
  id: string;
  title: string;
  price: string;
  period: 'monthly' | 'annual' | 'other';
};

type SubscriptionState = {
  /** Abo-Funktionen sichtbar (Schalter an und Keys vorhanden) */
  available: boolean;
  isPremium: boolean;
  plans: Plan[];
  loading: boolean;
  purchase: (planId: string) => Promise<'purchased' | 'cancelled'>;
  restore: () => Promise<boolean>;
};

const Ctx = createContext<SubscriptionState>({
  available: false,
  isPremium: false,
  plans: [],
  loading: false,
  purchase: async () => 'cancelled',
  restore: async () => false,
});

// RevenueCat wird nur geladen, wenn es gebraucht wird. So bleibt die App auch
// ohne das native Modul (z. B. im Browser) lauffähig.
type PurchasesModule = typeof import('react-native-purchases').default;
let purchasesPromise: Promise<PurchasesModule | null> | null = null;
function loadPurchases(): Promise<PurchasesModule | null> {
  if (Platform.OS === 'web') return Promise.resolve(null);
  purchasesPromise ??= import('react-native-purchases').then((m) => m.default).catch(() => null);
  return purchasesPromise;
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { subscriptionsEnabled } = useAppConfig();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const apiKey = Platform.OS === 'ios' ? env.revenueCatIosKey : env.revenueCatAndroidKey;
  const available =
    subscriptionsEnabled && apiKey !== '' && Platform.OS !== 'web' && userId !== null;

  const [isPremium, setIsPremium] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [packages, setPackages] = useState<Map<string, unknown>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!available || !userId) return;
    let cancelled = false;
    void (async () => {
      const Purchases = await loadPurchases();
      if (!Purchases || cancelled) return;
      try {
        setLoading(true);
        if (!(await Purchases.isConfigured())) Purchases.configure({ apiKey, appUserID: userId });
        else await Purchases.logIn(userId);
        Purchases.addCustomerInfoUpdateListener((info) =>
          setIsPremium(ENTITLEMENT in info.entitlements.active),
        );
        const [info, offerings] = await Promise.all([
          Purchases.getCustomerInfo(),
          Purchases.getOfferings(),
        ]);
        if (cancelled) return;
        setIsPremium(ENTITLEMENT in info.entitlements.active);
        const current = offerings.current?.availablePackages ?? [];
        setPackages(new Map(current.map((p) => [p.identifier, p])));
        setPlans(
          current.map((p) => ({
            id: p.identifier,
            title: p.product.title,
            price: p.product.priceString,
            period:
              p.packageType === 'MONTHLY'
                ? 'monthly'
                : p.packageType === 'ANNUAL'
                  ? 'annual'
                  : 'other',
          })),
        );
      } catch {
        // Ohne Verbindung zu RevenueCat bleibt alles gratis.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [available, apiKey, userId]);

  const purchase = useCallback(
    async (planId: string) => {
      const Purchases = await loadPurchases();
      const pkg = packages.get(planId);
      if (!Purchases || !pkg) return 'cancelled' as const;
      try {
        const result = await Purchases.purchasePackage(
          pkg as Parameters<PurchasesModule['purchasePackage']>[0],
        );
        setIsPremium(ENTITLEMENT in result.customerInfo.entitlements.active);
        return 'purchased' as const;
      } catch (error) {
        if ((error as { userCancelled?: boolean }).userCancelled) return 'cancelled' as const;
        throw error;
      }
    },
    [packages],
  );

  const restore = useCallback(async () => {
    const Purchases = await loadPurchases();
    if (!Purchases) return false;
    const info = await Purchases.restorePurchases();
    const active = ENTITLEMENT in info.entitlements.active;
    setIsPremium(active);
    return active;
  }, []);

  const value = useMemo<SubscriptionState>(
    () => ({ available, isPremium: available && isPremium, plans, loading, purchase, restore }),
    [available, isPremium, plans, loading, purchase, restore],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSubscription(): SubscriptionState {
  return useContext(Ctx);
}
