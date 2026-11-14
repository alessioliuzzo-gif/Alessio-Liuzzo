/**
 * Datenmodell des Editors: Rahmen, Text- und Sticker-Elemente.
 * Positionen sind relativ (0 bis 1), damit sie auf jeder Bildschirmgrösse stimmen.
 */
import { clamp } from './layout';
import type { Unlock } from './filters';

export type FrameId = 'none' | 'white' | 'polaroid' | 'black' | 'film' | 'gold';

export type PhotoFrame = {
  id: FrameId;
  color: string;
  /** Randbreiten als Anteil der Bildbreite: oben, rechts, unten, links */
  insets: readonly [number, number, number, number];
  unlock: Unlock;
};

export const FRAMES: readonly PhotoFrame[] = [
  { id: 'none', color: '#00000000', insets: [0, 0, 0, 0], unlock: 'free' },
  { id: 'white', color: '#FFFFFF', insets: [0.035, 0.035, 0.035, 0.035], unlock: 'free' },
  { id: 'polaroid', color: '#FDFBF6', insets: [0.045, 0.045, 0.2, 0.045], unlock: 'free' },
  { id: 'black', color: '#111111', insets: [0.035, 0.035, 0.035, 0.035], unlock: 'free' },
  { id: 'film', color: '#111111', insets: [0.1, 0, 0.1, 0], unlock: 'reward' },
  { id: 'gold', color: '#C9A227', insets: [0.025, 0.025, 0.025, 0.025], unlock: 'reward' },
];

export function getFrame(id: FrameId): PhotoFrame {
  return FRAMES.find((frame) => frame.id === id) ?? FRAMES[0];
}

export const STICKERS = ['❤️', '😊', '😂', '🔥', '⭐', '☀️', '🌙', '🌈', '🎉', '🍕', '☕', '🏔️', '🌊', '🐶', '🐱', '✨'] as const;

export const TEXT_COLORS = ['#FFFFFF', '#111111', '#F4C542', '#E4572E', '#2E86DE'] as const;

export type OverlayItem = {
  id: string;
  kind: 'text' | 'sticker';
  text: string;
  /** Mittelpunkt, 0 bis 1 relativ zur Arbeitsfläche */
  x: number;
  y: number;
  /** Schriftgrösse als Anteil der Bildbreite */
  size: number;
  color: string;
};

export const MAX_ITEMS = 12;
export const MAX_TEXT_LENGTH = 60;
const SIZE_RANGE = { text: [0.04, 0.16], sticker: [0.08, 0.4] } as const;
const SIZE_STEP = 1.2;

let counter = 0;
function nextId(): string {
  counter += 1;
  return `item-${counter}`;
}

export function createText(text: string, color: string): OverlayItem {
  return { id: nextId(), kind: 'text', text: text.trim().slice(0, MAX_TEXT_LENGTH), x: 0.5, y: 0.5, size: 0.075, color };
}

export function createSticker(emoji: string): OverlayItem {
  return { id: nextId(), kind: 'sticker', text: emoji, x: 0.5, y: 0.4, size: 0.18, color: '#FFFFFF' };
}

/** Verschiebt ein Element um einen relativen Betrag und hält den Mittelpunkt im Bild. */
export function moveItem(item: OverlayItem, dx: number, dy: number): OverlayItem {
  return { ...item, x: clamp(item.x + dx, 0, 1), y: clamp(item.y + dy, 0, 1) };
}

export function resizeItem(item: OverlayItem, direction: 1 | -1): OverlayItem {
  const [min, max] = SIZE_RANGE[item.kind];
  const next = direction === 1 ? item.size * SIZE_STEP : item.size / SIZE_STEP;
  return { ...item, size: clamp(next, min, max) };
}

/**
 * Welches Element liegt unter dem Finger? Geprüft wird von oben nach unten
 * (zuletzt hinzugefügt liegt oben). Die Trefferfläche ist grosszügig, damit
 * kleine Elemente mit dem Finger gut zu greifen sind.
 */
export function hitTest(
  items: readonly OverlayItem[],
  point: { x: number; y: number },
  canvasAspect: number,
): OverlayItem | null {
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    const glyphs = item.kind === 'sticker' ? 1 : Math.max(1, [...item.text].length);
    const halfWidth = Math.max(0.08, Math.min(0.5, (glyphs * item.size * 0.6) / 2));
    // Höhe in Einheiten der Bildhöhe umrechnen (size bezieht sich auf die Breite).
    const halfHeight = Math.max(0.05, item.size * 0.8 * canvasAspect);
    if (Math.abs(point.x - item.x) <= halfWidth && Math.abs(point.y - item.y) <= halfHeight) {
      return item;
    }
  }
  return null;
}
