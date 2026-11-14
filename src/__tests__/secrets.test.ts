import { createTapCounter, reachedMilestone } from '@/features/secrets/secrets';
import { themes } from '@/theme/themes';
import { contrastRatio } from '@/theme/contrast';

describe('Versteckte Funktionen', () => {
  it('löst erst nach genug schnellen Taps aus', () => {
    const tap = createTapCounter(3, 1000);
    expect(tap(0)).toBe(false);
    expect(tap(100)).toBe(false);
    expect(tap(200)).toBe(true);
    // Danach beginnt das Zählen von vorne.
    expect(tap(300)).toBe(false);
  });

  it('vergisst zu langsame Taps', () => {
    const tap = createTapCounter(3, 1000);
    tap(0);
    tap(900);
    expect(tap(2000)).toBe(false);
  });

  it('erkennt Serien-Meilensteine genau einmal', () => {
    expect(reachedMilestone(6, 7)).toBe(7);
    expect(reachedMilestone(7, 8)).toBeNull();
    expect(reachedMilestone(29, 30)).toBe(30);
    expect(reachedMilestone(0, 1)).toBeNull();
  });

  it('hält auch das versteckte Theme lesbar', () => {
    const c = themes.neon.colors;
    for (const background of [c.background, c.surface, c.surfaceAlt]) {
      expect(contrastRatio(c.text, background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(c.textMuted, background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(c.primary, background)).toBeGreaterThanOrEqual(3);
    }
    expect(contrastRatio(c.onPrimary, c.primary)).toBeGreaterThanOrEqual(4.5);
  });
});
