import { contrastRatio } from '@/theme/contrast';
import { DEFAULT_THEME_ID, isThemeId, THEME_IDS, themes } from '@/theme/themes';

describe('themes', () => {
  it('bietet vier Themes mit Warm als Standard', () => {
    expect(THEME_IDS).toEqual(['warm', 'bold', 'minimal', 'pastel']);
    expect(Object.keys(themes)).toContain('neon');
    expect(DEFAULT_THEME_ID).toBe('warm');
  });

  it('gibt jedem Theme dieselben Farb-Tokens', () => {
    const expected = Object.keys(themes.warm.colors).sort();
    for (const id of THEME_IDS) {
      expect(Object.keys(themes[id].colors).sort()).toEqual(expected);
      expect(themes[id].id).toBe(id);
    }
  });

  it.each(THEME_IDS)('%s: Text ist lesbar (WCAG AA, 4.5:1)', (id) => {
    const c = themes[id].colors;
    for (const background of [c.background, c.surface, c.surfaceAlt]) {
      expect(contrastRatio(c.text, background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(c.textMuted, background)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrastRatio(c.onPrimary, c.primary)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(THEME_IDS)('%s: Akzentfarbe hebt sich vom Hintergrund ab (3:1)', (id) => {
    const c = themes[id].colors;
    for (const background of [c.background, c.surface, c.surfaceAlt]) {
      expect(contrastRatio(c.primary, background)).toBeGreaterThanOrEqual(3);
    }
  });

  it('erkennt gültige Theme-IDs', () => {
    expect(isThemeId('pastel')).toBe(true);
    expect(isThemeId('disco')).toBe(false);
    expect(isThemeId(null)).toBe(false);
  });
});

describe('contrastRatio', () => {
  it('rechnet die bekannten Grenzwerte richtig', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
  });
});
