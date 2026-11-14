/**
 * Nutzungsbedingungen und Datenschutzerklärung.
 * NOCH OFFEN: Die eigentlichen Texte (Entwurf nach Schweizer DSG und DSGVO)
 * kommen in Phase 11. Bis dahin steht hier ein klar markierter Platzhalter.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import { Button, Notice } from '@/components/form';
import { AppText, Screen } from '@/components/ui';
import { spacing } from '@/theme/themes';

export default function LegalScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const title = doc === 'privacy' ? t('legal.privacy') : t('legal.terms');

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="title">{title}</AppText>
        <Notice>{t('legal.draftPending')}</Notice>
        <Button
          label={t('common.back')}
          variant="secondary"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xl },
});
