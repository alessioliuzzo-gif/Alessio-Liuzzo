import { createContext, useContext, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

import { type AppConfig, DEFAULT_APP_CONFIG, parseAppConfig } from './app-config';

const AppConfigContext = createContext<AppConfig>(DEFAULT_APP_CONFIG);

export function AppConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    supabase
      .from('app_config')
      .select('key, value')
      .then(({ data, error }) => {
        if (!cancelled && !error && data) setConfig(parseAppConfig(data));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <AppConfigContext.Provider value={config}>{children}</AppConfigContext.Provider>;
}

export function useAppConfig(): AppConfig {
  return useContext(AppConfigContext);
}
