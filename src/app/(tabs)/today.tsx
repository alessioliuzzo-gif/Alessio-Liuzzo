/**
 * "Heute"-Tab: das Tagesfoto aufnehmen oder auswählen, ansehen, Sichtbarkeit
 * ändern, ersetzen oder löschen.
 */
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { CaptureHero } from '@/components/capture-hero';
import { Button, Notice, Segmented } from '@/components/form';
import { FadeIn } from '@/components/motion';
import { PlaceholderScreen } from '@/components/placeholder-screen';
import { AppText, Screen } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { toDateKey } from '@/features/calendar/month-grid';
import { PHOTO_ASPECT } from '@/features/editor/layout';
import {
  deleteDailyPhoto,
  getPhotoForDay,
  setPhotoVisibility,
  signedPhotoUrl,
} from '@/features/photos/api';
import { usePhotoLibrary } from '@/features/photos/PhotoLibraryProvider';
import type { DailyPhoto, PhotoVisibility } from '@/lib/database.types';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/themes';

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'empty' }
  | { status: 'ready'; photo: DailyPhoto; url: string };

export default function TodayScreen() {
  const { t } = useTranslation();
  const { demoMode, session } = useAuth();

  if (demoMode) {
    return (
      <PlaceholderScreen
        title={t('today.title')}
        message={t('today.placeholder')}
        icon="camera-outline"
      />
    );
  }
  return <Today userId={session?.user.id ?? null} />;
}

function Today({ userId }: { userId: string | null }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { reload: reloadLibrary, streak } = usePhotoLibrary();

  const [state, setState] = useState<State>({ status: 'loading' });
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const photo = await getPhotoForDay(userId, toDateKey(new Date()));
      if (!photo) {
        setState({ status: 'empty' });
        return;
      }
      setState({ status: 'ready', photo, url: await signedPhotoUrl(photo.storage_path) });
    } catch {
      setState({ status: 'error' });
    }
  }, [userId]);

  // Bei jedem Wechsel auf diesen Tab neu laden, auch nach dem Speichern im Editor.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function pick(source: 'camera' | 'gallery') {
    setNotice(null);
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setNotice('today.cameraDenied');
        return;
      }
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.9 };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled) return;
    router.push({ pathname: '/editor', params: { uri: result.assets[0].uri } });
  }

  async function changeVisibility(photo: DailyPhoto, url: string, visibility: PhotoVisibility) {
    if (visibility === photo.visibility) return;
    setNotice(null);
    setBusy(true);
    // Sofort anzeigen und bei einem Fehler zurückstellen.
    setState({ status: 'ready', photo: { ...photo, visibility }, url });
    try {
      await setPhotoVisibility(photo.id, visibility);
      void reloadLibrary();
    } catch {
      setState({ status: 'ready', photo, url });
      setNotice('today.actionFailed');
    } finally {
      setBusy(false);
    }
  }

  async function remove(photo: DailyPhoto) {
    setNotice(null);
    setBusy(true);
    try {
      await deleteDailyPhoto(photo);
      await reloadLibrary();
      setConfirmDelete(false);
      setState({ status: 'empty' });
    } catch {
      setNotice('today.actionFailed');
      void load();
    } finally {
      setBusy(false);
    }
  }

  const sourceButtons = (labelCamera: string) => (
    <>
      <Button label={labelCamera} onPress={() => pick('camera')} disabled={busy} />
      <Button
        label={t('today.gallery')}
        variant="secondary"
        onPress={() => pick('gallery')}
        disabled={busy}
      />
    </>
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppText variant="title">{t('today.title')}</AppText>
        {notice && <Notice kind="error">{t(notice)}</Notice>}

        {state.status === 'loading' && (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        )}

        {state.status === 'error' && (
          <>
            <Notice kind="error">{t('today.loadFailed')}</Notice>
            <Button
              label={t('today.retry')}
              variant="secondary"
              onPress={() => {
                setState({ status: 'loading' });
                void load();
              }}
            />
          </>
        )}

        {state.status === 'empty' && (
          <FadeIn>
            <AppText variant="heading" style={styles.centerText}>
              {t('today.promptTitle')}
            </AppText>
            <AppText muted style={styles.centerText}>
              {t('today.promptBody')}
            </AppText>
            <CaptureHero streak={streak.current} onCamera={() => pick('camera')} disabled={busy} />
            <Button
              label={t('today.gallery')}
              variant="secondary"
              onPress={() => pick('gallery')}
              disabled={busy}
            />
          </FadeIn>
        )}

        {state.status === 'ready' && (
          <>
            <FadeIn>
              <Image
                source={{ uri: state.url }}
                accessibilityLabel={t('today.doneTitle')}
                contentFit="cover"
                transition={150}
                style={[
                  styles.photo,
                  { borderRadius: theme.radius.lg, backgroundColor: theme.colors.surfaceAlt },
                ]}
              />
            </FadeIn>
            <Segmented
              label={t('today.visibility')}
              value={state.photo.visibility}
              disabled={busy}
              onChange={(next) => changeVisibility(state.photo, state.url, next)}
              options={[
                { value: 'friends', label: t('today.visFriends'), icon: 'people-outline' },
                { value: 'public', label: t('today.visPublic'), icon: 'earth-outline' },
              ]}
            />
            <AppText variant="caption" muted style={styles.centerText}>
              {t(
                state.photo.visibility === 'public'
                  ? 'today.visPublicHint'
                  : 'today.visFriendsHint',
              )}
            </AppText>

            {confirmDelete ? (
              <View style={styles.row}>
                <View style={styles.flex}>
                  <Button
                    label={t('common.cancel')}
                    variant="secondary"
                    disabled={busy}
                    onPress={() => setConfirmDelete(false)}
                  />
                </View>
                <View style={styles.flex}>
                  <Button
                    label={t('today.deleteConfirm')}
                    variant="danger"
                    loading={busy}
                    onPress={() => remove(state.photo)}
                  />
                </View>
              </View>
            ) : (
              <>
                {sourceButtons(t('today.replace'))}
                <Button
                  label={t('today.delete')}
                  variant="danger"
                  onPress={() => setConfirmDelete(true)}
                />
              </>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xl },
  center: { paddingVertical: spacing.xxl, alignItems: 'center' },
  centerText: { textAlign: 'center' },
  photo: { width: '100%', aspectRatio: PHOTO_ASPECT },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
