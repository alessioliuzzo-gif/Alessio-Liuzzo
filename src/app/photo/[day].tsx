/**
 * Grossansicht eines eigenen Tagesfotos.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Notice } from '@/components/form';
import { AppText, Screen } from '@/components/ui';
import { PHOTO_ASPECT } from '@/features/editor/layout';
import { signedPhotoUrl } from '@/features/photos/api';
import { usePhotoLibrary } from '@/features/photos/PhotoLibraryProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/themes';

export default function PhotoScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { day } = useLocalSearchParams<{ day: string }>();
  const { byDay } = usePhotoLibrary();
  const photo = byDay.get(day);
  const path = photo?.storage_path;

  const [loaded, setLoaded] = useState<{ path: string; url: string | null } | null>(null);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    signedPhotoUrl(path)
      .then((url) => !cancelled && setLoaded({ path, url }))
      .catch(() => !cancelled && setLoaded({ path, url: null }));
    return () => {
      cancelled = true;
    };
  }, [path]);

  const current = loaded && loaded.path === path ? loaded : null;
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(day ?? '');
  const title = valid
    ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'full' }).format(
        new Date(`${day}T12:00:00`),
      )
    : '';

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="heading" style={styles.title}>
          {title}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          hitSlop={12}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
          <Ionicons name="close" size={28} color={theme.colors.text} />
        </Pressable>
      </View>

      {!photo || current?.url === null ? (
        <Notice kind="error">{t('today.loadFailed')}</Notice>
      ) : (
        <View
          style={[
            styles.frame,
            { borderRadius: theme.radius.lg, backgroundColor: theme.colors.surfaceAlt },
          ]}>
          {current?.url ? (
            <Image
              source={{ uri: current.url }}
              contentFit="cover"
              transition={150}
              style={styles.image}
            />
          ) : (
            <ActivityIndicator color={theme.colors.primary} />
          )}
        </View>
      )}

      {photo && (
        <View style={styles.meta}>
          <Ionicons
            name={photo.visibility === 'public' ? 'earth-outline' : 'people-outline'}
            size={16}
            color={theme.colors.textMuted}
          />
          <AppText variant="caption" muted>
            {t(photo.visibility === 'public' ? 'today.visPublic' : 'today.visFriends')}
          </AppText>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  title: { flex: 1 },
  frame: {
    width: '100%',
    aspectRatio: PHOTO_ASPECT,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
});
