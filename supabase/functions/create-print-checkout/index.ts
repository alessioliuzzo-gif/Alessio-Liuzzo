// Edge Function: legt einen Druckauftrag an und startet die Zahlung bei Stripe.
// Der Preis kommt aus app_config, nie aus der App. Abonnenten erhalten Rabatt.
//
// Secrets: STRIPE_SECRET_KEY (sk_test_... oder sk_live_...)
// Deploy: npx supabase functions deploy create-print-checkout
import { adminClient, config, cors, json } from '../_shared/admin.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeKey) return json(503, { error: 'not_configured' });

  const admin = adminClient();
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  const { data: auth } = token ? await admin.auth.getUser(token) : { data: { user: null } };
  const user = auth.user;
  if (!user) return json(401, { error: 'not_authenticated' });

  if (!(await config<boolean>('print_enabled', false))) return json(403, { error: 'print_disabled' });

  const body = await req.json().catch(() => ({}));
  const startMonth = String(body.start_month ?? '');
  const returnUrl = String(body.return_url ?? '');
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(startMonth)) return json(400, { error: 'invalid_month' });
  if (!/^(dayshot|exp|https?):\/\//.test(returnUrl)) return json(400, { error: 'invalid_return_url' });

  const price = Number(await config<number>('print_price_chf', 29.9));
  const { data: sub } = await admin.from('subscriptions').select('active, expires_at').eq('user_id', user.id).maybeSingle();
  const premium = Boolean(sub?.active) && (!sub?.expires_at || new Date(sub.expires_at) > new Date());
  const discount = premium ? Number(await config<number>('print_premium_discount_percent', 0)) : 0;
  const amount = Math.round(price * (100 - discount)) / 100;
  const countries = await config<string[]>('print_ship_countries', ['CH']);

  const { data: order, error } = await admin
    .from('print_orders')
    .insert({ user_id: user.id, start_month: startMonth, amount_chf: amount, discount_percent: discount })
    .select('id')
    .single();
  if (error) return json(500, { error: error.message });

  // Stripe Checkout: Stripe sammelt Lieferadresse und Zahlung auf seiner Seite.
  const form = new URLSearchParams({
    mode: 'payment',
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'chf',
    'line_items[0][price_data][unit_amount]': String(Math.round(amount * 100)),
    'line_items[0][price_data][product_data][name]': `DayShot Wandkalender A4 (ab ${startMonth})`,
    success_url: `${returnUrl}?order=${order.id}&status=success`,
    cancel_url: `${returnUrl}?order=${order.id}&status=cancel`,
    client_reference_id: order.id,
    customer_email: user.email ?? '',
    'metadata[order_id]': order.id,
    'phone_number_collection[enabled]': 'true',
  });
  countries.forEach((country, i) => form.append(`shipping_address_collection[allowed_countries][${i}]`, country));

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  const session = await response.json();
  if (!response.ok) {
    await admin.from('print_orders').update({ status: 'failed', error: session?.error?.message ?? 'stripe' }).eq('id', order.id);
    return json(502, { error: 'stripe_failed' });
  }
  await admin.from('print_orders').update({ stripe_session_id: session.id }).eq('id', order.id);
  return json(200, { url: session.url, order_id: order.id, amount, discount });
});
