/**
 * Reine Logik rund um Freundschaften und Unterhaltungen (ohne Datenbank).
 */
import type { Friendship, Message } from '@/lib/database.types';

export type Relation = 'none' | 'friends' | 'requested' | 'incoming';

/** In welcher Beziehung stehe ich zu einem anderen Nutzer? */
export function relationTo(
  friendships: readonly Friendship[],
  me: string,
  other: string,
): { relation: Relation; friendshipId: string | null } {
  const row = friendships.find(
    (f) =>
      (f.requester_id === me && f.addressee_id === other) ||
      (f.requester_id === other && f.addressee_id === me),
  );
  if (!row) return { relation: 'none', friendshipId: null };
  if (row.status === 'accepted') return { relation: 'friends', friendshipId: row.id };
  return { relation: row.requester_id === me ? 'requested' : 'incoming', friendshipId: row.id };
}

/** IDs aller bestätigten Freunde. */
export function friendIds(friendships: readonly Friendship[], me: string): string[] {
  return friendships
    .filter((f) => f.status === 'accepted')
    .map((f) => (f.requester_id === me ? f.addressee_id : f.requester_id));
}

export type Conversation = { otherId: string; last: Message; unread: number };

/** Fasst Nachrichten zu Unterhaltungen zusammen, die neueste zuerst. */
export function groupConversations(messages: readonly Message[], me: string): Conversation[] {
  const byOther = new Map<string, Conversation>();
  for (const message of messages) {
    const otherId = message.sender_id === me ? message.recipient_id : message.sender_id;
    const unread = message.recipient_id === me && message.read_at === null ? 1 : 0;
    const existing = byOther.get(otherId);
    if (!existing) {
      byOther.set(otherId, { otherId, last: message, unread });
    } else {
      existing.unread += unread;
      if (message.created_at > existing.last.created_at) existing.last = message;
    }
  }
  return [...byOther.values()].sort((a, b) => b.last.created_at.localeCompare(a.last.created_at));
}

/** Bereitet eine Sucheingabe auf. Zeichen mit Sonderbedeutung in der Suche fallen weg. */
export function sanitizeSearch(input: string): string {
  return input
    .trim()
    .replace(/^@/, '')
    .replace(/[%,()\\*]/g, '')
    .slice(0, 30);
}
