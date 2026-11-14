-- Phase 2: Tagesfotos.
--
-- Ein Foto pro Nutzer und Tag. Die Bilddatei liegt in einem privaten Bucket;
-- die App bekommt nur zeitlich begrenzte Links, und nur wenn die Regeln hier
-- den Zugriff erlauben.

create type public.photo_visibility as enum ('friends', 'public');

create table public.daily_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  -- Der Kalendertag aus Sicht des Nutzers (seine Zeitzone), nicht des Servers.
  day date not null,
  -- Immer "<user-id>/<tag>.jpg". Ein neues Foto am selben Tag ersetzt die Datei.
  storage_path text not null,
  visibility public.photo_visibility not null default 'friends',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, day),
  check (storage_path = user_id::text || '/' || to_char(day, 'YYYY-MM-DD') || '.jpg')
);

create index daily_photos_public_idx on public.daily_photos (day desc) where visibility = 'public';

alter table public.daily_photos enable row level security;

-- Lesen: eigene Fotos und öffentliche Fotos. "Nur Freunde" heisst in Phase 2
-- noch "nur ich"; Phase 5 ergänzt die Freunde.
create policy "daily_photos: eigene und öffentliche lesen"
  on public.daily_photos for select
  to authenticated
  using (user_id = (select auth.uid()) or visibility = 'public');

-- Anlegen: nur für sich selbst und nur für "heute". Weil der Server die
-- Zeitzone des Nutzers nicht kennt, gilt: höchstens ein Tag Abstand zum
-- UTC-Datum. So kann niemand alte Tage nachträglich füllen.
create policy "daily_photos: eigenes Foto für heute anlegen"
  on public.daily_photos for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and day between (now() at time zone 'utc')::date - 1 and (now() at time zone 'utc')::date + 1
  );

create policy "daily_photos: eigenes Foto ändern"
  on public.daily_photos for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "daily_photos: eigenes Foto löschen"
  on public.daily_photos for delete
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.daily_photos from anon, authenticated;
grant select, delete on public.daily_photos to authenticated;
grant insert (day, storage_path, visibility) on public.daily_photos to authenticated;
-- Änderbar ist nur die Sichtbarkeit. Tag und Besitzer stehen fest.
grant update (visibility) on public.daily_photos to authenticated;

create trigger daily_photos_set_updated_at
  before update on public.daily_photos
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Darf der angemeldete Nutzer diese Bilddatei sehen?
-- ---------------------------------------------------------------------------
-- Wird von der Storage-Regel unten benutzt. "security definer", damit die
-- Prüfung unabhängig von den Tabellenrechten des Aufrufers läuft; sie gibt
-- nur ja/nein zurück. Phase 5 erweitert sie um Freunde.
create function public.can_view_photo(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.daily_photos p
    where p.storage_path = object_name
      and (p.user_id = (select auth.uid()) or p.visibility = 'public')
  );
$$;

revoke all on function public.can_view_photo(text) from public, anon;
grant execute on function public.can_view_photo(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: privater Bucket für Tagesfotos
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

create policy "photos: eigene Dateien und freigegebene Fotos lesen"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'photos'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or public.can_view_photo(name)
    )
  );

create policy "photos: in eigenen Ordner hochladen"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "photos: eigene Dateien ersetzen"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "photos: eigene Dateien löschen"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
