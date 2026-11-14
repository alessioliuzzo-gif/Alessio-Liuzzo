/**
 * Ideen-Box: Die Community reicht Wünsche ein und stimmt ab. Die beliebtesten
 * stehen oben; der Betreiber markiert im Dashboard, was geplant oder umgesetzt ist.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Notice, TextField } from '@/components/form';
import { FadeIn } from '@/components/motion';
import { ContentMenu } from '@/components/social';
import { AppText, Card, Screen } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { deleteIdea, type IdeaEntry, listIdeas, setVote, submitIdea } from '@/features/ideas/api';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/themes';

const COMING = ['video', 'widgets', 'groups', 'stickers'] as const;

export default function IdeasScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const me = session?.user.id ?? '';
  const [ideas, setIdeas] = useState<IdeaEntry[] | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'info' | 'error'; key: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setIdeas(await listIdeas());
    } catch {
      setMessage({ kind: 'error', key: 'feed.loadFailed' });
      setIdeas((current) => current ?? []);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function submit() {
    setBusy(true);
    setMessage(null);
    try {
      await submitIdea(title, body);
      setTitle('');
      setBody('');
      setMessage({ kind: 'info', key: 'ideas.thanks' });
      await load();
    } catch (e) {
      setMessage({
        kind: 'error',
        key:
          e instanceof Error && e.message === 'idea_limit_reached'
            ? 'ideas.limit'
            : 'profile.actionFailed',
      });
    } finally {
      setBusy(false);
    }
  }

  async function vote(entry: IdeaEntry) {
    // Sofort anzeigen, bei einem Fehler neu laden.
    setIdeas((list) =>
      (list ?? []).map((e) =>
        e.idea.id === entry.idea.id
          ? {
              ...e,
              voted: !e.voted,
              idea: { ...e.idea, vote_count: e.idea.vote_count + (e.voted ? -1 : 1) },
            }
          : e,
      ),
    );
    try {
      await setVote(entry.idea.id, !entry.voted);
    } catch {
      void load();
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
        <AppText variant="heading">{t('ideas.title')}</AppText>
        <View style={styles.spacer} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <AppText muted>{t('ideas.intro')}</AppText>

        <Card>
          <View style={styles.row}>
            <Ionicons name="rocket-outline" size={20} color={theme.colors.primary} />
            <AppText variant="heading">{t('ideas.comingTitle')}</AppText>
          </View>
          {COMING.map((key) => (
            <View key={key} style={styles.row}>
              <Ionicons name="ellipse" size={8} color={theme.colors.accent} />
              <AppText style={styles.flex}>{t(`ideas.coming.${key}`)}</AppText>
            </View>
          ))}
          <AppText variant="caption" muted>
            {t('ideas.comingMore')}
          </AppText>
        </Card>

        <Card>
          <AppText variant="heading">{t('ideas.submitTitle')}</AppText>
          {message && <Notice kind={message.kind}>{t(message.key)}</Notice>}
          <TextField
            label={t('ideas.fieldTitle')}
            value={title}
            onChangeText={setTitle}
            maxLength={80}
          />
          <TextField
            label={t('ideas.fieldBody')}
            value={body}
            onChangeText={setBody}
            maxLength={500}
            multiline
            style={styles.body}
          />
          <Button
            label={t('ideas.submit')}
            onPress={submit}
            loading={busy}
            disabled={title.trim().length < 3}
          />
        </Card>

        <AppText variant="heading">{t('ideas.listTitle')}</AppText>
        {ideas === null && <ActivityIndicator color={theme.colors.primary} />}
        {ideas?.length === 0 && <AppText muted>{t('ideas.empty')}</AppText>}
        {ideas?.map((entry, index) => {
          const { idea } = entry;
          return (
            <FadeIn key={idea.id} delay={Math.min(index, 8) * 40}>
              <View
                style={[
                  styles.idea,
                  {
                    backgroundColor: theme.colors.surface,
                    borderRadius: theme.radius.lg,
                    borderColor: theme.colors.border,
                  },
                ]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('ideas.vote')}
                  accessibilityState={{ selected: entry.voted }}
                  onPress={() => vote(entry)}
                  style={[
                    styles.vote,
                    {
                      borderRadius: theme.radius.md,
                      backgroundColor: entry.voted ? theme.colors.primary : theme.colors.surfaceAlt,
                    },
                  ]}>
                  <Ionicons
                    name="caret-up"
                    size={20}
                    color={entry.voted ? theme.colors.onPrimary : theme.colors.primary}
                  />
                  <AppText
                    style={{
                      fontWeight: '800',
                      color: entry.voted ? theme.colors.onPrimary : theme.colors.text,
                    }}>
                    {idea.vote_count}
                  </AppText>
                </Pressable>
                <View style={styles.flex}>
                  <AppText style={styles.bold}>{idea.title}</AppText>
                  {idea.body !== '' && <AppText variant="caption">{idea.body}</AppText>}
                  <View style={styles.meta}>
                    {idea.status !== 'open' && (
                      <View
                        style={[
                          styles.badge,
                          {
                            backgroundColor: theme.colors.surfaceAlt,
                            borderRadius: theme.radius.pill,
                          },
                        ]}>
                        <AppText
                          variant="caption"
                          style={{
                            color:
                              idea.status === 'done' ? theme.colors.success : theme.colors.primary,
                            fontWeight: '700',
                          }}>
                          {t(`ideas.status.${idea.status}`)}
                        </AppText>
                      </View>
                    )}
                    <AppText variant="caption" muted numberOfLines={1} style={styles.flex}>
                      {entry.author ? `@${entry.author.username}` : ''}
                    </AppText>
                    {idea.user_id === me ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('ideas.delete')}
                        hitSlop={10}
                        onPress={() =>
                          void deleteIdea(idea.id)
                            .then(load)
                            .catch(() => {})
                        }>
                        <Ionicons name="trash-outline" size={18} color={theme.colors.textMuted} />
                      </Pressable>
                    ) : (
                      <ContentMenu
                        targetType="idea"
                        targetId={idea.id}
                        userId={idea.user_id}
                        onBlocked={load}
                      />
                    )}
                  </View>
                </View>
              </View>
            </FadeIn>
          );
        })}
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
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  body: { minHeight: 80, textAlignVertical: 'top', paddingTop: spacing.sm },
  idea: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  vote: { width: 52, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm },
  bold: { fontWeight: '700' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2 },
});
