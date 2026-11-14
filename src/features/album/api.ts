/**
 * Privates Album: eigene Alben mit Erinnerungen (Foto, Text, Datum, Favorit).
 * Alles hier ist nur für den Besitzer sichtbar; das stellt die Datenbank sicher.
 */
import { requireSupabase } from '@/lib/supabase';

const BUCKET = 'memories';

export type Album = { id: string; title: string; emoji: string; created_at: string };
export type Memory = {
  id: string;
  album_id: string;
  storage_path: string;
  caption: string;
  happened_on: string;
  favorite: boolean;
  created_at: string;
};

export const ALBUM_EMOJIS = [
  '📔',
  '🌍',
  '❤️',
  '🎉',
  '🏖️',
  '🏔️',
  '🐶',
  '🍝',
  '🎓',
  '⚽',
  '🎶',
  '🌸',
] as const;

// Die Tabellen des Albums sind nicht in den handgepflegten Datenbank-Typen
// erfasst; darum ein schlanker, lokal typisierter Zugriff.
const table = (name: 'albums' | 'memories') => requireSupabase().from(name as never);

export async function listAlbums(): Promise<(Album & { count: number; cover: string | null })[]> {
  const [albums, memories] = await Promise.all([
    table('albums').select('*').order('created_at'),
    table('memories')
      .select('album_id, storage_path, happened_on')
      .order('happened_on', { ascending: false }),
  ]);
  if (albums.error) throw albums.error;
  if (memories.error) throw memories.error;
  const rows = (memories.data ?? []) as Pick<Memory, 'album_id' | 'storage_path'>[];
  return ((albums.data ?? []) as Album[]).map((album) => {
    const own = rows.filter((m) => m.album_id === album.id);
    return { ...album, count: own.length, cover: own[0]?.storage_path ?? null };
  });
}

export async function createAlbum(title: string, emoji: string): Promise<void> {
  const { error } = await table('albums').insert({ title: title.trim(), emoji } as never);
  if (error) throw error;
}

export async function deleteAlbum(albumId: string): Promise<void> {
  const memories = await listMemories(albumId);
  if (memories.length > 0) {
    await requireSupabase()
      .storage.from(BUCKET)
      .remove(memories.map((m) => m.storage_path));
  }
  const { error } = await table('albums').delete().eq('id', albumId);
  if (error) throw error;
}

export async function getAlbum(albumId: string): Promise<Album | null> {
  const { data, error } = await table('albums').select('*').eq('id', albumId).maybeSingle();
  if (error) throw error;
  return data as Album | null;
}

export async function listMemories(albumId: string): Promise<Memory[]> {
  const { data, error } = await table('memories')
    .select('*')
    .eq('album_id', albumId)
    .order('happened_on', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Memory[];
}

export async function getMemory(id: string): Promise<Memory | null> {
  const { data, error } = await table('memories').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Memory | null;
}

/** Lädt das Bild hoch und legt die Erinnerung an. Gibt deren ID zurück. */
export async function addMemory(input: {
  userId: string;
  albumId: string;
  jpeg: Uint8Array;
}): Promise<string> {
  const client = requireSupabase();
  const path = `${input.userId}/${input.albumId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const upload = await client.storage
    .from(BUCKET)
    .upload(path, input.jpeg, { contentType: 'image/jpeg' });
  if (upload.error) throw upload.error;
  const { data, error } = await table('memories')
    .insert({ album_id: input.albumId, storage_path: path } as never)
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function updateMemory(
  id: string,
  changes: Partial<Pick<Memory, 'caption' | 'happened_on' | 'favorite'>>,
): Promise<void> {
  const { error } = await table('memories')
    .update(changes as never)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteMemory(memory: Pick<Memory, 'id' | 'storage_path'>): Promise<void> {
  const { error } = await table('memories').delete().eq('id', memory.id);
  if (error) throw error;
  await requireSupabase().storage.from(BUCKET).remove([memory.storage_path]);
}

/** Zeitlich begrenzte Links zu den Bildern. Ergebnis: Pfad -> Link. */
export async function memoryUrls(paths: readonly string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (paths.length === 0) return result;
  const { data, error } = await requireSupabase()
    .storage.from(BUCKET)
    .createSignedUrls([...paths], 3600);
  if (error) throw error;
  data.forEach((entry, i) => entry.signedUrl && result.set(paths[i], entry.signedUrl));
  return result;
}
