/**
 * Das DayShot-Zeichen als SVG, berechnet aus Geometrie statt gezeichnet.
 *
 * Idee: Kalenderblatt trifft Kamerablende. Ein Objektivring mit sechs
 * geschwungenen Blendenlamellen, in der Mitte eine Sonne (der Tag), oben zwei
 * Kalenderringe. Die Lamellen sind eine eigene Ebene, damit die App sie
 * drehen kann. Dasselbe Zeichen dient als App-Icon.
 */
export type LogoColors = {
  /** Grundfarbe des Rings */
  base: string;
  /** Farbe der Lamellen (meist Weiss oder sehr hell) */
  blade: string;
  /** Farbe der Sonne in der Mitte */
  sun: string;
  /** Farbe der Kalenderringe */
  rings: string;
};

const VIEW = 100;
const C = VIEW / 2;
const OUTER = 34; // Innenrand des Objektivrings
const INNER = 10.5; // Radius der sechseckigen Öffnung
const BLADES = 6;
const SWIRL = 62; // Grad, um die der äussere Lamellenrand verdreht ist

const round = (n: number) => Math.round(n * 100) / 100;
const point = (radius: number, deg: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return `${round(C + radius * Math.cos(rad))} ${round(C + radius * Math.sin(rad))}`;
};

/** Pfade der sechs Lamellen. Zusammen füllen sie den Kreis bis auf die Öffnung. */
export function bladePaths(): string[] {
  const step = 360 / BLADES;
  return Array.from({ length: BLADES }, (_, i) => {
    const a = i * step;
    const b = a + step;
    return [
      `M ${point(INNER, a)}`,
      `L ${point(INNER, b)}`,
      `L ${point(OUTER, b + SWIRL)}`,
      `A ${OUTER} ${OUTER} 0 0 0 ${point(OUTER, a + SWIRL)}`,
      'Z',
    ].join(' ');
  });
}

/** Nur die Lamellen-Ebene (dreht sich in der App). */
export function bladesSvg(colors: Pick<LogoColors, 'blade' | 'base'>): string {
  // Abwechselnd hell und etwas dunkler, mit Kanten in der Grundfarbe: So liest
  // man jede Lamelle einzeln und erkennt die Drehung.
  const opacities = [1, 0.62, 0.9, 0.55, 0.82, 0.48];
  const paths = bladePaths()
    .map(
      (d, i) =>
        `<path d="${d}" fill="${colors.blade}" fill-opacity="${opacities[i]}" stroke="${colors.base}" stroke-width="1.8" stroke-linejoin="round"/>`,
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW} ${VIEW}">${paths}</svg>`;
}

/** Feste Ebene: Ring, Kalenderringe und Sonne. */
export function frameSvg(colors: LogoColors, options: { background?: string } = {}): string {
  const rays = Array.from({ length: 8 }, (_, i) => {
    const deg = i * 45;
    return `<line x1="${point(6.2, deg).split(' ')[0]}" y1="${point(6.2, deg).split(' ')[1]}" x2="${point(8.4, deg).split(' ')[0]}" y2="${point(8.4, deg).split(' ')[1]}" stroke="${colors.sun}" stroke-width="1.6" stroke-linecap="round"/>`;
  }).join('');
  const background = options.background ? `<rect width="${VIEW}" height="${VIEW}" fill="${options.background}"/>` : '';
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW} ${VIEW}">`,
    background,
    // Objektivring: breiter Kreisrand
    `<circle cx="${C}" cy="${C}" r="${OUTER + 5}" fill="none" stroke="${colors.base}" stroke-width="10"/>`,
    `<circle cx="${C}" cy="${C}" r="${OUTER + 9.6}" fill="none" stroke="${colors.rings}" stroke-opacity="0.35" stroke-width="1.2"/>`,
    // Kalenderringe oben
    `<rect x="${C - 17}" y="${C - OUTER - 14}" width="7" height="15" rx="3.5" fill="${colors.rings}"/>`,
    `<rect x="${C + 10}" y="${C - OUTER - 14}" width="7" height="15" rx="3.5" fill="${colors.rings}"/>`,
    // Sonne in der Öffnung
    `<circle cx="${C}" cy="${C}" r="4.4" fill="${colors.sun}"/>`,
    rays,
    '</svg>',
  ].join('');
}

/** Komplettes Zeichen in einer Datei, z. B. für das App-Icon. */
export function fullLogoSvg(colors: LogoColors, background?: string, size = 1024): string {
  const inner = (svg: string) => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${VIEW} ${VIEW}">`,
    background ? `<rect width="${VIEW}" height="${VIEW}" fill="${background}"/>` : '',
    `<circle cx="${C}" cy="${C}" r="${OUTER + 0.5}" fill="${colors.base}"/>`,
    inner(bladesSvg(colors)),
    inner(frameSvg(colors)),
    '</svg>',
  ].join('');
}
