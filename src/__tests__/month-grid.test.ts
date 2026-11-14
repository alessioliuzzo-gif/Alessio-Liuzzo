import {
  buildMonthGrid,
  monthLabel,
  shiftMonth,
  toDateKey,
  weekdayLabels,
} from '@/features/calendar/month-grid';

describe('buildMonthGrid', () => {
  it('beginnt Wochen am Montag und füllt mit Nachbarmonaten auf', () => {
    // 1. November 2026 ist ein Sonntag: die erste Woche beginnt am 26. Oktober.
    const weeks = buildMonthGrid(2026, 10);
    expect(weeks).toHaveLength(6);
    expect(weeks[0][0]).toEqual({ key: '2026-10-26', day: 26, inMonth: false });
    expect(weeks[0][6]).toEqual({ key: '2026-11-01', day: 1, inMonth: true });
    expect(weeks[5][0]).toEqual({ key: '2026-11-30', day: 30, inMonth: true });
    expect(weeks[5][6]).toEqual({ key: '2026-12-06', day: 6, inMonth: false });
  });

  it('kommt mit vier Wochen aus, wenn der Februar am Montag beginnt', () => {
    const weeks = buildMonthGrid(2027, 1);
    expect(weeks).toHaveLength(4);
    expect(weeks.flat().every((cell) => cell.inMonth)).toBe(true);
  });

  it('kennt den Schalttag', () => {
    const days = buildMonthGrid(2028, 1)
      .flat()
      .filter((cell) => cell.inMonth);
    expect(days).toHaveLength(29);
    expect(days[28].key).toBe('2028-02-29');
  });

  it.each([2025, 2026, 2027, 2028])('liefert in %i für jeden Monat volle Wochen', (year) => {
    for (let month = 0; month < 12; month++) {
      const weeks = buildMonthGrid(year, month);
      const inMonth = weeks.flat().filter((cell) => cell.inMonth);
      expect(weeks.every((week) => week.length === 7)).toBe(true);
      expect(inMonth).toHaveLength(new Date(year, month + 1, 0).getDate());
      expect(new Set(weeks.flat().map((cell) => cell.key)).size).toBe(weeks.length * 7);
    }
  });
});

describe('Datumshelfer', () => {
  it('formatiert lokale Daten als YYYY-MM-DD', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('wechselt beim Blättern das Jahr', () => {
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
  });

  it('liefert sieben Wochentage ab Montag', () => {
    const labels = weekdayLabels('de');
    expect(labels).toHaveLength(7);
    expect(labels[0]).toMatch(/^Mo/);
    expect(labels[6]).toMatch(/^So/);
  });

  it('benennt den Monat in der gewählten Sprache', () => {
    expect(monthLabel(2026, 10, 'de')).toBe('November 2026');
    expect(monthLabel(2026, 0, 'it')).toBe('gennaio 2026');
  });
});
