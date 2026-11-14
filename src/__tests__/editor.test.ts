import {
  applyMatrix,
  compose,
  contrast,
  FILTERS,
  getFilter,
  IDENTITY,
  saturation,
  tint,
} from '@/features/editor/filters';
import { clamp, fitCanvas } from '@/features/editor/layout';
import {
  createSticker,
  createText,
  FRAMES,
  hitTest,
  moveItem,
  resizeItem,
} from '@/features/editor/model';
import de from '@/i18n/locales/de.json';

const close = (a: readonly number[], b: readonly number[]) =>
  a.forEach((value, i) => expect(value).toBeCloseTo(b[i], 5));

describe('Farbmatrizen', () => {
  const orange: [number, number, number, number] = [0.9, 0.5, 0.1, 1];

  it('lässt mit der Einheitsmatrix alles unverändert', () => {
    close(applyMatrix(IDENTITY, orange), orange);
    close(saturation(1), IDENTITY);
    close(contrast(1), IDENTITY);
  });

  it('macht mit Sättigung 0 ein Grau gleicher Helligkeit', () => {
    const [r, g, b, a] = applyMatrix(saturation(0), orange);
    expect(r).toBeCloseTo(g, 5);
    expect(g).toBeCloseTo(b, 5);
    expect(r).toBeCloseTo(0.2126 * 0.9 + 0.7152 * 0.5 + 0.0722 * 0.1, 5);
    expect(a).toBe(1);
  });

  it('lässt beim Kontrast das mittlere Grau stehen', () => {
    close(applyMatrix(contrast(1.5), [0.5, 0.5, 0.5, 1]), [0.5, 0.5, 0.5, 1]);
    expect(applyMatrix(contrast(1.5), [0.8, 0.8, 0.8, 1])[0]).toBeCloseTo(0.95, 5);
  });

  it('begrenzt Ergebnisse auf 0 bis 1', () => {
    expect(applyMatrix(contrast(3), [1, 0, 1, 1])).toEqual([1, 0, 1, 1]);
  });

  it('verkettet in der richtigen Reihenfolge', () => {
    const first = tint(0.5, 1, 1);
    const second = contrast(1.4);
    close(applyMatrix(compose(first, second), orange), applyMatrix(second, applyMatrix(first, orange)));
    close(compose(IDENTITY, second), second);
    close(compose(second, IDENTITY), second);
  });

  it('definiert jeden Filter vollständig und mit Übersetzung', () => {
    const ids = FILTERS.map((filter) => filter.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(FILTERS[0].id).toBe('original');
    for (const filter of FILTERS) {
      expect(filter.matrix).toHaveLength(20);
      expect(filter.matrix.every(Number.isFinite)).toBe(true);
      // Die Deckkraft bleibt immer unverändert.
      expect(filter.matrix.slice(15)).toEqual([0, 0, 0, 1, 0]);
      expect(de.editor.filters[filter.id]).toEqual(expect.any(String));
    }
    expect(getFilter('mono').id).toBe('mono');
  });

  it('bietet genug Gratis-Filter und markiert Belohnungen', () => {
    expect(FILTERS.filter((f) => f.unlock === 'free').length).toBeGreaterThanOrEqual(5);
    expect(FILTERS.some((f) => f.unlock === 'reward')).toBe(true);
  });
});

describe('Geometrie', () => {
  it('passt die Arbeitsfläche im Verhältnis 3:4 ein', () => {
    expect(fitCanvas({ width: 360, height: 800 })).toEqual({ width: 360, height: 480 });
    expect(fitCanvas({ width: 360, height: 400 })).toEqual({ width: 300, height: 400 });
    expect(fitCanvas({ width: 0, height: 400 })).toEqual({ width: 0, height: 0 });
  });

  it('begrenzt Werte', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
  });
});

describe('Text und Sticker', () => {
  it('legt neue Elemente in der Bildmitte an und kürzt lange Texte', () => {
    const text = createText('  ' + 'x'.repeat(100), '#FFFFFF');
    expect(text).toMatchObject({ kind: 'text', x: 0.5, y: 0.5 });
    expect(text.text).toHaveLength(60);
    expect(createSticker('🔥').id).not.toBe(createSticker('🔥').id);
  });

  it('hält Elemente beim Verschieben im Bild', () => {
    const item = createSticker('⭐');
    expect(moveItem(item, 2, -2)).toMatchObject({ x: 1, y: 0 });
    expect(moveItem(item, 0.1, 0.1).x).toBeCloseTo(0.6, 5);
  });

  it('begrenzt die Grösse nach oben und unten', () => {
    let item = createText('Hallo', '#FFFFFF');
    for (let i = 0; i < 30; i++) item = resizeItem(item, 1);
    expect(item.size).toBeCloseTo(0.16, 5);
    for (let i = 0; i < 30; i++) item = resizeItem(item, -1);
    expect(item.size).toBeCloseTo(0.04, 5);
  });

  it('trifft das oberste Element unter dem Finger', () => {
    const below = { ...createSticker('🌙'), x: 0.5, y: 0.5 };
    const above = { ...createSticker('☀️'), x: 0.52, y: 0.5 };
    expect(hitTest([below, above], { x: 0.51, y: 0.5 }, 0.75)?.id).toBe(above.id);
    expect(hitTest([below, above], { x: 0.05, y: 0.05 }, 0.75)).toBeNull();
    expect(hitTest([], { x: 0.5, y: 0.5 }, 0.75)).toBeNull();
  });

  it('definiert jeden Rahmen mit Übersetzung', () => {
    expect(FRAMES[0].id).toBe('none');
    for (const frame of FRAMES) {
      expect(frame.insets).toHaveLength(4);
      expect(frame.insets.every((inset) => inset >= 0 && inset < 0.5)).toBe(true);
      expect(de.editor.frames[frame.id]).toEqual(expect.any(String));
    }
  });
});
