/**
 * Stellt das gewählte Theme der ganzen App zur Verfügung (React Context) und
 * merkt sich die Wahl auf dem Gerät.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { type CalendarDesign, isCalendarDesign } from '@/features/rewards/rewards';
import { readSetting, StorageKeys, writeSetting } from '@/lib/storage';

import { DEFAULT_THEME_ID, isThemeId, type Theme, type ThemeId, themes } from './themes';

type ThemeContextValue = {
  theme: Theme;
  setThemeId: (id: ThemeId) => void;
  /** Form der Kalenderfelder (teils als Belohnung freigeschaltet) */
  calendarDesign: CalendarDesign;
  setCalendarDesign: (design: CalendarDesign) => void;
  /** false, solange die gespeicherte Wahl noch geladen wird */
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(DEFAULT_THEME_ID);
  const [calendarDesign, setDesignState] = useState<CalendarDesign>('classic');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([readSetting(StorageKeys.theme), readSetting(StorageKeys.calendarDesign)]).then(
      ([storedTheme, storedDesign]) => {
        if (cancelled) return;
        if (isThemeId(storedTheme)) setThemeIdState(storedTheme);
        if (isCalendarDesign(storedDesign)) setDesignState(storedDesign);
        setReady(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const setThemeId = useCallback((id: ThemeId) => {
    setThemeIdState(id);
    void writeSetting(StorageKeys.theme, id);
  }, []);

  const setCalendarDesign = useCallback((design: CalendarDesign) => {
    setDesignState(design);
    void writeSetting(StorageKeys.calendarDesign, design);
  }, []);

  const value = useMemo(
    () => ({ theme: themes[themeId], setThemeId, calendarDesign, setCalendarDesign, ready }),
    [themeId, setThemeId, calendarDesign, setCalendarDesign, ready],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme muss innerhalb von AppThemeProvider verwendet werden');
  return ctx;
}

export function useTheme(): Theme {
  return useThemeContext().theme;
}

export function useThemeControls() {
  const { theme, setThemeId, ready } = useThemeContext();
  return { themeId: theme.id, setThemeId, ready };
}

export function useCalendarDesign() {
  const { calendarDesign, setCalendarDesign } = useThemeContext();
  return { calendarDesign, setCalendarDesign };
}
