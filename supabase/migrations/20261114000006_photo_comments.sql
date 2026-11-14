-- Kommentare zu Tagesfotos.
create table public.photo_comments (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.daily_photos (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index photo_comments_photo_idx on public.photo_comments (photo_id, created_at);

alter table public.photo_comments enable row level security;

-- Kommentare sieht, wer das Foto sehen darf. Die Unterabfrage auf daily_photos
-- läuft mit den Rechten des Aufrufers, also gelten dort dieselben Regeln
-- (eigene, Freunde, öffentlich, keine Blockierung).
create policy "photo_comments: lesen wie das Foto" on public.photo_comments for select to authenticated
  using (
    exists (select 1 from public.daily_photos p where p.id = photo_id)
    and (user_id = (select auth.uid()) or not public.is_blocked(user_id, (select auth.uid())))
  );

create policy "photo_comments: zu sichtbaren Fotos schreiben" on public.photo_comments for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.daily_photos p where p.id = photo_id)
  );

-- Löschen dürfen der Verfasser und der Besitzer des Fotos.
create policy "photo_comments: eigene oder unter eigenem Foto löschen" on public.photo_comments for delete to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.daily_photos p where p.id = photo_id and p.user_id = (select auth.uid()))
  );

revoke all on public.photo_comments from anon, authenticated;
grant select, delete on public.photo_comments to authenticated;
grant insert (photo_id, body) on public.photo_comments to authenticated;
grant all on public.photo_comments to service_role;
