/**
 * Fotofilter als Farbmatrizen. Reine Mathematik ohne UI, darum gut testbar.
 *
 * Eine Farbmatrix hat 4 Zeilen (Rot, Grün, Blau, Alpha) mit je 5 Werten:
 * neuer Wert = r*R + g*G + b*B + a*A + Verschiebung. Farben laufen von 0 bis 1.
 */
export type ColorMatrix = readonly number[]; // 20 Werte

/** Woher ein Effekt kommt: gratis, durch einen vollen Monat freigeschaltet oder im Abo. */
export type Unlock = 'free' | 'reward' | 'premium';

export const IDENTITY: ColorMatrix = [
  1, 0, 0, 0, 0,
  0, 1, 0, 0, 0,
  0, 0, 1, 0, 0,
  0, 0, 0, 1, 0,
];

// Gewichte, mit denen das Auge Helligkeit wahrnimmt (Grün wirkt am hellsten).
const LUMA = [0.2126, 0.7152, 0.0722] as const;

/** 0 = Schwarzweiss, 1 = unverändert, über 1 = kräftiger. */
export function saturation(s: number): ColorMatrix {
  const [r, g, b] = LUMA.map((w) => w * (1 - s));
  return [
    r + s, g, b, 0, 0,
    r, g + s, b, 0, 0,
    r, g, b + s, 0, 0,
    0, 0, 0, 1, 0,
  ];
}

/** 1 = unverändert. Dreht um das mittlere Grau, damit das Bild nicht heller oder dunkler wird. */
export function contrast(c: number): ColorMatrix {
  const offset = (1 - c) / 2;
  return [
    c, 0, 0, 0, offset,
    0, c, 0, 0, offset,
    0, 0, c, 0, offset,
    0, 0, 0, 1, 0,
  ];
}

/** Verstärkt oder dämpft einzelne Farbkanäle, z. B. für warme oder kühle Töne. */
export function tint(r: number, g: number, b: number): ColorMatrix {
  return [
    r, 0, 0, 0, 0,
    0, g, 0, 0, 0,
    0, 0, b, 0, 0,
    0, 0, 0, 1, 0,
  ];
}

/** Hebt die dunklen Stellen an: der ausgewaschene Look alter Abzüge. */
export function fade(amount: number): ColorMatrix {
  const scale = 1 - amount;
  return [
    scale, 0, 0, 0, amount,
    0, scale, 0, 0, amount,
    0, 0, scale, 0, amount,
    0, 0, 0, 1, 0,
  ];
}

const SEPIA: ColorMatrix = [
  0.393, 0.769, 0.189, 0, 0,
  0.349, 0.686, 0.168, 0, 0,
  0.272, 0.534, 0.131, 0, 0,
  0, 0, 0, 1, 0,
];

/**
 * Verkettet Matrizen: zuerst `first`, darauf `second`.
 * Entspricht der Matrixmultiplikation second × first mit der Verschiebung als 5. Spalte.
 */
export function compose(first: ColorMatrix, second: ColorMatrix): ColorMatrix {
  const out = new Array<number>(20).fill(0);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      let sum = col === 4 ? second[row * 5 + 4] : 0;
      for (let k = 0; k < 4; k++) sum += second[row * 5 + k] * first[k * 5 + col];
      out[row * 5 + col] = sum;
    }
  }
  return out;
}

/** Wendet eine Matrix auf eine Farbe an (Werte 0 bis 1) und begrenzt das Ergebnis. */
export function applyMatrix(
  m: ColorMatrix,
  [r, g, b, a]: readonly [number, number, number, number],
): [number, number, number, number] {
  const row = (i: number) =>
    Math.min(1, Math.max(0, m[i] * r + m[i + 1] * g + m[i + 2] * b + m[i + 3] * a + m[i + 4]));
  return [row(0), row(5), row(10), row(15)];
}

export type FilterId = 'original' | 'mono' | 'sepia' | 'warm' | 'cool' | 'vivid' | 'fade' | 'noir';

export type PhotoFilter = { id: FilterId; matrix: ColorMatrix; unlock: Unlock };

export const FILTERS: readonly PhotoFilter[] = [
  { id: 'original', matrix: IDENTITY, unlock: 'free' },
  { id: 'vivid', matrix: compose(saturation(1.35), contrast(1.08)), unlock: 'free' },
  { id: 'warm', matrix: compose(tint(1.08, 1.0, 0.88), saturation(1.1)), unlock: 'free' },
  { id: 'cool', matrix: compose(tint(0.92, 1.0, 1.1), saturation(0.95)), unlock: 'free' },
  { id: 'mono', matrix: saturation(0), unlock: 'free' },
  { id: 'sepia', matrix: SEPIA, unlock: 'free' },
  { id: 'fade', matrix: compose(saturation(0.8), fade(0.12)), unlock: 'reward' },
  { id: 'noir', matrix: compose(saturation(0), contrast(1.45)), unlock: 'reward' },
];

export function getFilter(id: FilterId): PhotoFilter {
  return FILTERS.find((filter) => filter.id === id) ?? FILTERS[0];
}
