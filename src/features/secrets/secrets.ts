/**
 * Versteckte Funktionen ("Easter Eggs"). Reine Logik, gut testbar.
 */

/** Zählt schnelle Antipp-Folgen: n-mal innerhalb des Zeitfensters löst aus. */
export function createTapCounter(needed: number, windowMs: number) {
  let taps: number[] = [];
  return (now: number = Date.now()): boolean => {
    taps = [...taps.filter((t) => now - t < windowMs), now];
    if (taps.length >= needed) {
      taps = [];
      return true;
    }
    return false;
  };
}

/** Serienlängen, bei denen gefeiert wird. */
export const STREAK_MILESTONES = [7, 30, 100, 365] as const;

/** Hat die Serie gerade einen Meilenstein erreicht (vorher darunter, jetzt genau darauf)? */
export function reachedMilestone(before: number, after: number): number | null {
  return STREAK_MILESTONES.find((m) => before < m && after >= m) ?? null;
}
