// Edge Function: schickt eine Push-Benachrichtigung bei einer neuen Chat-Nachricht.
// Wird vom Datenbank-Trigger messages_notify aufgerufen (Geheimnis im Header).
//
// Deploy: npx supabase functions deploy notify-message --no-verify-jwt
import { createClient } from 'npm:@supabase/supabase-js@2';

const MESSAGES: Record<string, string> = {
  de: 'Neue Nachricht',
  en: 'New message',
  fr: 'Nouveau message',
  it: 'Nuovo messaggio',
};

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET');
  if (!secret || req.headers.get('x-cron-secret') !== secret) return new Response('unauthorized', { status: 401 });

  const { message_id } = await req.json().catch(() => ({}));
  if (typeof message_id !== 'string') return new Response('bad request', { status: 400 });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: message } = await admin.from('messages').select('*').eq('id', message_id).maybeSingle();
  if (!message) return new Response('not found', { status: 404 });

  const [{ data: sender }, { data: tokens }] = await Promise.all([
    admin.from('profiles').select('display_name').eq('id', message.sender_id).maybeSingle(),
    admin.from('push_tokens').select('token').eq('user_id', message.recipient_id),
  ]);
  if (!tokens || tokens.length === 0) return Response.json({ sent: 0 });

  const body = message.body.length > 120 ? `${message.body.slice(0, 117)}…` : message.body;
  const pushes = tokens.map(({ token }) => ({
    to: token,
    title: sender?.display_name ?? MESSAGES.en,
    body,
    sound: 'default',
    data: { url: `/chat/${message.sender_id}` },
  }));

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(pushes),
  });
  const result = await response.json().catch(() => ({}));

  // Ungültige Token (App gelöscht, Push abgeschaltet) aufräumen.
  const tickets: { status?: string; details?: { error?: string } }[] = Array.isArray(result?.data) ? result.data : [];
  const stale = tickets
    .map((ticket, i) => (ticket.details?.error === 'DeviceNotRegistered' ? tokens[i].token : null))
    .filter((token): token is string => token !== null);
  if (stale.length > 0) await admin.from('push_tokens').delete().in('token', stale);

  return Response.json({ sent: pushes.length, removed: stale.length });
});
