// Edge Function: löscht das Konto des aufrufenden Nutzers.
//
// Warum eine Edge Function? Ein Konto löschen darf nur der Server mit dem
// geheimen service_role Key. Dieser Key liegt nie in der App. Die Funktion
// prüft zuerst das Login-Token und löscht nur das Konto, dem es gehört.
//
// Deploy: npx supabase functions deploy delete-account
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Buckets mit Nutzerdateien im Ordner "<user-id>/". Spätere Phasen ergänzen hier
// den Bucket der Tagesfotos.
const USER_BUCKETS = ['avatars', 'photos'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { error: 'not_authenticated' });

  // Beide Werte stellt Supabase jeder Edge Function automatisch bereit.
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // Token beim Auth-Server prüfen: Wem gehört es?
  const { data, error: userError } = await admin.auth.getUser(token);
  if (userError || !data.user) return json(401, { error: 'not_authenticated' });
  const userId = data.user.id;

  // 1. Dateien löschen (Storage hängt nicht an der Datenbank-Kaskade).
  for (const bucket of USER_BUCKETS) {
    for (;;) {
      const { data: files, error } = await admin.storage.from(bucket).list(userId, { limit: 100 });
      if (error) return json(500, { error: 'storage_list_failed' });
      if (!files || files.length === 0) break;
      const paths = files.map((file) => `${userId}/${file.name}`);
      const { error: removeError } = await admin.storage.from(bucket).remove(paths);
      if (removeError) return json(500, { error: 'storage_remove_failed' });
    }
  }

  // 2. Konto löschen. Profile und alle abhängigen Zeilen folgen per "on delete cascade".
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) return json(500, { error: 'delete_failed' });

  return json(200, { deleted: true });
});
