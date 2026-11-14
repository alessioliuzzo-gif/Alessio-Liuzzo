/**
 * Eigenes Design zusammenstellen: hell oder dunkel, Akzentfarbe, Eckenform
 * und Schrift. Änderungen wirken sofort in der ganzen App.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Segmented } from '@/components/form';
import { AppText } from '@/components/ui';

import { ACCENTS, type CustomFont, type CustomShape, FONTS, SHAPES } from './custom';
import { useTheme, useThemeControls } from './ThemeProvider';
import { spacing } from './themes';

export function CustomThemeEditor() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { custom, setCustom } = useThemeControls();

  return (
    <View style={styles.editor}>
      <Segmented
        label={t('customTheme.mode')}
        value={custom.dark ? 'dark' : 'light'}
        onChange={(mode) => setCustom({ ...custom, dark: mode === 'dark' })}
        options={[
          { value: 'light', label: t('customTheme.light'), icon: 'sunny-outline' },
          { value: 'dark', label: t('customTheme.dark'), icon: 'moon-outline' },
        ]}
      />

      <AppText variant="caption" muted>
        {t('customTheme.accent')}
      </AppText>
      <View accessibilityRole="radiogroup" style={styles.swatches}>
        {ACCENTS.map((accent) => {
          const selected = accent.light === custom.accent;
          const color = custom.dark ? accent.dark : accent.light;
          return (
            <Pressable
              key={accent.id}
              accessibilityRole="radio"
              accessibilityLabel={t(`customTheme.accents.${accent.id}`)}
              accessibilityState={{ selected }}
              onPress={() => setCustom({ ...custom, accent: accent.light })}
              style={[
                styles.swatch,
                {
                  backgroundColor: color,
                  borderColor: selected ? theme.colors.text : 'transparent',
                },
              ]}>
              {selected && <Ionicons name="checkmark" size={18} color={theme.colors.onPrimary} />}
            </Pressable>
          );
        })}
      </View>

      <AppText variant="caption" muted>
        {t('customTheme.shape')}
      </AppText>
      <Segmented<CustomShape>
        label={t('customTheme.shape')}
        value={custom.shape}
        onChange={(shape) => setCustom({ ...custom, shape })}
        options={SHAPES.map((shape) => ({ value: shape, label: t(`customTheme.shapes.${shape}`) }))}
      />

      <AppText variant="caption" muted>
        {t('customTheme.font')}
      </AppText>
      <Segmented<CustomFont>
        label={t('customTheme.font')}
        value={custom.font}
        onChange={(font) => setCustom({ ...custom, font })}
        options={FONTS.map((font) => ({ value: font, label: t(`customTheme.fonts.${font}`) }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  editor: { gap: spacing.sm, marginTop: spacing.xs },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
