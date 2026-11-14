/**
 * Feed-Tab mit drei Bereichen: Fotos der Freunde, öffentliche Fotos und
 * "Entdecken" (täglich neue Fakten). Alles lässt sich kommentieren.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { FadeIn, PressableScale } from '@/components/motion';
import { Notice, Segmented } from '@/components/form';
import { PlaceholderScreen } from '@/components/placeholder-screen';
import { ContentMenu, UserRow } from '@/components/social';
import { AppText, Card, Screen } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { countComments, listFeedItems } from '@/features/discover/api';
import { PHOTO_ASPECT } from '@/features/editor/layout';
import {
  countPhotoComments,
  type FeedPhoto,
  listFriendFeed,
  listFriendships,
  listPublicFeed,
} from '@/features/social/api';
import { friendIds } from '@/features/social/logic';
import type { FeedItem } from '@/lib/database.types';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/themes';

type Section = 'friends' | 'public' | 'discover';
type Loaded =
  | {
      section: 'friends' | 'public';
      photos: FeedPhoto[];
      counts: Map<string, number>;
      friends: Set<string>;
    }
  | { section: 'discover'; items: FeedItem[]; counts: Map<string, number> };

export default function FeedScreen() {
  const { t } = useTranslation();
  const { demoMode, session } = useAuth();
  if (demoMode || !session) {
    return (
      <PlaceholderScreen
        title={t('feed.title')}
        message={t('feed.placeholder')}
        icon="images-outline"
      />
    );
  }
  return <Feed me={session.user.id} />;
}

function Feed({ me }: { me: string }) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const lang = i18n.language;

  const [section, setSection] = useState<Section>('friends');
  const [data, setData] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      if (section === 'discover') {
        const items = await listFeedItems(lang);
        setData({ section, items, counts: await countComments(items.map((item) => item.id)) });
      } else {
        const friends = friendIds(await listFriendships(), me);
        const photos =
          section === 'friends' ? await listFriendFeed(friends) : await listPublicFeed(me);
        const counts = await countPhotoComments(photos.map((entry) => entry.photo.id));
        setData({ section, photos, counts, friends: new Set(friends) });
      }
    } catch {
      setFailed(true);
    }
  }, [section, lang, me]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const current = data && data.section === section ? data : null;
  const dateLabel = (key: string) =>
    new Intl.DateTimeFormat(lang, { dateStyle: 'medium' }).format(new Date(`${key}T12:00:00`));

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <AppText variant="title">{t('feed.title')}</AppText>
        <PressableScale
          accessibilityLabel={t('social.friendsTitle')}
          onPress={() => router.push('/friends')}>
          <View
            style={[
              styles.friendsButton,
              { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.pill },
            ]}>
            <Ionicons name="people" size={18} color={theme.colors.primary} />
            <AppText variant="caption" style={{ color: theme.colors.primary, fontWeight: '600' }}>
              {t('social.friendsTitle')}
            </AppText>
          </View>
        </PressableScale>
      </View>
      <Segmented
        label={t('feed.title')}
        value={section}
        onChange={setSection}
        options={[
          { value: 'friends', label: t('feed.friends') },
          { value: 'public', label: t('feed.public') },
          { value: 'discover', label: t('feed.discover') },
        ]}
      />
      {failed && <Notice kind="error">{t('feed.loadFailed')}</Notice>}
      {!current && !failed && (
        <ActivityIndicator color={theme.colors.primary} style={styles.spinner} />
      )}
    </View>
  );

  const empty = current ? (
    <AppText muted style={styles.empty}>
      {t(
        section === 'friends'
          ? 'feed.emptyFriends'
          : section === 'public'
            ? 'feed.emptyPublic'
            : 'feed.emptyDiscover',
      )}
    </AppText>
  ) : undefined;

  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.primary} />
  );

  if (section === 'discover') {
    const items = current?.section === 'discover' ? current.items : [];
    return (
      <Screen>
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <FadeIn delay={Math.min(index, 6) * 60}>
              <Card>
                {item.image_url && (
                  <Image
                    source={{ uri: item.image_url }}
                    contentFit="cover"
                    transition={150}
                    style={[
                      styles.factImage,
                      { borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceAlt },
                    ]}
                  />
                )}
                <AppText variant="caption" muted>
                  {t(item.kind === 'fact' ? 'feed.onThisDay' : 'feed.news')} ·{' '}
                  {dateLabel(item.published_on)}
                </AppText>
                <AppText variant="heading">{item.title}</AppText>
                {item.body && <AppText>{item.body}</AppText>}
                <View style={styles.cardFooter}>
                  <Pressable
                    accessibilityRole="link"
                    hitSlop={8}
                    onPress={() => void Linking.openURL(item.source_url)}>
                    <AppText variant="caption" style={{ color: theme.colors.primary }}>
                      {t('feed.source', { name: item.source_name })}
                    </AppText>
                  </Pressable>
                  <CommentButton
                    count={current?.counts.get(item.id) ?? 0}
                    onPress={() =>
                      router.push({
                        pathname: '/comments/[type]/[id]',
                        params: { type: 'fact', id: item.id },
                      })
                    }
                  />
                </View>
              </Card>
            </FadeIn>
          )}
        />
      </Screen>
    );
  }

  const photos = current && current.section !== 'discover' ? current.photos : [];
  const friends = current && current.section !== 'discover' ? current.friends : new Set<string>();
  return (
    <Screen>
      <FlatList
        data={photos}
        keyExtractor={(entry) => entry.photo.id}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item: entry, index }) => (
          <FadeIn delay={Math.min(index, 6) * 60}>
            <Card>
              <UserRow
                profile={entry.author}
                subtitle={dateLabel(entry.photo.day)}
                right={
                  <ContentMenu
                    targetType="photo"
                    targetId={entry.photo.id}
                    userId={entry.photo.user_id}
                    onBlocked={load}
                  />
                }
              />
              <Image
                source={entry.url ? { uri: entry.url } : null}
                contentFit="cover"
                transition={200}
                style={[
                  styles.photo,
                  { borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceAlt },
                ]}
              />
              <View style={styles.cardFooter}>
                {friends.has(entry.photo.user_id) ? (
                  <Pressable
                    accessibilityRole="button"
                    hitSlop={8}
                    style={styles.action}
                    onPress={() =>
                      router.push({
                        pathname: '/chat/[id]',
                        params: { id: entry.photo.user_id, photo: entry.photo.id },
                      })
                    }>
                    <Ionicons name="arrow-undo-outline" size={18} color={theme.colors.primary} />
                    <AppText
                      variant="caption"
                      style={{ color: theme.colors.primary, fontWeight: '600' }}>
                      {t('feed.reply')}
                    </AppText>
                  </Pressable>
                ) : (
                  <View />
                )}
                <CommentButton
                  count={current?.counts.get(entry.photo.id) ?? 0}
                  onPress={() =>
                    router.push({
                      pathname: '/comments/[type]/[id]',
                      params: { type: 'photo', id: entry.photo.id },
                    })
                  }
                />
              </View>
            </Card>
          </FadeIn>
        )}
      />
    </Screen>
  );
}

function CommentButton({ count, onPress }: { count: number; onPress: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="button" hitSlop={8} style={styles.action} onPress={onPress}>
      <Ionicons name="chatbubble-outline" size={18} color={theme.colors.primary} />
      <AppText variant="caption" style={{ color: theme.colors.primary, fontWeight: '600' }}>
        {t('feed.comments', { count })}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.md, paddingTop: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  friendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + spacing.xs,
    paddingVertical: spacing.sm,
  },
  spinner: { marginTop: spacing.xl },
  list: { gap: spacing.md, paddingBottom: spacing.xl },
  empty: { textAlign: 'center', marginTop: spacing.xl },
  photo: { width: '100%', aspectRatio: PHOTO_ASPECT },
  factImage: { width: '100%', aspectRatio: 16 / 9 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
