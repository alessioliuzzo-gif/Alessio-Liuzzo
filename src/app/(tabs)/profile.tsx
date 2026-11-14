/**
 * Profil-Tab. In Phase 0 nur Einstellungen für Design und Sprache; Konto,
 * Profilbild und "Konto löschen" kommen in Phase 1.
 */
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Card, OptionRow, Screen } from '@/components/ui';
import { APP_NAME, APP_VERSION } from '@/config/brand';
import { setLanguage } from '@/i18n';
import { LANGUAGE_NAMES, LANGUAGES } from '@/i18n/languages';
import { useThemeControls } from '@/theme/ThemeProvider';
import { spacing, THEME_IDS, themes } from '@/theme/themes';

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { themeId, setThemeId } = useThemeControls();

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppText variant="title">{t('profile.title')}</AppText>

        <Card>
          <AppText variant="heading">{t('profile.theme')}</AppText>
          <View accessibilityRole="radiogroup" style={styles.options}>
            {THEME_IDS.map((id) => (
              <OptionRow
                key={id}
                label={t(`themes.${id}`)}
                selected={id === themeId}
                onPress={() => setThemeId(id)}
                leading={<Swatch id={id} />}
              />
            ))}
          </View>
        </Card>

        <Card>
          <AppText variant="heading">{t('profile.language')}</AppText>
          <View accessibilityRole="radiogroup" style={styles.options}>
            {LANGUAGES.map((language) => (
              <OptionRow
                key={language}
                label={LANGUAGE_NAMES[language]}
                selected={i18n.language === language}
                onPress={() => void setLanguage(language)}
              />
            ))}
          </View>
        </Card>

        <AppText variant="caption" muted style={styles.version}>
          {APP_NAME} · {t('profile.version', { version: APP_VERSION })}
        </AppText>
      </ScrollView>
    </Screen>
  );
}

/** Kleine Farbvorschau: zeigt Hintergrund und Akzent des jeweiligen Themes. */
function Swatch({ id }: { id: keyof typeof themes }) {
  const { colors } = themes[id];
  return (
    <View style={[styles.swatch, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={[styles.swatchDot, { backgroundColor: colors.primary }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xl },
  options: { gap: spacing.sm },
  version: { textAlign: 'center', marginTop: spacing.sm },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchDot: { width: 12, height: 12, borderRadius: 6 },
});
