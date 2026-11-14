/**
 * Stellt das gewählte Theme der ganzen App zur Verfügung (React Context) und
 * merkt sich die Wahl auf dem Gerät.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { type CalendarDesign, isCalendarDesign } from '@/features/rewards/rewards';
import { readSetting, StorageKeys, writeSetting } from '@/lib/storage';

import {
  buildCustomTheme,
  type CustomThemeSettings,
  DEFAULT_CUSTOM,
  parseCustomSettings,
} from './custom';
import { DEFAULT_THEME_ID, isThemeId, type Theme, type ThemeId, themes } from './themes';

type ThemeContextValue = {
  theme: Theme;
  setThemeId: (id: ThemeId) => void;
  /** Einstellungen des eigenen Designs */
  custom: CustomThemeSettings;
  setCustom: (settings: CustomThemeSettings) => void;
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
  const [custom, setCustomState] = useState<CustomThemeSettings>(DEFAULT_CUSTOM);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      readSetting(StorageKeys.theme),
      readSetting(StorageKeys.calendarDesign),
      readSetting(StorageKeys.customTheme),
    ]).then(([storedTheme, storedDesign, storedCustom]) => {
      if (cancelled) return;
      if (isThemeId(storedTheme)) setThemeIdState(storedTheme);
      if (isCalendarDesign(storedDesign)) setDesignState(storedDesign);
      setCustomState(parseCustomSettings(storedCustom));
      setReady(true);
    });
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

  const setCustom = useCallback((settings: CustomThemeSettings) => {
    setCustomState(settings);
    void writeSetting(StorageKeys.customTheme, JSON.stringify(settings));
  }, []);

  const value = useMemo(
    () => ({
      theme: themeId === 'custom' ? buildCustomTheme(custom) : themes[themeId],
      setThemeId,
      custom,
      setCustom,
      calendarDesign,
      setCalendarDesign,
      ready,
    }),
    [themeId, setThemeId, custom, setCustom, calendarDesign, setCalendarDesign, ready],
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
  const { theme, setThemeId, custom, setCustom, ready } = useThemeContext();
  return { themeId: theme.id, setThemeId, custom, setCustom, ready };
}

export function useCalendarDesign() {
  const { calendarDesign, setCalendarDesign } = useThemeContext();
  return { calendarDesign, setCalendarDesign };
}
