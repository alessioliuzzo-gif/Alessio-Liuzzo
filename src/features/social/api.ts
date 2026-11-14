/**
 * Datenzugriffe für Freunde, Blockieren, Melden und die Foto-Feeds.
 */
import { signedPhotoUrls } from '@/features/photos/api';
import type {
  DailyPhoto,
  Friendship,
  PhotoComment,
  Profile,
  ReportReason,
  ReportTarget,
} from '@/lib/database.types';
import { requireSupabase } from '@/lib/supabase';

import { sanitizeSearch } from './logic';

export async function getProfiles(ids: readonly string[]): Promise<Map<string, Profile>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const { data, error } = await requireSupabase().from('profiles').select('*').in('id', unique);
  if (error) throw error;
  return new Map(data.map((profile) => [profile.id, profile]));
}

export async function searchProfiles(query: string, me: string): Promise<Profile[]> {
  const term = sanitizeSearch(query);
  if (term.length < 2) return [];
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select('*')
    .or(`username.ilike.${term.toLowerCase()}%,display_name.ilike.%${term}%`)
    .neq('id', me)
    .order('username')
    .limit(20);
  if (error) throw error;
  return data;
}

export async function listFriendships(): Promise<Friendship[]> {
  const { data, error } = await requireSupabase().from('friendships').select('*');
  if (error) throw error;
  return data;
}

export async function sendFriendRequest(addresseeId: string): Promise<void> {
  const { error } = await requireSupabase()
    .from('friendships')
    .insert({ addressee_id: addresseeId });
  if (error) throw error;
}

export async function acceptFriendRequest(id: string): Promise<void> {
  const { error } = await requireSupabase()
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', id);
  if (error) throw error;
}

/** Anfrage ablehnen oder zurückziehen, oder eine Freundschaft beenden. */
export async function removeFriendship(id: string): Promise<void> {
  const { error } = await requireSupabase().from('friendships').delete().eq('id', id);
  if (error) throw error;
}

export async function listBlockedIds(): Promise<string[]> {
  const { data, error } = await requireSupabase().from('blocks').select('blocked_id');
  if (error) throw error;
  return data.map((row) => row.blocked_id);
}

export async function blockUser(userId: string): Promise<void> {
  const { error } = await requireSupabase().from('blocks').insert({ blocked_id: userId });
  // 23505 = schon blockiert; das ist kein Fehler.
  if (error && error.code !== '23505') throw error;
}

export async function unblockUser(userId: string): Promise<void> {
  const { error } = await requireSupabase().from('blocks').delete().eq('blocked_id', userId);
  if (error) throw error;
}

export async function reportContent(
  targetType: ReportTarget,
  targetId: string,
  reason: ReportReason,
): Promise<void> {
  const { error } = await requireSupabase()
    .from('reports')
    .insert({ target_type: targetType, target_id: targetId, reason });
  // 23505 = bereits gemeldet; für den Nutzer zählt das als Erfolg.
  if (error && error.code !== '23505') throw error;
}

export type FeedPhoto = { photo: DailyPhoto; author: Profile | null; url: string | null };

async function withAuthorsAndUrls(photos: DailyPhoto[]): Promise<FeedPhoto[]> {
  const [authors, urls] = await Promise.all([
    getProfiles(photos.map((photo) => photo.user_id)),
    signedPhotoUrls(photos.map((photo) => photo.storage_path)),
  ]);
  return photos.map((photo) => ({
    photo,
    author: authors.get(photo.user_id) ?? null,
    url: urls.get(photo.storage_path) ?? null,
  }));
}

const FEED_LIMIT = 40;

/** Tagesfotos der Freunde, neueste zuerst. Die Datenbank liefert nur, was ich sehen darf. */
export async function listFriendFeed(friends: readonly string[]): Promise<FeedPhoto[]> {
  if (friends.length === 0) return [];
  const { data, error } = await requireSupabase()
    .from('daily_photos')
    .select('*')
    .in('user_id', [...friends])
    .order('day', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(FEED_LIMIT);
  if (error) throw error;
  return withAuthorsAndUrls(data);
}

/** Öffentliche Tagesfotos aller Nutzer ausser mir, neueste zuerst. */
export async function listPublicFeed(me: string): Promise<FeedPhoto[]> {
  const { data, error } = await requireSupabase()
    .from('daily_photos')
    .select('*')
    .eq('visibility', 'public')
    .neq('user_id', me)
    .order('day', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(FEED_LIMIT);
  if (error) throw error;
  return withAuthorsAndUrls(data);
}

// ---------------------------------------------------------------------------
// Kommentare zu Tagesfotos
// ---------------------------------------------------------------------------
export type PhotoCommentWithAuthor = { comment: PhotoComment; author: Profile | null };

export async function countPhotoComments(
  photoIds: readonly string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (photoIds.length === 0) return counts;
  const { data, error } = await requireSupabase()
    .from('photo_comments')
    .select('photo_id')
    .in('photo_id', [...photoIds]);
  if (error) throw error;
  for (const row of data) counts.set(row.photo_id, (counts.get(row.photo_id) ?? 0) + 1);
  return counts;
}

export async function listPhotoComments(photoId: string): Promise<PhotoCommentWithAuthor[]> {
  const { data, error } = await requireSupabase()
    .from('photo_comments')
    .select('*')
    .eq('photo_id', photoId)
    .order('created_at')
    .limit(200);
  if (error) throw error;
  const authors = await getProfiles(data.map((comment) => comment.user_id));
  return data.map((comment) => ({ comment, author: authors.get(comment.user_id) ?? null }));
}

export async function addPhotoComment(photoId: string, body: string): Promise<void> {
  const { error } = await requireSupabase()
    .from('photo_comments')
    .insert({ photo_id: photoId, body: body.trim() });
  if (error) throw error;
}

export async function deletePhotoComment(id: string): Promise<void> {
  const { error } = await requireSupabase().from('photo_comments').delete().eq('id', id);
  if (error) throw error;
}

/** Ein einzelnes Foto mit Urheber und Bildlink (für die Kommentar-Ansicht). */
export async function getFeedPhoto(photoId: string): Promise<FeedPhoto | null> {
  const { data, error } = await requireSupabase()
    .from('daily_photos')
    .select('*')
    .eq('id', photoId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return (await withAuthorsAndUrls([data]))[0];
}
