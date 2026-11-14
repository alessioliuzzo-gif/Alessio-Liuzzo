/**
 * Eine Erinnerung: Bild gross, Text und Datum bearbeiten, Favorit, löschen.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { Button, Notice, TextField } from '@/components/form';
import { AppText, Screen } from '@/components/ui';
import {
  deleteMemory,
  getMemory,
  type Memory,
  memoryUrls,
  updateMemory,
} from '@/features/album/api';
import { PHOTO_ASPECT } from '@/features/editor/layout';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/themes';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export default function MemoryScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [memory, setMemory] = useState<Memory | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMemory(id)
      .then(async (m) => {
        if (cancelled || !m) return;
        setMemory(m);
        setCaption(m.caption);
        setDate(m.happened_on);
        const urls = await memoryUrls([m.storage_path]);
        if (!cancelled) setUrl(urls.get(m.storage_path) ?? null);
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const back = () =>
    router.canGoBack()
      ? router.back()
      : memory
        ? router.replace({ pathname: '/album/[id]', params: { id: memory.album_id } })
        : router.replace('/album');
  const dateValid = DATE.test(date) && !Number.isNaN(new Date(`${date}T12:00:00`).getTime());

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(false);
    setSaved(false);
    try {
      await action();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  const save = () =>
    run(async () => {
      await updateMemory(id, { caption: caption.trim(), happened_on: date });
      setSaved(true);
    });
  const toggleFavorite = () =>
    memory &&
    run(async () => {
      await updateMemory(id, { favorite: !memory.favorite });
      setMemory({ ...memory, favorite: !memory.favorite });
    });
  const remove = () =>
    memory &&
    run(async () => {
      await deleteMemory(memory);
      back();
    });

  const nice = dateValid
    ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'full' }).format(
        new Date(`${date}T12:00:00`),
      )
    : '';

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            hitSlop={12}
            onPress={back}>
            <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
          </Pressable>
          <AppText variant="heading" numberOfLines={1} style={styles.flex}>
            {nice}
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('album.favorite')}
            accessibilityState={{ selected: Boolean(memory?.favorite) }}
            hitSlop={12}
            disabled={busy || !memory}
            onPress={toggleFavorite}>
            <Ionicons
              name={memory?.favorite ? 'heart' : 'heart-outline'}
              size={26}
              color={theme.colors.primary}
            />
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View
            style={[
              styles.frame,
              { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.lg },
            ]}>
            {url ? (
              <Image
                source={{ uri: url }}
                contentFit="cover"
                transition={150}
                style={styles.fill}
              />
            ) : (
              <ActivityIndicator color={theme.colors.primary} />
            )}
          </View>
          {error && <Notice kind="error">{t('profile.actionFailed')}</Notice>}
          {saved && <Notice>{t('album.saved')}</Notice>}
          <TextField
            label={t('album.caption')}
            value={caption}
            onChangeText={setCaption}
            maxLength={500}
            multiline
            style={styles.caption}
          />
          <TextField
            label={t('album.date')}
            value={date}
            onChangeText={setDate}
            maxLength={10}
            autoCapitalize="none"
            hint={t('album.dateHint')}
            error={date !== '' && !dateValid ? t('album.dateInvalid') : null}
          />
          <Button
            label={t('common.save')}
            onPress={save}
            loading={busy}
            disabled={!memory || !dateValid}
          />
          {confirm ? (
            <View style={styles.row}>
              <View style={styles.flex}>
                <Button
                  label={t('common.cancel')}
                  variant="secondary"
                  onPress={() => setConfirm(false)}
                />
              </View>
              <View style={styles.flex}>
                <Button
                  label={t('today.deleteConfirm')}
                  variant="danger"
                  onPress={remove}
                  loading={busy}
                />
              </View>
            </View>
          ) : (
            <Button
              label={t('album.deleteMemory')}
              variant="text"
              onPress={() => setConfirm(true)}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  frame: {
    width: '100%',
    aspectRatio: PHOTO_ASPECT,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: { width: '100%', height: '100%' },
  caption: { minHeight: 90, textAlignVertical: 'top', paddingTop: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
});
