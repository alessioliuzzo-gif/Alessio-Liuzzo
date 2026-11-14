/**
 * Kommentare zu einem Tagesfoto (type = photo) oder einem Feed-Eintrag (type = fact).
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Notice } from '@/components/form';
import { ContentMenu, UserRow } from '@/components/social';
import { AppText, Screen } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { addComment, deleteComment, getFeedItem, listComments } from '@/features/discover/api';
import { PHOTO_ASPECT } from '@/features/editor/layout';
import {
  addPhotoComment,
  deletePhotoComment,
  getFeedPhoto,
  listPhotoComments,
} from '@/features/social/api';
import type { Profile } from '@/lib/database.types';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/themes';

type Row = { id: string; userId: string; body: string; createdAt: string; author: Profile | null };
type Subject = {
  title: string;
  text: string | null;
  imageUrl: string | null;
  ownerId: string | null;
  portrait: boolean;
};

export default function CommentsScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const me = session?.user.id ?? '';
  const { type, id } = useLocalSearchParams<{ type: string; id: string }>();
  const isPhoto = type === 'photo';

  const [subject, setSubject] = useState<Subject | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      if (isPhoto) {
        const [entry, comments] = await Promise.all([getFeedPhoto(id), listPhotoComments(id)]);
        if (entry) {
          setSubject({
            title: entry.author?.display_name ?? '',
            text: null,
            imageUrl: entry.url,
            ownerId: entry.photo.user_id,
            portrait: true,
          });
        }
        setRows(
          comments.map(({ comment, author }) => ({
            id: comment.id,
            userId: comment.user_id,
            body: comment.body,
            createdAt: comment.created_at,
            author,
          })),
        );
      } else {
        const [item, comments] = await Promise.all([getFeedItem(id), listComments(id)]);
        if (item)
          setSubject({
            title: item.title,
            text: item.body,
            imageUrl: item.image_url,
            ownerId: null,
            portrait: false,
          });
        setRows(
          comments.map(({ comment, author }) => ({
            id: comment.id,
            userId: comment.user_id,
            body: comment.body,
            createdAt: comment.created_at,
            author,
          })),
        );
      }
    } catch {
      setError('feed.loadFailed');
      setRows((current) => current ?? []);
    }
  }, [id, isPhoto]);

  // Beim Öffnen und bei jeder Rückkehr auf diesen Screen laden.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
    } catch {
      setError('profile.actionFailed');
    } finally {
      setBusy(false);
    }
  }

  const send = () =>
    run(async () => {
      await (isPhoto ? addPhotoComment(id, draft) : addComment(id, draft));
      setDraft('');
    });

  const time = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short', timeStyle: 'short' }).format(
      new Date(iso),
    );

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            hitSlop={12}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/feed'))}>
            <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
          </Pressable>
          <AppText variant="heading">{t('feed.commentsTitle')}</AppText>
          <View style={styles.spacer} />
        </View>

        <FlatList
          data={rows ?? []}
          keyExtractor={(row) => row.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.subject}>
              {subject?.imageUrl && (
                <Image
                  source={{ uri: subject.imageUrl }}
                  contentFit="cover"
                  style={[
                    subject.portrait ? styles.portrait : styles.landscape,
                    { borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceAlt },
                  ]}
                />
              )}
              {subject && <AppText variant="heading">{subject.title}</AppText>}
              {subject?.text && <AppText>{subject.text}</AppText>}
              {error && <Notice kind="error">{t(error)}</Notice>}
              {rows === null && <ActivityIndicator color={theme.colors.primary} />}
              {rows?.length === 0 && <AppText muted>{t('feed.noComments')}</AppText>}
            </View>
          }
          renderItem={({ item: row }) => {
            const canDelete = row.userId === me || subject?.ownerId === me;
            return (
              <View style={styles.comment}>
                <UserRow
                  profile={row.author}
                  subtitle={time(row.createdAt)}
                  right={
                    canDelete ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('feed.deleteComment')}
                        hitSlop={10}
                        disabled={busy}
                        onPress={() =>
                          run(() => (isPhoto ? deletePhotoComment(row.id) : deleteComment(row.id)))
                        }>
                        <Ionicons name="trash-outline" size={18} color={theme.colors.textMuted} />
                      </Pressable>
                    ) : (
                      <ContentMenu
                        targetType="comment"
                        targetId={row.id}
                        userId={row.userId}
                        onBlocked={load}
                      />
                    )
                  }
                />
                <AppText style={styles.commentBody}>{row.body}</AppText>
              </View>
            );
          }}
        />

        <View style={[styles.composer, { borderColor: theme.colors.border }]}>
          <TextInput
            accessibilityLabel={t('feed.commentPlaceholder')}
            placeholder={t('feed.commentPlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
            value={draft}
            onChangeText={setDraft}
            maxLength={500}
            multiline
            style={[
              styles.input,
              {
                color: theme.colors.text,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.md,
              },
            ]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('feed.send')}
            disabled={busy || draft.trim() === ''}
            onPress={send}
            style={[
              styles.send,
              {
                backgroundColor: theme.colors.primary,
                opacity: busy || draft.trim() === '' ? 0.4 : 1,
              },
            ]}>
            <Ionicons name="arrow-up" size={22} color={theme.colors.onPrimary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  spacer: { width: 26 },
  list: { gap: spacing.md, paddingBottom: spacing.md },
  subject: { gap: spacing.sm, marginBottom: spacing.sm },
  portrait: { width: '55%', aspectRatio: PHOTO_ASPECT, alignSelf: 'center' },
  landscape: { width: '100%', aspectRatio: 16 / 9 },
  comment: { gap: spacing.xs },
  commentBody: { marginLeft: 40 + spacing.sm + spacing.xs },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    fontSize: 16,
  },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
