/**
 * Stellt das gewählte Theme der ganzen App zur Verfügung (React Context) und
 * merkt sich die Wahl auf dem Gerät.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { readSetting, StorageKeys, writeSetting } from '@/lib/storage';

import { DEFAULT_THEME_ID, isThemeId, type Theme, type ThemeId, themes } from './themes';

type ThemeContextValue = {
  theme: Theme;
  setThemeId: (id: ThemeId) => void;
  /** false, solange die gespeicherte Wahl noch geladen wird */
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(DEFAULT_THEME_ID);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    readSetting(StorageKeys.theme).then((stored) => {
      if (cancelled) return;
      if (isThemeId(stored)) setThemeIdState(stored);
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

  const value = useMemo(
    () => ({ theme: themes[themeId], setThemeId, ready }),
    [themeId, setThemeId, ready],
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
