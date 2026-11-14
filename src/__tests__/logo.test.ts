import { bladePaths, bladesSvg, frameSvg, fullLogoSvg } from '@/features/brand/logo';

const colors = { base: '#B5472F', blade: '#FFFFFF', sun: '#F4C542', rings: '#2B2622' };

describe('Logo', () => {
  it('besteht aus sechs geschlossenen Lamellen ohne ungültige Zahlen', () => {
    const paths = bladePaths();
    expect(paths).toHaveLength(6);
    for (const d of paths) {
      expect(d).toMatch(/^M .* Z$/);
      expect(d).not.toMatch(/NaN|Infinity/);
    }
  });

  it('liegt vollständig im Zeichenbereich', () => {
    const numbers = bladePaths()
      .join(' ')
      .split(/[^0-9.-]+/)
      .filter(Boolean)
      .map(Number);
    expect(Math.min(...numbers)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...numbers)).toBeLessThanOrEqual(100);
  });

  it('erzeugt gültige SVG-Dateien', () => {
    for (const svg of [bladesSvg(colors), frameSvg(colors), fullLogoSvg(colors, '#FAF4EA')]) {
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg.endsWith('</svg>')).toBe(true);
      expect((svg.match(/<svg/g) ?? []).length).toBe(1);
    }
    expect(fullLogoSvg(colors, undefined, 512)).toContain('width="512"');
  });
});
