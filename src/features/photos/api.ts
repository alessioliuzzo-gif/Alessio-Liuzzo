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

/** Pfad des kleinen Vorschaubilds zu einem Tagesfoto. */
export function thumbPath(storagePath: string): string {
  return storagePath.replace(/\.jpg$/, '_thumb.jpg');
}

/** Alle eigenen Tagesfotos (nur die Zeilen, keine Bilddateien), neueste zuerst. */
export async function listOwnPhotos(userId: string): Promise<DailyPhoto[]> {
  const { data, error } = await requireSupabase()
    .from('daily_photos')
    .select('*')
    .eq('user_id', userId)
    .order('day', { ascending: false })
    .limit(5000);
  if (error) throw error;
  return data;
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
  thumbnail: Uint8Array;
  visibility: PhotoVisibility;
}): Promise<void> {
  const client = requireSupabase();
  const path = photoPath(input.userId, input.day);
  const options = { contentType: 'image/jpeg', upsert: true };

  const [upload, thumb] = await Promise.all([
    client.storage.from(BUCKET).upload(path, input.jpeg, options),
    client.storage.from(BUCKET).upload(thumbPath(path), input.thumbnail, options),
  ]);
  if (upload.error) throw upload.error;
  if (thumb.error) throw thumb.error;

  const existing = await getPhotoForDay(input.userId, input.day);
  const result = existing
    ? await client
        .from('daily_photos')
        .update({ visibility: input.visibility })
        .eq('id', existing.id)
    : await client
        .from('daily_photos')
        .insert({ day: input.day, storage_path: path, visibility: input.visibility });
  if (result.error) throw result.error;
  forgetThumbUrl(path);
}

export async function setPhotoVisibility(id: string, visibility: PhotoVisibility): Promise<void> {
  const { error } = await requireSupabase()
    .from('daily_photos')
    .update({ visibility })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteDailyPhoto(
  photo: Pick<DailyPhoto, 'id' | 'storage_path'>,
): Promise<void> {
  const client = requireSupabase();
  // Zuerst die Zeile: Danach ist das Foto für niemanden mehr sichtbar, selbst
  // wenn das Löschen der Datei scheitern sollte.
  const { error } = await client.from('daily_photos').delete().eq('id', photo.id);
  if (error) throw error;
  const removal = await client.storage
    .from(BUCKET)
    .remove([photo.storage_path, thumbPath(photo.storage_path)]);
  forgetThumbUrl(photo.storage_path);
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

// Signierte Links gelten eine Stunde. Wir merken sie uns etwas kürzer, damit
// der Kalender beim Blättern nicht jedes Mal neu anfragen muss.
const urlCache = new Map<string, { url: string; expires: number }>();
const CACHE_MS = (SIGNED_URL_SECONDS - 300) * 1000;

/** Links zu den Vorschaubildern mehrerer Fotos. Ergebnis: Pfad des Fotos -> Link. */
export async function signedThumbUrls(
  storagePaths: readonly string[],
): Promise<Map<string, string>> {
  const now = Date.now();
  const result = new Map<string, string>();
  const missing: string[] = [];
  for (const path of storagePaths) {
    const cached = urlCache.get(path);
    if (cached && cached.expires > now) result.set(path, cached.url);
    else missing.push(path);
  }
  if (missing.length > 0) {
    const { data, error } = await requireSupabase()
      .storage.from(BUCKET)
      .createSignedUrls(missing.map(thumbPath), SIGNED_URL_SECONDS);
    if (error) throw error;
    data.forEach((entry, index) => {
      if (!entry.signedUrl) return;
      urlCache.set(missing[index], { url: entry.signedUrl, expires: now + CACHE_MS });
      result.set(missing[index], entry.signedUrl);
    });
  }
  return result;
}

/** Nach dem Ersetzen oder Löschen eines Fotos darf der alte Link nicht weiterleben. */
export function forgetThumbUrl(storagePath: string): void {
  urlCache.delete(storagePath);
}
