/**
 * Ein Album: Raster der Erinnerungen, neue hinzufügen, Album löschen.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Notice } from '@/components/form';
import { FadeIn } from '@/components/motion';
import { AppText, Screen } from '@/components/ui';
import {
  type Album,
  deleteAlbum,
  getAlbum,
  listMemories,
  type Memory,
  memoryUrls,
} from '@/features/album/api';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/themes';

export default function AlbumScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [album, setAlbum] = useState<Album | null>(null);
  const [memories, setMemories] = useState<Memory[] | null>(null);
  const [urls, setUrls] = useState<Map<string, string>>(new Map());
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [a, rows] = await Promise.all([getAlbum(id), listMemories(id)]);
      setAlbum(a);
      setMemories(rows);
      setUrls(await memoryUrls(rows.map((m) => m.storage_path)));
    } catch {
      setError('feed.loadFailed');
      setMemories((current) => current ?? []);
    }
  }, [id]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function add(source: 'camera' | 'gallery') {
    setError(null);
    if (source === 'camera' && !(await ImagePicker.requestCameraPermissionsAsync()).granted) {
      setError('today.cameraDenied');
      return;
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.9 };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled) return;
    router.push({ pathname: '/editor', params: { uri: result.assets[0].uri, album: id } });
  }

  async function remove() {
    setBusy(true);
    try {
      await deleteAlbum(id);
      router.replace('/album');
    } catch {
      setError('profile.actionFailed');
      setBusy(false);
    }
  }

  const shown = (memories ?? []).filter((m) => !onlyFavorites || m.favorite);

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={12}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/album'))}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
        </Pressable>
        <AppText variant="heading" numberOfLines={1} style={styles.title}>
          {album ? `${album.emoji} ${album.title}` : ''}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('album.favorites')}
          accessibilityState={{ selected: onlyFavorites }}
          hitSlop={12}
          onPress={() => setOnlyFavorites((v) => !v)}>
          <Ionicons
            name={onlyFavorites ? 'heart' : 'heart-outline'}
            size={24}
            color={theme.colors.primary}
          />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {error && <Notice kind="error">{t(error)}</Notice>}
        {memories === null && <ActivityIndicator color={theme.colors.primary} />}
        {memories?.length === 0 && <AppText muted>{t('album.emptyAlbum')}</AppText>}

        <View style={styles.grid}>
          {shown.map((memory, index) => (
            <FadeIn key={memory.id} delay={Math.min(index, 9) * 40} style={styles.cell}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={memory.caption || memory.happened_on}
                onPress={() => router.push({ pathname: '/memory/[id]', params: { id: memory.id } })}
                style={[
                  styles.tile,
                  { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.md },
                ]}>
                <Image
                  source={
                    urls.get(memory.storage_path) ? { uri: urls.get(memory.storage_path) } : null
                  }
                  contentFit="cover"
                  transition={150}
                  style={styles.fill}
                />
                {memory.favorite && (
                  <View style={styles.heart}>
                    <Ionicons name="heart" size={16} color="#FFFFFF" />
                  </View>
                )}
              </Pressable>
            </FadeIn>
          ))}
        </View>

        <Button label={t('today.camera')} onPress={() => add('camera')} />
        <Button label={t('today.gallery')} variant="secondary" onPress={() => add('gallery')} />

        {confirm ? (
          <View style={styles.row}>
            <View style={styles.flex}>
              <Button
                label={t('common.cancel')}
                variant="secondary"
                disabled={busy}
                onPress={() => setConfirm(false)}
              />
            </View>
            <View style={styles.flex}>
              <Button
                label={t('today.deleteConfirm')}
                variant="danger"
                loading={busy}
                onPress={remove}
              />
            </View>
          </View>
        ) : (
          <Button label={t('album.delete')} variant="text" onPress={() => setConfirm(true)} />
        )}
      </ScrollView>
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
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cell: { width: '32%' },
  tile: { width: '100%', aspectRatio: 3 / 4, overflow: 'hidden' },
  fill: { width: '100%', height: '100%' },
  heart: { position: 'absolute', right: 6, bottom: 6 },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
