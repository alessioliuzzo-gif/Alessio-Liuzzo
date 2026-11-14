/**
 * Eigenen Fakt oder ein Fundstück im Entdecken-Feed teilen.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { Button, Notice, TextField } from '@/components/form';
import { AppText, Screen } from '@/components/ui';
import { createPost, POST_BODY_MAX, POST_TITLE_MAX } from '@/features/discover/api';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/themes';

export default function NewPostScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/feed'));

  async function submit() {
    if (title.trim() === '') return;
    setBusy(true);
    setError(null);
    try {
      await createPost(i18n.language, title, body);
      close();
    } catch (e) {
      setError(
        e instanceof Error && e.message === 'post_limit_reached'
          ? 'feed.postLimit'
          : 'profile.actionFailed',
      );
      setBusy(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <AppText variant="heading">{t('feed.sharePost')}</AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            hitSlop={12}
            onPress={close}>
            <Ionicons name="close" size={28} color={theme.colors.text} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppText muted>{t('feed.shareHint')}</AppText>
          {error && <Notice kind="error">{t(error)}</Notice>}
          <TextField
            label={t('feed.postTitle')}
            value={title}
            onChangeText={setTitle}
            maxLength={POST_TITLE_MAX}
            hint={`${title.length}/${POST_TITLE_MAX}`}
          />
          <TextField
            label={t('feed.postBody')}
            value={body}
            onChangeText={setBody}
            maxLength={POST_BODY_MAX}
            multiline
            hint={`${body.length}/${POST_BODY_MAX}`}
            style={styles.body}
          />
          <Notice>{t('feed.shareRules')}</Notice>
          <Button
            label={t('feed.publish')}
            onPress={submit}
            loading={busy}
            disabled={title.trim() === ''}
          />
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
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  body: { minHeight: 120, textAlignVertical: 'top', paddingTop: spacing.sm },
});
