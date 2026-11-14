/**
 * Reine Logik für den Kalenderdruck.
 */
export type MonthRef = { year: number; month: number };

/** Die 12 Monate ab einem Startmonat ("YYYY-MM"). */
export function twelveMonths(start: string): MonthRef[] {
  const [y, m] = start.split('-').map(Number);
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(y, m - 1 + i, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
}

export function monthKey({ year, month }: MonthRef): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

/** Endpreis nach Rabatt, auf 5 Rappen gerundet (Schweizer Rundung). */
export function finalPrice(price: number, discountPercent: number): number {
  const raw = price * (1 - Math.min(100, Math.max(0, discountPercent)) / 100);
  return Math.round(raw * 20) / 20;
}

/** Wie viele Tage im Zeitraum haben ein Foto? */
export function coverage(
  days: ReadonlySet<string>,
  start: string,
): { photos: number; total: number } {
  let photos = 0;
  let total = 0;
  for (const { year, month } of twelveMonths(start)) {
    const count = new Date(year, month + 1, 0).getDate();
    total += count;
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
    for (const day of days) if (day.startsWith(prefix)) photos += 1;
  }
  return { photos, total };
}
