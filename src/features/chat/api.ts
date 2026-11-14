/**
 * Datenzugriffe für den Chat. Neue Nachrichten kommen zusätzlich in Echtzeit
 * über Supabase Realtime (eine offene Verbindung zum Server).
 */
import type { Message } from '@/lib/database.types';
import { requireSupabase } from '@/lib/supabase';

/** Die neuesten Nachrichten aller Unterhaltungen (für die Übersicht). */
export async function listRecentMessages(): Promise<Message[]> {
  const { data, error } = await requireSupabase()
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) throw error;
  return data;
}

export async function listConversation(me: string, other: string): Promise<Message[]> {
  const { data, error } = await requireSupabase()
    .from('messages')
    .select('*')
    .or(
      `and(sender_id.eq.${me},recipient_id.eq.${other}),and(sender_id.eq.${other},recipient_id.eq.${me})`,
    )
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return data.reverse();
}

export async function sendMessage(
  recipientId: string,
  body: string,
  photoId?: string,
): Promise<Message> {
  const { data, error } = await requireSupabase()
    .from('messages')
    .insert({ recipient_id: recipientId, body: body.trim(), photo_id: photoId ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markConversationRead(me: string, other: string): Promise<void> {
  const { error } = await requireSupabase()
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', me)
    .eq('sender_id', other)
    .is('read_at', null);
  if (error) throw error;
}

/**
 * Abonniert neue Nachrichten an mich. Gibt eine Funktion zum Beenden zurück.
 * Der Server schickt nur Zeilen, die ich laut Zugriffsregeln lesen darf.
 */
export function subscribeToIncoming(me: string, onMessage: (message: Message) => void): () => void {
  const client = requireSupabase();
  const channel = client
    .channel(`messages-to-${me}-${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${me}` },
      (payload) => onMessage(payload.new as Message),
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}
