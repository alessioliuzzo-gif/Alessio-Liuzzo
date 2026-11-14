// Erzeugt eine kleine Webseite mit den Rechtstexten (für die Store-Einträge).
// Aufruf: npx tsx scripts/legal/build-site.ts web-legal
import { mkdirSync, writeFileSync } from 'node:fs';

import { privacyDe, termsDe } from '../../src/features/legal/de';
import { privacyEn, termsEn } from '../../src/features/legal/en';
import type { LegalDocument } from '../../src/features/legal/types';

const out = process.argv[2] ?? 'web-legal';
mkdirSync(out, { recursive: true });

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const page = (title: string, body: string, lang: string) => `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · DayShot</title>
<style>
:root{--bg:#FAF4EA;--fg:#2B2622;--muted:#6F6358;--accent:#B5472F;--card:#FFFDF8}
@media (prefers-color-scheme:dark){:root{--bg:#1B1714;--fg:#F3ECE3;--muted:#BFB2A3;--accent:#FF8A6B;--card:#25201C}}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 -apple-system,Segoe UI,Roboto,sans-serif}
main{max-width:760px;margin:0 auto;padding:32px 16px 64px}
h1{font-family:Georgia,serif;font-size:2rem;margin:.2em 0}
h2{font-size:1.15rem;margin-top:2em}
a{color:var(--accent)} .muted{color:var(--muted)} nav{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:24px}
</style></head><body><main>
<nav><a href="index.html">DayShot</a><a href="privacy.html">Datenschutz</a><a href="terms.html">Nutzungsbedingungen</a><a href="privacy-en.html">Privacy (EN)</a><a href="terms-en.html">Terms (EN)</a></nav>
${body}</main></body></html>`;

const render = (doc: LegalDocument, lang: string) =>
  page(
    doc.title,
    `<h1>${esc(doc.title)}</h1><p class="muted">${esc(doc.updated)}</p><p>${esc(doc.intro)}</p>` +
      doc.sections
        .map((s) => `<h2>${esc(s.heading)}</h2>${s.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}`)
        .join(''),
    lang,
  );

writeFileSync(`${out}/privacy.html`, render(privacyDe, 'de'));
writeFileSync(`${out}/terms.html`, render(termsDe, 'de'));
writeFileSync(`${out}/privacy-en.html`, render(privacyEn, 'en'));
writeFileSync(`${out}/terms-en.html`, render(termsEn, 'en'));
writeFileSync(
  `${out}/index.html`,
  page(
    'DayShot',
    `<h1>DayShot</h1><p>Ein Foto pro Tag. Dein Jahr als Kalender.</p><p>One photo a day. Your year as a calendar.</p>
<p class="muted">Support: ${esc(privacyDe.sections[0].paragraphs[0].replace('Verantwortlich für die Datenbearbeitung ist: ', ''))}</p>`,
    'de',
  ),
);
console.log('ok', out);
