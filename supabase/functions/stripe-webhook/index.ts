// Edge Function: Stripe meldet eine erfolgreiche Zahlung. Danach erzeugen wir
// die Druckdatei (PDF) und geben den Auftrag an Gelato weiter.
//
// Secrets: STRIPE_WEBHOOK_SECRET (whsec_...), GELATO_API_KEY
// Einrichtung: In Stripe unter Developers > Webhooks den Endpunkt
// https://<projekt>.supabase.co/functions/v1/stripe-webhook mit dem Ereignis
// "checkout.session.completed" anlegen.
// Deploy: npx supabase functions deploy stripe-webhook --no-verify-jwt
import { PDFDocument, rgb, StandardFonts } from 'npm:pdf-lib@1.17.1';

import { adminClient, config, json } from '../_shared/admin.ts';

// ---------------------------------------------------------------------------
// Stripe-Signatur prüfen (HMAC-SHA256), damit niemand Zahlungen vortäuschen kann.
// ---------------------------------------------------------------------------
async function verifyStripe(payload: string, header: string | null, secret: string): Promise<boolean> {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]));
  const timestamp = parts.t;
  const signature = header.split(',').filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));
  if (!timestamp || signature.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`));
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return signature.includes(expected);
}

// ---------------------------------------------------------------------------
// Druckdatei: Deckblatt und 12 Monatsseiten mit den Tagesfotos als Raster.
// HINWEIS: Format, Beschnitt und Seitenzahl müssen zur Produktspezifikation
// des gewählten Gelato-Kalenders passen. Vor dem Livegang mit einer
// Testbestellung prüfen.
// ---------------------------------------------------------------------------
const MM = 72 / 25.4;
const PAGE = { width: 210 * MM, height: 297 * MM }; // A4 Hochformat
const MONTHS_DE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const WEEKDAYS_DE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

async function buildCalendarPdf(userId: string, startMonth: string): Promise<Uint8Array> {
  const admin = adminClient();
  const [startYear, startM] = startMonth.split('-').map(Number);
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(startYear, startM - 1 + i, 1));
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
  });
  const from = `${months[0].year}-${String(months[0].month + 1).padStart(2, '0')}-01`;
  const lastMonth = months[11];
  const to = new Date(Date.UTC(lastMonth.year, lastMonth.month + 1, 0)).toISOString().slice(0, 10);

  const { data: photos } = await admin
    .from('daily_photos')
    .select('day, storage_path')
    .eq('user_id', userId)
    .gte('day', from)
    .lte('day', to);
  const byDay = new Map((photos ?? []).map((p) => [p.day, p.storage_path]));

  const pdf = await PDFDocument.create();
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const ink = rgb(0.17, 0.15, 0.13);
  const accent = rgb(0.71, 0.28, 0.18);
  const empty = rgb(0.95, 0.91, 0.85);

  const images = new Map<string, Awaited<ReturnType<typeof pdf.embedJpg>>>();
  async function image(path: string) {
    if (images.has(path)) return images.get(path)!;
    const { data } = await admin.storage.from('photos').download(path);
    if (!data) return null;
    const embedded = await pdf.embedJpg(new Uint8Array(await data.arrayBuffer()));
    images.set(path, embedded);
    return embedded;
  }

  // Deckblatt
  const cover = pdf.addPage([PAGE.width, PAGE.height]);
  cover.drawRectangle({ x: 0, y: 0, width: PAGE.width, height: PAGE.height, color: rgb(0.98, 0.96, 0.92) });
  cover.drawText('DayShot', { x: 20 * MM, y: PAGE.height - 50 * MM, size: 54, font: bold, color: accent });
  const label = `${MONTHS_DE[months[0].month]} ${months[0].year} – ${MONTHS_DE[lastMonth.month]} ${lastMonth.year}`;
  cover.drawText(label, { x: 20 * MM, y: PAGE.height - 65 * MM, size: 18, font: regular, color: ink });
  const coverPhotos = [...byDay.values()].slice(0, 12);
  const cw = (PAGE.width - 40 * MM - 3 * 4 * MM) / 4;
  for (let i = 0; i < coverPhotos.length; i++) {
    const img = await image(coverPhotos[i]);
    if (!img) continue;
    const col = i % 4;
    const row = Math.floor(i / 4);
    cover.drawImage(img, { x: 20 * MM + col * (cw + 4 * MM), y: PAGE.height - 90 * MM - (row + 1) * (cw * 4 / 3 + 4 * MM), width: cw, height: (cw * 4) / 3 });
  }

  // Monatsseiten
  for (const { year, month } of months) {
    const page = pdf.addPage([PAGE.width, PAGE.height]);
    page.drawText(`${MONTHS_DE[month]} ${year}`, { x: 15 * MM, y: PAGE.height - 25 * MM, size: 28, font: bold, color: ink });
    const gap = 2 * MM;
    const cellW = (PAGE.width - 30 * MM - 6 * gap) / 7;
    const cellH = (cellW * 4) / 3; // gleiches Seitenverhältnis wie die Tagesfotos
    const top = PAGE.height - 42 * MM;
    WEEKDAYS_DE.forEach((d, i) => page.drawText(d, { x: 15 * MM + i * (cellW + gap) + 1 * MM, y: top + 2 * MM, size: 9, font: bold, color: ink }));
    const offset = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
    const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    for (let day = 1; day <= days; day++) {
      const index = offset + day - 1;
      const x = 15 * MM + (index % 7) * (cellW + gap);
      const y = top - (Math.floor(index / 7) + 1) * (cellH + gap);
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const path = byDay.get(key);
      const img = path ? await image(path) : null;
      if (img) page.drawImage(img, { x, y, width: cellW, height: cellH });
      else page.drawRectangle({ x, y, width: cellW, height: cellH, color: empty });
      page.drawText(String(day), { x: x + 1.2 * MM, y: y + cellH - 4 * MM, size: 8, font: bold, color: img ? rgb(1, 1, 1) : ink });
    }
  }
  return await pdf.save();
}

async function submitToGelato(order: { id: string }, session: any, fileUrl: string) {
  const apiKey = Deno.env.get('GELATO_API_KEY');
  if (!apiKey) throw new Error('GELATO_API_KEY fehlt');
  const productUid = await config<string>('print_gelato_product_uid', 'NOCH_AUSFUELLEN');
  if (productUid === 'NOCH_AUSFUELLEN') throw new Error('Gelato-Produkt-UID ist in app_config nicht gesetzt');
  const shipping = session.shipping_details ?? session.collected_information?.shipping_details ?? {};
  const address = shipping.address ?? {};
  const [firstName, ...rest] = String(shipping.name ?? 'Kunde').split(' ');
  const response = await fetch('https://order.gelatoapis.com/v4/orders', {
    method: 'POST',
    headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderType: 'order',
      orderReferenceId: order.id,
      customerReferenceId: session.client_reference_id,
      currency: 'CHF',
      items: [{ itemReferenceId: `${order.id}-1`, productUid, files: [{ type: 'default', url: fileUrl }], quantity: 1 }],
      shippingAddress: {
        firstName,
        lastName: rest.join(' ') || '-',
        addressLine1: address.line1 ?? '',
        addressLine2: address.line2 ?? '',
        city: address.city ?? '',
        postCode: address.postal_code ?? '',
        state: address.state ?? '',
        country: address.country ?? 'CH',
        email: session.customer_details?.email ?? '',
        phone: session.customer_details?.phone ?? '',
      },
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Gelato: ${response.status} ${JSON.stringify(result).slice(0, 300)}`);
  return String(result.id ?? '');
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!secret) return json(503, { error: 'not_configured' });
  const payload = await req.text();
  if (!(await verifyStripe(payload, req.headers.get('Stripe-Signature'), secret))) return json(400, { error: 'invalid_signature' });

  const event = JSON.parse(payload);
  if (event.type !== 'checkout.session.completed') return json(200, { ignored: event.type });
  const session = event.data.object;
  const admin = adminClient();
  const { data: order } = await admin.from('print_orders').select('*').eq('stripe_session_id', session.id).maybeSingle();
  if (!order) return json(200, { ignored: 'unknown_order' });
  if (order.status !== 'pending') return json(200, { ignored: 'already_processed' });

  await admin.from('print_orders').update({ status: 'paid' }).eq('id', order.id);
  try {
    const pdf = await buildCalendarPdf(order.user_id, order.start_month);
    const path = `${order.user_id}/${order.id}.pdf`;
    const upload = await admin.storage.from('print-files').upload(path, pdf, { contentType: 'application/pdf', upsert: true });
    if (upload.error) throw upload.error;
    const { data: signed } = await admin.storage.from('print-files').createSignedUrl(path, 60 * 60 * 24 * 14);
    if (!signed) throw new Error('Kein Link zur Druckdatei');
    const gelatoId = await submitToGelato(order, session, signed.signedUrl);
    await admin.from('print_orders').update({ status: 'submitted', gelato_order_id: gelatoId, error: null }).eq('id', order.id);
  } catch (error) {
    // Bezahlt, aber nicht übermittelt: bleibt sichtbar, damit du manuell nachhelfen kannst.
    await admin.from('print_orders').update({ status: 'failed', error: String(error).slice(0, 500) }).eq('id', order.id);
  }
  return json(200, { ok: true });
});
