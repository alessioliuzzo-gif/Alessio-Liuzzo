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
import { PhotoLibraryProvider } from '@/features/photos/PhotoLibraryProvider';
import { SubscriptionProvider } from '@/features/subscription/SubscriptionProvider';
import { AppConfigProvider } from '@/features/config/AppConfigProvider';
import { useNotificationRouting } from '@/features/notifications/useNotificationRouting';
import { restoreLanguage } from '@/i18n';
import { AppThemeProvider, useTheme, useThemeControls } from '@/theme/ThemeProvider';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <AppConfigProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <PhotoLibraryProvider>
              <RootNavigator />
            </PhotoLibraryProvider>
          </SubscriptionProvider>
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
  useNotificationRouting(session !== null);

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
          <Stack.Screen
            name="editor"
            options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
          />
          <Stack.Screen name="photo/[day]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="year/[year]" />
          <Stack.Screen name="friends" />
          <Stack.Screen name="album/index" />
          <Stack.Screen name="album/[id]" />
          <Stack.Screen name="memory/[id]" />
          <Stack.Screen name="ideas" />
          <Stack.Screen name="premium" options={{ presentation: 'modal' }} />
          <Stack.Screen name="print" />
          <Stack.Screen name="secret" options={{ presentation: 'modal' }} />
          <Stack.Screen name="post/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="chat/[id]" />
          <Stack.Screen name="comments/[type]/[id]" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Screen name="legal/[doc]" options={{ presentation: 'modal' }} />
        {/* Ziele der E-Mail-Links: in beiden Login-Zuständen erreichbar. */}
        <Stack.Screen name="auth-callback" />
        <Stack.Screen name="reset-password" />
      </Stack>
    </ThemeProvider>
  );
}
