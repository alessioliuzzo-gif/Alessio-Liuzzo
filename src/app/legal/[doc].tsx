/**
 * Nutzungsbedingungen und Datenschutzerklärung. Deutsch ist massgebend;
 * für Englisch, Französisch und Italienisch wird die englische Fassung gezeigt.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/form';
import { AppText, Screen } from '@/components/ui';
import { privacyDe, termsDe } from '@/features/legal/de';
import { privacyEn, termsEn } from '@/features/legal/en';
import { spacing } from '@/theme/themes';

export default function LegalScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const german = i18n.language === 'de';
  const document =
    doc === 'privacy' ? (german ? privacyDe : privacyEn) : german ? termsDe : termsEn;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="title">{document.title}</AppText>
        <AppText variant="caption" muted>
          {t('legal.updated', { version: document.updated })}
        </AppText>
        <AppText>{document.intro}</AppText>
        {document.sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <AppText variant="heading">{section.heading}</AppText>
            {section.paragraphs.map((paragraph, i) => (
              <AppText key={i}>{paragraph}</AppText>
            ))}
          </View>
        ))}
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
  section: { gap: spacing.sm },
});
