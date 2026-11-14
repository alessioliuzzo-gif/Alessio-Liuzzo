/**
 * Geometrie des Editors. Reine Funktionen.
 */
export type Size = { width: number; height: number };

/** Alle Tagesfotos haben dieses Seitenverhältnis (Hochformat), passend zum Kalender. */
export const PHOTO_ASPECT = 3 / 4;

/**
 * Grösse der Arbeitsfläche: so breit wie möglich im Seitenverhältnis 3:4,
 * ohne die verfügbare Höhe zu überschreiten.
 */
export function fitCanvas(available: Size): Size {
  const width = Math.max(0, Math.min(available.width, available.height * PHOTO_ASPECT));
  return { width: Math.floor(width), height: Math.floor(width / PHOTO_ASPECT) };
}

/** Hält einen Wert in einem Bereich. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
