/**
 * Chat-Tab: Übersicht der Unterhaltungen, neueste zuerst.
 */
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { FadeIn } from '@/components/motion';
import { Button, Notice } from '@/components/form';
import { PlaceholderScreen } from '@/components/placeholder-screen';
import { UserRow } from '@/components/social';
import { AppText, Screen } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { listRecentMessages, subscribeToIncoming } from '@/features/chat/api';
import { getProfiles } from '@/features/social/api';
import { type Conversation, groupConversations } from '@/features/social/logic';
import type { Profile } from '@/lib/database.types';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/themes';

export default function ChatTab() {
  const { t } = useTranslation();
  const { demoMode, session } = useAuth();
  if (demoMode || !session) {
    return (
      <PlaceholderScreen
        title={t('chat.title')}
        message={t('chat.placeholder')}
        icon="chatbubbles-outline"
      />
    );
  }
  return <ChatList me={session.user.id} />;
}

function ChatList({ me }: { me: string }) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = groupConversations(await listRecentMessages(), me);
      setProfiles(await getProfiles(list.map((c) => c.otherId)));
      setConversations(list);
      setFailed(false);
    } catch {
      setFailed(true);
      setConversations((current) => current ?? []);
    }
  }, [me]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Kommt eine neue Nachricht an, die Übersicht auffrischen.
  useEffect(() => subscribeToIncoming(me, () => void load()), [me, load]);

  const time = (iso: string) => {
    const date = new Date(iso);
    const sameDay = date.toDateString() === new Date().toDateString();
    return new Intl.DateTimeFormat(
      i18n.language,
      sameDay ? { timeStyle: 'short' } : { dateStyle: 'short' },
    ).format(date);
  };

  return (
    <Screen>
      <FlatList
        data={conversations ?? []}
        keyExtractor={(c) => c.otherId}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <AppText variant="title">{t('chat.title')}</AppText>
            {failed && <Notice kind="error">{t('feed.loadFailed')}</Notice>}
            {conversations === null && <ActivityIndicator color={theme.colors.primary} />}
            {conversations?.length === 0 && (
              <>
                <AppText muted>{t('chat.empty')}</AppText>
                <Button
                  label={t('social.friendsTitle')}
                  variant="secondary"
                  onPress={() => router.push('/friends')}
                />
              </>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <FadeIn delay={Math.min(index, 8) * 40}>
            <UserRow
              profile={profiles.get(item.otherId) ?? null}
              subtitle={`${item.last.sender_id === me ? `${t('chat.you')}: ` : ''}${item.last.body}`}
              onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.otherId } })}
              right={
                <View style={styles.meta}>
                  <AppText variant="caption" muted>
                    {time(item.last.created_at)}
                  </AppText>
                  {item.unread > 0 && (
                    <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
                      <AppText
                        variant="caption"
                        style={{ color: theme.colors.onPrimary, fontWeight: '700' }}>
                        {item.unread}
                      </AppText>
                    </View>
                  )}
                </View>
              }
            />
          </FadeIn>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.md, paddingTop: spacing.md, marginBottom: spacing.sm },
  list: { gap: spacing.md, paddingBottom: spacing.xl },
  meta: { alignItems: 'flex-end', gap: spacing.xs },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
