import { coverage, finalPrice, monthKey, twelveMonths } from '@/features/print/logic';

describe('Kalenderdruck', () => {
  it('liefert 12 Monate ab dem Start, auch über den Jahreswechsel', () => {
    const months = twelveMonths('2026-11');
    expect(months).toHaveLength(12);
    expect(monthKey(months[0])).toBe('2026-11');
    expect(monthKey(months[2])).toBe('2027-01');
    expect(monthKey(months[11])).toBe('2027-10');
  });

  it('rechnet den Rabatt und rundet auf 5 Rappen', () => {
    expect(finalPrice(29.9, 0)).toBe(29.9);
    expect(finalPrice(29.9, 15)).toBe(25.4);
    expect(finalPrice(29.9, 200)).toBe(0);
    expect(finalPrice(29.9, -5)).toBe(29.9);
  });

  it('zählt Fotos nur im gewählten Zeitraum', () => {
    const days = new Set(['2026-01-01', '2026-12-31', '2027-01-01']);
    expect(coverage(days, '2026-01')).toEqual({ photos: 2, total: 365 });
  });
});
