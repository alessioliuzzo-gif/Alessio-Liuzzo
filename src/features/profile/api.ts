/**
 * Datenzugriffe rund ums Profil.
 */
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { Profile } from '@/lib/database.types';
import { requireSupabase, supabase } from '@/lib/supabase';

const AVATAR_BUCKET = 'avatars';
const AVATAR_SIZE = 512;

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await requireSupabase().rpc('username_available', {
    candidate: username,
  });
  if (error) throw error;
  return data === true;
}

export async function updateDisplayName(userId: string, displayName: string): Promise<void> {
  const { error } = await requireSupabase()
    .from('profiles')
    .update({ display_name: displayName.trim() })
    .eq('id', userId);
  if (error) throw error;
}

/**
 * Verkleinert das Bild auf dem Gerät und lädt es in den eigenen Ordner hoch.
 * Verkleinern spart Datenvolumen und Speicherplatz.
 */
export async function uploadAvatar(userId: string, localUri: string): Promise<void> {
  const client = requireSupabase();

  const rendered = await ImageManipulator.manipulate(localUri)
    .resize({ width: AVATAR_SIZE, height: AVATAR_SIZE })
    .renderAsync();
  const image = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  const body = await (await fetch(image.uri)).arrayBuffer();

  // Fester Dateiname: ein neues Bild ersetzt das alte, es sammelt sich nichts an.
  const path = `${userId}/avatar.jpg`;
  const upload = await client.storage
    .from(AVATAR_BUCKET)
    .upload(path, body, { contentType: 'image/jpeg', upsert: true });
  if (upload.error) throw upload.error;

  const { error } = await client.from('profiles').update({ avatar_path: path }).eq('id', userId);
  if (error) throw error;
}

/** Öffentliche Adresse des Profilbilds oder null, wenn keines gesetzt ist. */
export function avatarUrl(profile: Pick<Profile, 'avatar_path' | 'updated_at'> | null): string | null {
  if (!supabase || !profile?.avatar_path) return null;
  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(profile.avatar_path);
  // updated_at als Anhängsel, damit nach einem Wechsel nicht das alte Bild aus dem Cache kommt.
  return `${data.publicUrl}?v=${encodeURIComponent(profile.updated_at)}`;
}
