/**
 * Entdecken-Feed: automatisch befüllte Fakten und News mit Kommentaren.
 */
import { getProfiles } from '@/features/social/api';
import type { FeedComment, FeedItem, Profile } from '@/lib/database.types';
import { requireSupabase } from '@/lib/supabase';

export type DiscoverEntry = { item: FeedItem; author: Profile | null };

/** Automatische Fakten und Beiträge von Nutzern in einer Sprache, neueste zuerst. */
export async function listFeedItems(lang: string): Promise<DiscoverEntry[]> {
  const { data, error } = await requireSupabase()
    .from('feed_items')
    .select('*')
    .eq('lang', lang)
    .order('published_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(60);
  if (error) throw error;
  const authors = await getProfiles(
    data.map((item) => item.user_id).filter((id): id is string => Boolean(id)),
  );
  return data.map((item) => ({
    item,
    author: item.user_id ? (authors.get(item.user_id) ?? null) : null,
  }));
}

export const POST_TITLE_MAX = 80;
export const POST_BODY_MAX = 500;

/** Teilt einen eigenen Beitrag. Wirft 'post_limit_reached', wenn das Tageslimit erreicht ist. */
export async function createPost(lang: string, title: string, body: string): Promise<void> {
  const { error } = await requireSupabase()
    .from('feed_items')
    .insert({ kind: 'post', lang, title: title.trim(), body: body.trim() || null });
  if (error)
    throw new Error(
      error.message.includes('post_limit_reached') ? 'post_limit_reached' : error.message,
    );
}

export async function deletePost(id: string): Promise<void> {
  const { error } = await requireSupabase().from('feed_items').delete().eq('id', id);
  if (error) throw error;
}

export async function getFeedItem(id: string): Promise<FeedItem | null> {
  const { data, error } = await requireSupabase()
    .from('feed_items')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Anzahl Kommentare pro Eintrag. */
export async function countComments(itemIds: readonly string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (itemIds.length === 0) return counts;
  const { data, error } = await requireSupabase()
    .from('feed_comments')
    .select('item_id')
    .in('item_id', [...itemIds]);
  if (error) throw error;
  for (const row of data) counts.set(row.item_id, (counts.get(row.item_id) ?? 0) + 1);
  return counts;
}

export type CommentWithAuthor = { comment: FeedComment; author: Profile | null };

export async function listComments(itemId: string): Promise<CommentWithAuthor[]> {
  const { data, error } = await requireSupabase()
    .from('feed_comments')
    .select('*')
    .eq('item_id', itemId)
    .order('created_at')
    .limit(200);
  if (error) throw error;
  const authors = await getProfiles(data.map((comment) => comment.user_id));
  return data.map((comment) => ({ comment, author: authors.get(comment.user_id) ?? null }));
}

export async function addComment(itemId: string, body: string): Promise<void> {
  const { error } = await requireSupabase()
    .from('feed_comments')
    .insert({ item_id: itemId, body: body.trim() });
  if (error) throw error;
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await requireSupabase().from('feed_comments').delete().eq('id', id);
  if (error) throw error;
}
