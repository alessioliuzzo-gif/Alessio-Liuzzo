import { contrastRatio } from '@/theme/contrast';
import {
  ACCENTS,
  buildCustomTheme,
  DEFAULT_CUSTOM,
  FONTS,
  parseCustomSettings,
  SHAPES,
} from '@/theme/custom';
import { isThemeId, themes } from '@/theme/themes';

describe('Eigenes Design', () => {
  const combos = ACCENTS.flatMap((accent) =>
    [false, true].map((dark) => ({ accent: accent.light, dark, id: accent.id })),
  );

  it.each(combos)('$id (dunkel: $dark) ist lesbar', ({ accent, dark }) => {
    const { colors } = buildCustomTheme({ ...DEFAULT_CUSTOM, accent, dark });
    for (const background of [colors.background, colors.surface, colors.surfaceAlt]) {
      expect(contrastRatio(colors.primary, background)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(colors.text, background)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrastRatio(colors.onPrimary, colors.primary)).toBeGreaterThanOrEqual(4.5);
  });

  it('übernimmt Form und Schrift', () => {
    for (const shape of SHAPES) {
      for (const font of FONTS) {
        const theme = buildCustomTheme({ ...DEFAULT_CUSTOM, shape, font });
        expect(theme.id).toBe('custom');
        expect(theme.radius.pill).toBe(999);
      }
    }
    expect(buildCustomTheme({ ...DEFAULT_CUSTOM, shape: 'sharp' }).radius.md).toBeLessThan(
      buildCustomTheme({ ...DEFAULT_CUSTOM, shape: 'round' }).radius.md,
    );
    expect(Object.keys(buildCustomTheme(DEFAULT_CUSTOM).colors).sort()).toEqual(
      Object.keys(themes.warm.colors).sort(),
    );
  });

  it('liest gespeicherte Einstellungen robust', () => {
    expect(parseCustomSettings(null)).toEqual(DEFAULT_CUSTOM);
    expect(parseCustomSettings('kein json')).toEqual(DEFAULT_CUSTOM);
    expect(
      parseCustomSettings('{"dark":true,"accent":"#000001","shape":"oval","font":"comic"}'),
    ).toEqual({
      ...DEFAULT_CUSTOM,
      dark: true,
    });
    const saved = { dark: true, accent: ACCENTS[3].light, shape: 'round', font: 'serif' };
    expect(parseCustomSettings(JSON.stringify(saved))).toEqual(saved);
  });

  it('gilt als gültige Theme-ID', () => {
    expect(isThemeId('custom')).toBe(true);
  });
});
