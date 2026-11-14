// Edge Function: RevenueCat meldet Käufe, Verlängerungen und Kündigungen.
// So weiss auch der Server, wer ein Abo hat (z. B. für den Druckrabatt).
//
// Einrichtung: In RevenueCat unter Integrations > Webhooks die URL
// https://<projekt>.supabase.co/functions/v1/revenuecat-webhook eintragen und als
// "Authorization header value" denselben Wert wie das Supabase-Secret
// REVENUECAT_WEBHOOK_AUTH setzen.
// Deploy: npx supabase functions deploy revenuecat-webhook --no-verify-jwt
import { adminClient, json } from '../_shared/admin.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  const expected = Deno.env.get('REVENUECAT_WEBHOOK_AUTH');
  if (!expected) return json(503, { error: 'not_configured' });
  if (req.headers.get('Authorization') !== expected) return json(401, { error: 'unauthorized' });

  const payload = await req.json().catch(() => null);
  const event = payload?.event;
  // Die App meldet sich bei RevenueCat mit der Supabase-Nutzer-ID an.
  const userId: string | undefined = event?.app_user_id;
  if (!event || !userId || !UUID.test(userId)) return json(200, { ignored: true });

  const expiresAt = typeof event.expiration_at_ms === 'number' ? new Date(event.expiration_at_ms) : null;
  const ending = ['EXPIRATION', 'SUBSCRIPTION_PAUSED'].includes(event.type);
  const active = !ending && (expiresAt === null || expiresAt.getTime() > Date.now());

  const { error } = await adminClient().from('subscriptions').upsert({
    user_id: userId,
    active,
    product_id: event.product_id ?? null,
    expires_at: expiresAt?.toISOString() ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) return json(500, { error: error.message });
  return json(200, { ok: true, active });
});
