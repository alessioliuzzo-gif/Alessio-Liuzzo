// Edge Function: füllt den Entdecken-Feed automatisch.
//
// Quellen:
// 1. Wikipedia "An diesem Tag" (frei nutzbar unter CC BY-SA, mit Quellenangabe
//    und Link). Pro Sprache einige Ereignisse des heutigen Datums.
// 2. Zusätzliche RSS-Quellen aus app_config "feed_sources". Davon werden nur
//    Titel und Link übernommen, nie der Artikeltext. Nur Quellen eintragen,
//    die das erlauben (freie Lizenz oder Partnerschaft).
//
// Aufruf: täglich durch einen geplanten Datenbank-Job (pg_cron). Geschützt
// durch ein gemeinsames Geheimnis im Header "x-cron-secret".
//
// Deploy: npx supabase functions deploy refresh-feed --no-verify-jwt
import { createClient } from 'npm:@supabase/supabase-js@2';

const LANGS = ['de', 'en', 'fr', 'it'] as const;
const FACTS_PER_LANG = 5;
const NEWS_PER_SOURCE = 5;
const KEEP_DAYS = 60;
const USER_AGENT = 'DayShotFeedBot/1.0 (Supabase Edge Function)';

type FeedRow = {
  kind: 'fact' | 'news';
  lang: string;
  title: string;
  body: string | null;
  source_name: string;
  source_url: string;
  image_url: string | null;
  published_on: string;
  external_id: string;
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

async function wikipediaFacts(lang: string, today: Date): Promise<FeedRow[]> {
  const mm = String(today.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(today.getUTCDate()).padStart(2, '0');
  const url = `https://api.wikimedia.org/feed/v1/wikipedia/${lang}/onthisday/selected/${mm}/${dd}`;
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
  if (!response.ok) throw new Error(`wikipedia ${lang}: ${response.status}`);
  const data = await response.json();
  const events: any[] = Array.isArray(data?.selected) ? data.selected : [];
  return events
    .filter((event) => typeof event?.text === 'string' && typeof event?.year === 'number')
    .filter((event) => event.pages?.[0]?.content_urls?.mobile?.page)
    .slice(0, FACTS_PER_LANG)
    .map((event) => ({
      kind: 'fact' as const,
      lang,
      title: String(event.year),
      // Wikipedia setzt weiche Trennzeichen in lange Wörter; die stören in der App.
      body: event.text.replace(/\u00ad/g, '').slice(0, 600),
      source_name: 'Wikipedia',
      source_url: event.pages[0].content_urls.mobile.page,
      image_url: event.pages[0].thumbnail?.source ?? null,
      published_on: today.toISOString().slice(0, 10),
      external_id: `otd-${mm}-${dd}-${event.year}-${event.pages[0].pageid ?? event.pages[0].title}`,
    }));
}

function decodeEntities(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .trim();
}

async function rssHeadlines(source: { name: string; url: string; lang: string }, today: Date): Promise<FeedRow[]> {
  const response = await fetch(source.url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(`rss ${source.name}: ${response.status}`);
  const xml = await response.text();
  const rows: FeedRow[] = [];
  for (const match of xml.matchAll(/<item[\s>][\s\S]*?<\/item>/g)) {
    const item = match[0];
    const title = decodeEntities(item.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] ?? '');
    const link = decodeEntities(item.match(/<link[^>]*>([\s\S]*?)<\/link>/)?.[1] ?? '');
    if (!title || !/^https:\/\//.test(link)) continue;
    rows.push({
      kind: 'news',
      lang: source.lang,
      title: title.slice(0, 200),
      body: null, // bewusst kein Artikeltext
      source_name: source.name.slice(0, 60),
      source_url: link,
      image_url: null,
      published_on: today.toISOString().slice(0, 10),
      external_id: link.slice(0, 300),
    });
    if (rows.length >= NEWS_PER_SOURCE) break;
  }
  return rows;
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET');
  if (!secret || req.headers.get('x-cron-secret') !== secret) return json(401, { error: 'unauthorized' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const today = new Date();
  const rows: FeedRow[] = [];
  const errors: string[] = [];

  for (const lang of LANGS) {
    try {
      rows.push(...(await wikipediaFacts(lang, today)));
    } catch (error) {
      errors.push(String(error));
    }
  }

  const { data: config } = await admin.from('app_config').select('value').eq('key', 'feed_sources').maybeSingle();
  const sources = Array.isArray(config?.value) ? config.value : [];
  for (const source of sources) {
    const valid =
      typeof source?.name === 'string' &&
      typeof source?.url === 'string' &&
      /^https:\/\//.test(source.url) &&
      (LANGS as readonly string[]).includes(source?.lang);
    if (!valid) continue;
    try {
      rows.push(...(await rssHeadlines(source, today)));
    } catch (error) {
      errors.push(String(error));
    }
  }

  let inserted = 0;
  if (rows.length > 0) {
    const { data, error } = await admin
      .from('feed_items')
      .upsert(rows, { onConflict: 'kind,lang,external_id', ignoreDuplicates: true })
      .select('id');
    if (error) errors.push(error.message);
    inserted = data?.length ?? 0;
  }

  const cutoff = new Date(today.getTime() - KEEP_DAYS * 86400000).toISOString().slice(0, 10);
  await admin.from('feed_items').delete().lt('published_on', cutoff);

  return json(errors.length > 0 && inserted === 0 ? 502 : 200, { fetched: rows.length, inserted, errors });
});
