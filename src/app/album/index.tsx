/**
 * Private Alben: Übersicht und neues Album anlegen.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Notice, TextField } from '@/components/form';
import { FadeIn, PressableScale } from '@/components/motion';
import { AppText, Card, Screen } from '@/components/ui';
import { ALBUM_EMOJIS, createAlbum, listAlbums, memoryUrls } from '@/features/album/api';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/themes';

type Row = Awaited<ReturnType<typeof listAlbums>>[number];

export default function AlbumsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const [albums, setAlbums] = useState<Row[] | null>(null);
  const [covers, setCovers] = useState<Map<string, string>>(new Map());
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState<string>(ALBUM_EMOJIS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await listAlbums();
      setAlbums(rows);
      setCovers(await memoryUrls(rows.map((r) => r.cover).filter((p): p is string => Boolean(p))));
    } catch {
      setError(true);
      setAlbums((current) => current ?? []);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function create() {
    setBusy(true);
    setError(false);
    try {
      await createAlbum(title, emoji);
      setTitle('');
      setCreating(false);
      await load();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={12}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
        </Pressable>
        <AppText variant="heading">{t('album.title')}</AppText>
        <View style={styles.spacer} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.private}>
          <Ionicons name="lock-closed" size={16} color={theme.colors.textMuted} />
          <AppText variant="caption" muted style={styles.flex}>
            {t('album.privateHint')}
          </AppText>
        </View>
        {error && <Notice kind="error">{t('profile.actionFailed')}</Notice>}
        {albums === null && <ActivityIndicator color={theme.colors.primary} />}

        <View style={styles.grid}>
          {albums?.map((album, index) => (
            <FadeIn key={album.id} delay={Math.min(index, 8) * 50} style={styles.cell}>
              <PressableScale
                accessibilityLabel={album.title}
                onPress={() => router.push({ pathname: '/album/[id]', params: { id: album.id } })}
                style={[
                  styles.album,
                  {
                    backgroundColor: theme.colors.surface,
                    borderRadius: theme.radius.lg,
                    borderColor: theme.colors.border,
                  },
                ]}>
                <View
                  style={[
                    styles.cover,
                    { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.md },
                  ]}>
                  {album.cover && covers.get(album.cover) ? (
                    <Image
                      source={{ uri: covers.get(album.cover) }}
                      contentFit="cover"
                      style={styles.fill}
                    />
                  ) : (
                    <AppText style={styles.emoji}>{album.emoji}</AppText>
                  )}
                </View>
                <AppText numberOfLines={1} style={styles.bold}>
                  {album.emoji} {album.title}
                </AppText>
                <AppText variant="caption" muted>
                  {t('album.count', { count: album.count })}
                </AppText>
              </PressableScale>
            </FadeIn>
          ))}
        </View>

        {albums?.length === 0 && !creating && <AppText muted>{t('album.empty')}</AppText>}

        {creating ? (
          <Card>
            <TextField
              label={t('album.name')}
              value={title}
              onChangeText={setTitle}
              maxLength={40}
              autoFocus
            />
            <View accessibilityRole="radiogroup" style={styles.emojis}>
              {ALBUM_EMOJIS.map((e) => (
                <Pressable
                  key={e}
                  accessibilityRole="radio"
                  accessibilityLabel={e}
                  accessibilityState={{ selected: e === emoji }}
                  onPress={() => setEmoji(e)}
                  style={[
                    styles.emojiChip,
                    {
                      borderRadius: theme.radius.md,
                      backgroundColor: e === emoji ? theme.colors.primary : theme.colors.surfaceAlt,
                    },
                  ]}>
                  <AppText style={styles.emojiSmall}>{e}</AppText>
                </Pressable>
              ))}
            </View>
            <Button
              label={t('album.create')}
              onPress={create}
              loading={busy}
              disabled={title.trim() === ''}
            />
            <Button label={t('common.cancel')} variant="text" onPress={() => setCreating(false)} />
          </Card>
        ) : (
          <Button label={t('album.new')} onPress={() => setCreating(true)} />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  spacer: { width: 26 },
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  private: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: { width: '48%', flexGrow: 1 },
  album: { padding: spacing.sm, gap: 4, borderWidth: StyleSheet.hairlineWidth },
  cover: {
    width: '100%',
    aspectRatio: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: { width: '100%', height: '100%' },
  emoji: { fontSize: 44, lineHeight: 56 },
  bold: { fontWeight: '700' },
  emojis: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  emojiChip: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  emojiSmall: { fontSize: 22, lineHeight: 28 },
});
