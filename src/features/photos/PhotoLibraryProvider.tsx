/**
 * Hält die Liste der eigenen Tagesfotos (nur die Datenzeilen) für die ganze
 * App bereit und leitet daraus Serie, vollständige Monate und Belohnungen ab.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { toDateKey } from '@/features/calendar/month-grid';
import { completedMonths, computeStreak } from '@/features/calendar/streak';
import { unlockedRewards } from '@/features/rewards/rewards';
import type { DailyPhoto } from '@/lib/database.types';

import { listOwnPhotos } from './api';

type PhotoLibrary = {
  /** Tag (YYYY-MM-DD) -> Foto */
  byDay: ReadonlyMap<string, DailyPhoto>;
  days: ReadonlySet<string>;
  streak: { current: number; longest: number };
  completedMonthCount: number;
  /** Schlüssel der freigeschalteten Belohnungen, z. B. "filter:fade" */
  unlocked: ReadonlySet<string>;
  loaded: boolean;
  reload: () => Promise<void>;
};

const EMPTY: PhotoLibrary = {
  byDay: new Map(),
  days: new Set(),
  streak: { current: 0, longest: 0 },
  completedMonthCount: 0,
  unlocked: new Set(),
  loaded: false,
  reload: async () => {},
};

const PhotoLibraryContext = createContext<PhotoLibrary>(EMPTY);

export function PhotoLibraryProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [state, setState] = useState<{ userId: string; photos: DailyPhoto[] } | null>(null);

  const reload = useCallback(async () => {
    if (!userId) return;
    try {
      const photos = await listOwnPhotos(userId);
      setState({ userId, photos });
    } catch {
      // Offline: den letzten Stand behalten.
    }
  }, [userId]);

  // Erstes Laden und erneutes Laden bei einem Kontowechsel.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    listOwnPhotos(userId)
      .then((photos) => {
        if (!cancelled) setState({ userId, photos });
      })
      .catch(() => {
        // Offline: Der Kalender bleibt leer, bis ein Tab neu lädt.
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const value = useMemo<PhotoLibrary>(() => {
    // Nach einem Kontowechsel zählen die Fotos des vorherigen Kontos nicht mehr.
    if (!state || state.userId !== userId) return { ...EMPTY, reload };
    const byDay = new Map(state.photos.map((photo) => [photo.day, photo]));
    const days = new Set(byDay.keys());
    const completedMonthCount = completedMonths(days).length;
    return {
      byDay,
      days,
      streak: computeStreak(days, toDateKey(new Date())),
      completedMonthCount,
      unlocked: unlockedRewards(completedMonthCount),
      loaded: true,
      reload,
    };
  }, [state, userId, reload]);

  return <PhotoLibraryContext.Provider value={value}>{children}</PhotoLibraryContext.Provider>;
}

export function usePhotoLibrary(): PhotoLibrary {
  return useContext(PhotoLibraryContext);
}
