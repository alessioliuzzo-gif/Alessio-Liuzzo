/**
 * Ideen-Box: Wünsche für die App einreichen und abstimmen.
 */
import { getProfiles } from '@/features/social/api';
import type { Profile } from '@/lib/database.types';
import { requireSupabase } from '@/lib/supabase';

export type IdeaStatus = 'open' | 'planned' | 'done' | 'declined';
export type Idea = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  status: IdeaStatus;
  vote_count: number;
  created_at: string;
};
export type IdeaEntry = { idea: Idea; author: Profile | null; voted: boolean };

const table = (name: 'ideas' | 'idea_votes') => requireSupabase().from(name as never);

/** Alle Ideen, die beliebtesten zuerst. */
export async function listIdeas(): Promise<IdeaEntry[]> {
  const [ideas, votes] = await Promise.all([
    table('ideas')
      .select('*')
      .order('vote_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100),
    table('idea_votes').select('idea_id'),
  ]);
  if (ideas.error) throw ideas.error;
  if (votes.error) throw votes.error;
  const rows = (ideas.data ?? []) as Idea[];
  const mine = new Set(((votes.data ?? []) as { idea_id: string }[]).map((v) => v.idea_id));
  const authors = await getProfiles(rows.map((idea) => idea.user_id));
  return rows.map((idea) => ({
    idea,
    author: authors.get(idea.user_id) ?? null,
    voted: mine.has(idea.id),
  }));
}

/** Wirft 'idea_limit_reached', wenn das Tageslimit erreicht ist. */
export async function submitIdea(title: string, body: string): Promise<void> {
  const { error } = await table('ideas').insert({
    title: title.trim(),
    body: body.trim(),
  } as never);
  if (error)
    throw new Error(
      error.message.includes('idea_limit_reached') ? 'idea_limit_reached' : error.message,
    );
}

export async function setVote(ideaId: string, voted: boolean): Promise<void> {
  const result = voted
    ? await table('idea_votes').insert({ idea_id: ideaId } as never)
    : await table('idea_votes').delete().eq('idea_id', ideaId);
  // 23505 = schon abgestimmt; zählt als Erfolg.
  if (result.error && result.error.code !== '23505') throw result.error;
}

export async function deleteIdea(id: string): Promise<void> {
  const { error } = await table('ideas').delete().eq('id', id);
  if (error) throw error;
}
