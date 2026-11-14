// Gemeinsame Helfer für Edge Functions.
import { createClient } from 'npm:@supabase/supabase-js@2';

export function adminClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

/** Liest einen Wert aus app_config (auch interne Werte, weil mit service_role). */
export async function config<T>(key: string, fallback: T): Promise<T> {
  const { data } = await adminClient().from('app_config').select('value').eq('key', key).maybeSingle();
  return (data?.value as T) ?? fallback;
}
