/**
 * Freunde: suchen, Anfragen senden und beantworten, Freundesliste, Blockierte.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Notice, TextField } from '@/components/form';
import { UserRow } from '@/components/social';
import { AppText, Card, Screen } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  acceptFriendRequest,
  getProfiles,
  listBlockedIds,
  listFriendships,
  removeFriendship,
  searchProfiles,
  sendFriendRequest,
  unblockUser,
} from '@/features/social/api';
import { relationTo } from '@/features/social/logic';
import type { Friendship, Profile } from '@/lib/database.types';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/themes';

export default function FriendsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const me = session?.user.id ?? '';

  const [friendships, setFriendships] = useState<Friendship[] | null>(null);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [blocked, setBlocked] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [rows, blockedIds] = await Promise.all([listFriendships(), listBlockedIds()]);
      const ids = rows.flatMap((row) => [row.requester_id, row.addressee_id]);
      setProfiles(await getProfiles([...ids, ...blockedIds]));
      setFriendships(rows);
      setBlocked(blockedIds);
    } catch {
      setError('feed.loadFailed');
      setFriendships((current) => current ?? []);
    }
  }, []);

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

  const search = () =>
    run(async () => {
      setResults(await searchProfiles(query, me));
    });

  const rows = friendships ?? [];
  const other = (row: Friendship) =>
    row.requester_id === me ? row.addressee_id : row.requester_id;
  const incoming = rows.filter((row) => row.status === 'pending' && row.addressee_id === me);
  const outgoing = rows.filter((row) => row.status === 'pending' && row.requester_id === me);
  const friends = rows.filter((row) => row.status === 'accepted');

  const small = (
    label: string,
    onPress: () => void,
    variant: 'primary' | 'secondary' | 'danger' = 'secondary',
  ) => (
    <View style={styles.smallButton}>
      <Button label={label} variant={variant} disabled={busy} onPress={onPress} />
    </View>
  );

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={12}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/feed'))}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
        </Pressable>
        <AppText variant="heading">{t('social.friendsTitle')}</AppText>
        <View style={styles.spacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {error && <Notice kind="error">{t(error)}</Notice>}

        <Card>
          <TextField
            label={t('social.searchLabel')}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={search}
          />
          <Button
            label={t('social.search')}
            onPress={search}
            disabled={busy || query.trim().length < 2}
          />
          {results?.length === 0 && <AppText muted>{t('social.noResults')}</AppText>}
          {results?.map((profile) => {
            const { relation, friendshipId } = relationTo(rows, me, profile.id);
            return (
              <UserRow
                key={profile.id}
                profile={profile}
                right={
                  relation === 'none' ? (
                    small(
                      t('social.add'),
                      () => run(() => sendFriendRequest(profile.id)),
                      'primary',
                    )
                  ) : relation === 'incoming' && friendshipId ? (
                    small(
                      t('social.accept'),
                      () => run(() => acceptFriendRequest(friendshipId)),
                      'primary',
                    )
                  ) : (
                    <AppText variant="caption" muted>
                      {t(relation === 'friends' ? 'social.isFriend' : 'social.requested')}
                    </AppText>
                  )
                }
              />
            );
          })}
        </Card>

        {friendships === null && <ActivityIndicator color={theme.colors.primary} />}

        {incoming.length > 0 && (
          <Card>
            <AppText variant="heading">{t('social.incoming')}</AppText>
            {incoming.map((row) => (
              <UserRow
                key={row.id}
                profile={profiles.get(other(row)) ?? null}
                right={
                  <View style={styles.actions}>
                    {small(
                      t('social.accept'),
                      () => run(() => acceptFriendRequest(row.id)),
                      'primary',
                    )}
                    {small(t('social.decline'), () => run(() => removeFriendship(row.id)))}
                  </View>
                }
              />
            ))}
          </Card>
        )}

        {outgoing.length > 0 && (
          <Card>
            <AppText variant="heading">{t('social.outgoing')}</AppText>
            {outgoing.map((row) => (
              <UserRow
                key={row.id}
                profile={profiles.get(other(row)) ?? null}
                right={small(t('social.withdraw'), () => run(() => removeFriendship(row.id)))}
              />
            ))}
          </Card>
        )}

        <Card>
          <AppText variant="heading">{t('social.myFriends', { count: friends.length })}</AppText>
          {friendships !== null && friends.length === 0 && (
            <AppText muted>{t('social.noFriends')}</AppText>
          )}
          {friends.map((row) => (
            <UserRow
              key={row.id}
              profile={profiles.get(other(row)) ?? null}
              onPress={() => router.push({ pathname: '/chat/[id]', params: { id: other(row) } })}
              right={small(t('social.remove'), () => run(() => removeFriendship(row.id)))}
            />
          ))}
        </Card>

        {blocked.length > 0 && (
          <Card>
            <AppText variant="heading">{t('social.blocked')}</AppText>
            {blocked.map((id) => (
              <UserRow
                key={id}
                profile={profiles.get(id) ?? null}
                right={small(t('social.unblock'), () => run(() => unblockUser(id)))}
              />
            ))}
          </Card>
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
  actions: { flexDirection: 'row', gap: spacing.xs },
  smallButton: { minWidth: 92 },
});
