/**
 * Wurzel der App: lädt Einstellungen, stellt Theme, Konfiguration und Login
 * bereit und blendet erst danach den Splash-Screen aus (kein Aufblitzen des
 * falschen Themes oder des Login-Screens).
 */
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';

import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { AppConfigProvider } from '@/features/config/AppConfigProvider';
import { restoreLanguage } from '@/i18n';
import { AppThemeProvider, useTheme, useThemeControls } from '@/theme/ThemeProvider';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <AppConfigProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </AppConfigProvider>
    </AppThemeProvider>
  );
}

function RootNavigator() {
  const theme = useTheme();
  const { ready: themeReady } = useThemeControls();
  const { loading: authLoading, session, demoMode } = useAuth();
  const [languageReady, setLanguageReady] = useState(false);

  useEffect(() => {
    restoreLanguage().finally(() => setLanguageReady(true));
  }, []);

  const ready = themeReady && languageReady && !authLoading;
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  // Die Navigation (Header, Tab-Leiste, Hintergrund beim Screenwechsel) bekommt
  // dieselben Farben wie unser Theme.
  const navigationTheme = useMemo(() => {
    const base = theme.isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.text,
        border: theme.colors.border,
        notification: theme.colors.primary,
      },
    };
  }, [theme]);

  if (!ready) return null;

  // Ohne .env (Demo-Modus) sind die Tabs ohne Konto erreichbar.
  const signedIn = demoMode || session !== null;

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      {/* "Protected" sperrt Screens abhängig vom Login. Ändert sich der
          Zustand, wechselt Expo Router von selbst zum passenden Bereich. */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="editor" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Screen name="legal/[doc]" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
