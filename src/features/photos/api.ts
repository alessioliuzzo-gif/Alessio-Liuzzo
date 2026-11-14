/**
 * Datenzugriffe für Tagesfotos. Die Bilddateien liegen in einem privaten
 * Bucket; angezeigt werden sie über zeitlich begrenzte Links (signierte URLs).
 */
import type { DailyPhoto, PhotoVisibility } from '@/lib/database.types';
import { requireSupabase } from '@/lib/supabase';

const BUCKET = 'photos';
const SIGNED_URL_SECONDS = 60 * 60;

export function photoPath(userId: string, day: string): string {
  return `${userId}/${day}.jpg`;
}

export async function getPhotoForDay(userId: string, day: string): Promise<DailyPhoto | null> {
  const { data, error } = await requireSupabase()
    .from('daily_photos')
    .select('*')
    .eq('user_id', userId)
    .eq('day', day)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Speichert das Foto eines Tages. Gibt es für den Tag schon eines, wird es
 * ersetzt (gleicher Dateiname, gleiche Zeile).
 */
export async function saveDailyPhoto(input: {
  userId: string;
  day: string;
  jpeg: Uint8Array;
  visibility: PhotoVisibility;
}): Promise<void> {
  const client = requireSupabase();
  const path = photoPath(input.userId, input.day);

  const upload = await client.storage
    .from(BUCKET)
    .upload(path, input.jpeg, { contentType: 'image/jpeg', upsert: true });
  if (upload.error) throw upload.error;

  const existing = await getPhotoForDay(input.userId, input.day);
  const result = existing
    ? await client.from('daily_photos').update({ visibility: input.visibility }).eq('id', existing.id)
    : await client
        .from('daily_photos')
        .insert({ day: input.day, storage_path: path, visibility: input.visibility });
  if (result.error) throw result.error;
}

export async function setPhotoVisibility(id: string, visibility: PhotoVisibility): Promise<void> {
  const { error } = await requireSupabase().from('daily_photos').update({ visibility }).eq('id', id);
  if (error) throw error;
}

export async function deleteDailyPhoto(photo: Pick<DailyPhoto, 'id' | 'storage_path'>): Promise<void> {
  const client = requireSupabase();
  // Zuerst die Zeile: Danach ist das Foto für niemanden mehr sichtbar, selbst
  // wenn das Löschen der Datei scheitern sollte.
  const { error } = await client.from('daily_photos').delete().eq('id', photo.id);
  if (error) throw error;
  const removal = await client.storage.from(BUCKET).remove([photo.storage_path]);
  if (removal.error) throw removal.error;
}

/** Zeitlich begrenzter Link zur Bilddatei. Der Server prüft dabei die Zugriffsregeln. */
export async function signedPhotoUrl(storagePath: string): Promise<string> {
  const { data, error } = await requireSupabase()
    .storage.from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_SECONDS);
  if (error) throw error;
  return data.signedUrl;
}
