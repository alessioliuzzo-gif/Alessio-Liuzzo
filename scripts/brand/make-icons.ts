// Erzeugt die Icon-SVGs aus dem DayShot-Zeichen.
// Aufruf: npx tsx scripts/brand/make-icons.ts <ordner> && node scripts/brand/render-icons.js <ordner>
import { writeFileSync } from 'node:fs';
import { bladesSvg, frameSvg, fullLogoSvg } from '../../src/features/brand/logo';
const out = process.argv[2];
const warm = { base: '#B5472F', blade: '#FFF4E6', sun: '#F4C542', rings: '#FFF4E6' };
const inner = (svg: string) => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
// Zeichen mit Rand (scale < 1), z. B. für die sichere Zone von Android.
const padded = (colors: typeof warm, scale: number, bg?: string, size = 1024) => {
  const offset = (100 - 100 * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">${bg ? `<rect width="100" height="100" fill="${bg}"/>` : ''}<g transform="translate(${offset} ${offset + 3 * scale}) scale(${scale})">${inner(fullLogoSvg(colors))}</g></svg>`;
};
const mono = { base: '#000000', blade: '#FFFFFF', sun: '#000000', rings: '#000000' };
const files: Record<string, string> = {
  'icon.svg': padded(warm, 0.86, '#2B2622'),
  'android-icon-foreground.svg': padded(warm, 0.6),
  'android-icon-monochrome.svg': padded({ base: '#000000', blade: '#000000', sun: '#000000', rings: '#000000' }, 0.6),
  'splash-icon.svg': padded({ ...warm, rings: '#2B2622' }, 1, undefined, 512),
  'favicon.svg': padded(warm, 0.95, '#2B2622', 96),
};
for (const [name, svg] of Object.entries(files)) writeFileSync(`${out}/${name}`, svg);
void bladesSvg; void frameSvg; void mono;
