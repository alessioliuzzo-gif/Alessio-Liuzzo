/**
 * Unterhaltung mit einem Freund, in Echtzeit. Optional als Antwort auf ein
 * Tagesfoto (Parameter "photo").
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { Avatar, ContentMenu } from '@/components/social';
import { AppText, Screen } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  listConversation,
  markConversationRead,
  sendMessage,
  subscribeToIncoming,
} from '@/features/chat/api';
import { signedThumbUrls } from '@/features/photos/api';
import { getProfiles } from '@/features/social/api';
import type { Message, Profile } from '@/lib/database.types';
import { requireSupabase } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/themes';

export default function ConversationScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const me = session?.user.id ?? '';
  const params = useLocalSearchParams<{ id: string; photo?: string }>();
  const other = params.id;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [thumbs, setThumbs] = useState<Map<string, string>>(new Map());
  const [replyTo, setReplyTo] = useState<string | undefined>(params.photo);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const list = useRef<FlatList<Message>>(null);

  /** Lädt Vorschaubilder für Nachrichten, die auf ein Foto antworten. */
  const loadThumbs = useCallback(async (photoIds: string[]) => {
    const ids = [...new Set(photoIds)];
    if (ids.length === 0) return;
    const { data } = await requireSupabase()
      .from('daily_photos')
      .select('id, storage_path')
      .in('id', ids);
    if (!data || data.length === 0) return;
    const urls = await signedThumbUrls(data.map((row) => row.storage_path));
    setThumbs((current) => {
      const next = new Map(current);
      for (const row of data) {
        const url = urls.get(row.storage_path);
        if (url) next.set(row.id, url);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!me || !other) return;
    let cancelled = false;
    Promise.all([getProfiles([other]), listConversation(me, other)])
      .then(([profiles, rows]) => {
        if (cancelled) return;
        setProfile(profiles.get(other) ?? null);
        setMessages(rows);
        void markConversationRead(me, other).catch(() => {});
        const photoIds = rows.map((row) => row.photo_id).filter((id): id is string => Boolean(id));
        if (params.photo) photoIds.push(params.photo);
        void loadThumbs(photoIds).catch(() => {});
      })
      .catch(() => {
        if (cancelled) return;
        setError('feed.loadFailed');
        setMessages([]);
      });
    return () => {
      cancelled = true;
    };
  }, [me, other, params.photo, loadThumbs]);

  // Neue Nachrichten dieses Gegenübers sofort anzeigen.
  useEffect(() => {
    if (!me || !other) return;
    return subscribeToIncoming(me, (message) => {
      if (message.sender_id !== other) return;
      setMessages((current) =>
        current && !current.some((m) => m.id === message.id) ? [...current, message] : current,
      );
      void markConversationRead(me, other).catch(() => {});
      if (message.photo_id) void loadThumbs([message.photo_id]).catch(() => {});
    });
  }, [me, other, loadThumbs]);

  async function send() {
    const body = draft.trim();
    if (!body) return;
    setBusy(true);
    setError(null);
    try {
      const message = await sendMessage(other, body, replyTo);
      setMessages((current) => [...(current ?? []), message]);
      setDraft('');
      setReplyTo(undefined);
    } catch {
      setError('chat.sendFailed');
    } finally {
      setBusy(false);
    }
  }

  const time = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, { timeStyle: 'short' }).format(new Date(iso));

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
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/chat'))}>
            <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
          </Pressable>
          <Avatar profile={profile} size={34} />
          <AppText variant="heading" numberOfLines={1} style={styles.flex}>
            {profile?.display_name ?? ''}
          </AppText>
          {other ? (
            <ContentMenu
              targetType="profile"
              targetId={other}
              userId={other}
              onBlocked={() => router.replace('/chat')}
            />
          ) : null}
        </View>

        {error && <Notice kind="error">{t(error)}</Notice>}
        {messages === null && (
          <ActivityIndicator color={theme.colors.primary} style={styles.spinner} />
        )}

        <FlatList
          ref={list}
          data={messages ?? []}
          keyExtractor={(message) => message.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            messages ? (
              <AppText muted style={styles.empty}>
                {t('chat.emptyConversation')}
              </AppText>
            ) : undefined
          }
          renderItem={({ item }) => {
            const mine = item.sender_id === me;
            const thumb = item.photo_id ? thumbs.get(item.photo_id) : undefined;
            return (
              <View
                style={[styles.bubbleRow, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}>
                <View
                  style={[
                    styles.bubble,
                    {
                      backgroundColor: mine ? theme.colors.primary : theme.colors.surfaceAlt,
                      borderRadius: theme.radius.lg,
                    },
                  ]}>
                  {item.photo_id && (
                    <View style={styles.reply}>
                      {thumb && (
                        <Image
                          source={{ uri: thumb }}
                          contentFit="cover"
                          style={styles.replyThumb}
                        />
                      )}
                      <AppText
                        variant="caption"
                        style={{ color: mine ? theme.colors.onPrimary : theme.colors.textMuted }}>
                        {t('chat.replyToPhoto')}
                      </AppText>
                    </View>
                  )}
                  <AppText style={{ color: mine ? theme.colors.onPrimary : theme.colors.text }}>
                    {item.body}
                  </AppText>
                  <AppText
                    variant="caption"
                    style={[
                      styles.time,
                      { color: mine ? theme.colors.onPrimary : theme.colors.textMuted },
                    ]}>
                    {time(item.created_at)}
                  </AppText>
                </View>
              </View>
            );
          }}
        />

        {replyTo && (
          <View
            style={[
              styles.replyBar,
              { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.md },
            ]}>
            {thumbs.get(replyTo) && (
              <Image
                source={{ uri: thumbs.get(replyTo) }}
                contentFit="cover"
                style={styles.replyThumb}
              />
            )}
            <AppText variant="caption" style={styles.flex}>
              {t('chat.replyToPhoto')}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
              hitSlop={10}
              onPress={() => setReplyTo(undefined)}>
              <Ionicons name="close" size={18} color={theme.colors.textMuted} />
            </Pressable>
          </View>
        )}

        <View style={[styles.composer, { borderColor: theme.colors.border }]}>
          <TextInput
            accessibilityLabel={t('chat.placeholderInput')}
            placeholder={t('chat.placeholderInput')}
            placeholderTextColor={theme.colors.textMuted}
            value={draft}
            onChangeText={setDraft}
            maxLength={2000}
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
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  spinner: { marginTop: spacing.xl },
  list: { gap: spacing.sm, paddingVertical: spacing.sm, flexGrow: 1 },
  empty: { textAlign: 'center', marginTop: spacing.xl },
  bubbleRow: { flexDirection: 'row' },
  bubble: { maxWidth: '82%', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 2 },
  time: { alignSelf: 'flex-end', opacity: 0.8, fontSize: 11 },
  reply: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
  replyThumb: { width: 30, height: 40, borderRadius: 4 },
  replyBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm },
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
