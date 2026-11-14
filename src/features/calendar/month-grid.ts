/**
 * Berechnet das Raster einer Monatsansicht. Reine Datumslogik ohne UI.
 * Wochen beginnen am Montag (in der Schweiz und der EU üblich).
 */
export type DayCell = {
  /** Lokales Datum als YYYY-MM-DD. Dient später als Schlüssel für das Tagesfoto. */
  key: string;
  day: number;
  /** false für die Auffülltage des Vor- und Folgemonats */
  inMonth: boolean;
};

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * @param year  z. B. 2026
 * @param month 0 = Januar bis 11 = Dezember (wie bei JavaScript-Date)
 * @returns volle Wochen mit je 7 Tagen
 */
export function buildMonthGrid(year: number, month: number): DayCell[][] {
  const first = new Date(year, month, 1);
  // getDay(): 0 = Sonntag. Umrechnen auf 0 = Montag.
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weekCount = Math.ceil((offset + daysInMonth) / 7);

  const weeks: DayCell[][] = [];
  for (let w = 0; w < weekCount; w++) {
    const week: DayCell[] = [];
    for (let d = 0; d < 7; d++) {
      // Date korrigiert Überläufe selbst (Tag 0 = letzter Tag des Vormonats).
      const date = new Date(year, month, 1 - offset + w * 7 + d);
      week.push({
        key: toDateKey(date),
        day: date.getDate(),
        inMonth: date.getMonth() === first.getMonth(),
      });
    }
    weeks.push(week);
  }
  return weeks;
}

/** Verschiebt einen Monat und rechnet den Jahreswechsel mit ein. */
export function shiftMonth(year: number, month: number, delta: number) {
  const date = new Date(year, month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

/** Kurznamen der Wochentage ab Montag in der gewünschten Sprache. */
export function weekdayLabels(locale: string): string[] {
  const format = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  // Der 1. Januar 2024 war ein Montag.
  return Array.from({ length: 7 }, (_, i) => format.format(new Date(2024, 0, 1 + i)));
}

export function monthLabel(year: number, month: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
    new Date(year, month, 1),
  );
}
