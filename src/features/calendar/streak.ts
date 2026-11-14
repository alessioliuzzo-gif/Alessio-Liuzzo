/**
 * Auswertungen über die Tage mit Foto: Serie (Streak), vollständige Monate,
 * "heute vor einem Jahr". Reine Funktionen auf Datumsschlüsseln "YYYY-MM-DD".
 */
import { toDateKey } from './month-grid';

function parse(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function shiftDay(key: string, delta: number): string {
  const date = parse(key);
  date.setDate(date.getDate() + delta);
  return toDateKey(date);
}

/**
 * current: Tage in Folge bis heute. Fehlt das heutige Foto noch, zählt die
 * Serie bis gestern weiter (sie reisst erst, wenn ein ganzer Tag ausgelassen wurde).
 * longest: längste Serie überhaupt.
 */
export function computeStreak(days: ReadonlySet<string>, today: string) {
  let current = 0;
  let cursor = days.has(today) ? today : shiftDay(today, -1);
  while (days.has(cursor)) {
    current += 1;
    cursor = shiftDay(cursor, -1);
  }

  let longest = 0;
  for (const day of days) {
    if (days.has(shiftDay(day, -1))) continue; // nur am Anfang einer Serie zählen
    let length = 1;
    while (days.has(shiftDay(day, length))) length += 1;
    longest = Math.max(longest, length);
  }
  return { current, longest: Math.max(longest, current) };
}

/** Anzahl Fotos im Monat und Anzahl Tage des Monats (month: 0 = Januar). */
export function monthProgress(days: ReadonlySet<string>, year: number, month: number) {
  const total = new Date(year, month + 1, 0).getDate();
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
  let done = 0;
  for (const day of days) if (day.startsWith(prefix)) done += 1;
  return { done, total };
}

/** Alle Monate ("YYYY-MM"), in denen an jedem Tag ein Foto existiert, aufsteigend. */
export function completedMonths(days: ReadonlySet<string>): string[] {
  const counts = new Map<string, number>();
  for (const day of days) {
    const month = day.slice(0, 7);
    counts.set(month, (counts.get(month) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([month, count]) => {
      const [y, m] = month.split('-').map(Number);
      return count === new Date(y, m, 0).getDate();
    })
    .map(([month]) => month)
    .sort();
}

/** Derselbe Tag im Vorjahr. Aus dem 29. Februar wird der 28. Februar. */
export function oneYearAgo(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const lastDay = new Date(y - 1, m, 0).getDate();
  return toDateKey(new Date(y - 1, m - 1, Math.min(d, lastDay)));
}
