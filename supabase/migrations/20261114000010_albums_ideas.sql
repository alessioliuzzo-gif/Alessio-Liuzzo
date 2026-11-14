-- Privates Album ("Erinnerungen") und Ideen-Box der Community.

-- ---------------------------------------------------------------------------
-- Alben und Erinnerungen: streng privat, nur für den Besitzer.
-- ---------------------------------------------------------------------------
create table public.albums (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 40),
  emoji text not null default '📔' check (char_length(emoji) <= 8),
  created_at timestamptz not null default now()
);
create index albums_user_idx on public.albums (user_id, created_at);

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  storage_path text not null,
  caption text not null default '' check (char_length(caption) <= 500),
  happened_on date not null default current_date,
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  check (storage_path like user_id::text || '/%')
);
create index memories_album_idx on public.memories (album_id, happened_on desc, created_at desc);

alter table public.albums enable row level security;
alter table public.memories enable row level security;

create policy "albums: nur eigene" on public.albums for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- Erinnerungen nur in eigene Alben.
create policy "memories: nur eigene" on public.memories for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.albums a where a.id = album_id and a.user_id = (select auth.uid()))
  );

revoke all on public.albums, public.memories from anon, authenticated;
grant select, delete on public.albums, public.memories to authenticated;
grant insert (title, emoji), update (title, emoji) on public.albums to authenticated;
grant insert (album_id, storage_path, caption, happened_on),
      update (caption, happened_on, favorite, album_id) on public.memories to authenticated;
grant all on public.albums, public.memories to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('memories', 'memories', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

create policy "memories-bucket: nur eigener Ordner" on storage.objects for all to authenticated
  using (bucket_id = 'memories' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'memories' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------------
-- Ideen-Box: Wünsche einreichen und abstimmen.
-- ---------------------------------------------------------------------------
create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 80),
  body text not null default '' check (char_length(body) <= 500),
  -- Den Status setzt nur der Betreiber im Dashboard.
  status text not null default 'open' check (status in ('open', 'planned', 'done', 'declined')),
  vote_count int not null default 0,
  created_at timestamptz not null default now()
);
create index ideas_rank_idx on public.ideas (vote_count desc, created_at desc);

create table public.idea_votes (
  idea_id uuid not null references public.ideas (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (idea_id, user_id)
);

alter table public.ideas enable row level security;
alter table public.idea_votes enable row level security;

create policy "ideas: lesen ausser bei Blockierung" on public.ideas for select to authenticated
  using (user_id = (select auth.uid()) or not public.is_blocked(user_id, (select auth.uid())));
create policy "ideas: eigene einreichen" on public.ideas for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "ideas: eigene löschen" on public.ideas for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "idea_votes: eigene lesen" on public.idea_votes for select to authenticated
  using (user_id = (select auth.uid()));
create policy "idea_votes: selbst abstimmen" on public.idea_votes for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "idea_votes: Stimme zurückziehen" on public.idea_votes for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.ideas, public.idea_votes from anon, authenticated;
grant select, delete on public.ideas, public.idea_votes to authenticated;
-- Status und Stimmenzahl sind für Nutzer nicht setzbar.
grant insert (title, body) on public.ideas to authenticated;
grant insert (idea_id) on public.idea_votes to authenticated;
grant all on public.ideas, public.idea_votes to service_role;

-- Stimmenzahl automatisch mitführen (eine Stimme pro Person dank Primärschlüssel).
create function public.sync_idea_votes()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    update public.ideas set vote_count = vote_count + 1 where id = new.idea_id;
    return new;
  end if;
  update public.ideas set vote_count = greatest(0, vote_count - 1) where id = old.idea_id;
  return old;
end;
$$;
revoke all on function public.sync_idea_votes() from public, anon, authenticated;
create trigger idea_votes_sync after insert or delete on public.idea_votes
  for each row execute function public.sync_idea_votes();

-- Spam-Schutz: höchstens 3 Ideen pro Person und Tag.
create function public.limit_ideas_per_day()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.ideas
      where user_id = new.user_id and created_at > now() - interval '1 day') >= 3 then
    raise exception 'idea_limit_reached';
  end if;
  return new;
end;
$$;
revoke all on function public.limit_ideas_per_day() from public, anon, authenticated;
create trigger ideas_limit before insert on public.ideas
  for each row execute function public.limit_ideas_per_day();

alter table public.reports drop constraint reports_target_type_check;
alter table public.reports add constraint reports_target_type_check
  check (target_type in ('photo', 'profile', 'message', 'comment', 'post', 'idea'));
