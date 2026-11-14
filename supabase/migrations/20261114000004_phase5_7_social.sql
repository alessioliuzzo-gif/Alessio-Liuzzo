-- Phasen 5 bis 7: Freunde, Feeds, Chat, Fakten-Feed mit Kommentaren, Moderation.

-- ---------------------------------------------------------------------------
-- Blockieren
-- ---------------------------------------------------------------------------
create table public.blocks (
  blocker_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.blocks enable row level security;

-- Man sieht nur, wen man selbst blockiert hat (nicht, von wem man blockiert wurde).
create policy "blocks: eigene lesen" on public.blocks for select to authenticated
  using (blocker_id = (select auth.uid()));
create policy "blocks: selbst blockieren" on public.blocks for insert to authenticated
  with check (blocker_id = (select auth.uid()));
create policy "blocks: eigene aufheben" on public.blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));

revoke all on public.blocks from anon, authenticated;
grant select, delete on public.blocks to authenticated;
grant insert (blocked_id) on public.blocks to authenticated;

-- Besteht zwischen zwei Nutzern eine Blockierung, egal in welche Richtung?
create function public.is_blocked(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;
revoke all on function public.is_blocked(uuid, uuid) from public, anon;
grant execute on function public.is_blocked(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Freundschaften
-- ---------------------------------------------------------------------------
create type public.friendship_status as enum ('pending', 'accepted');

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status public.friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);
-- Pro Paar nur eine Zeile, egal wer angefragt hat.
create unique index friendships_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendships_addressee_idx on public.friendships (addressee_id);

alter table public.friendships enable row level security;

create policy "friendships: beteiligte lesen" on public.friendships for select to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

create policy "friendships: anfrage senden" on public.friendships for insert to authenticated
  with check (
    requester_id = (select auth.uid())
    and status = 'pending'
    and not public.is_blocked(requester_id, addressee_id)
  );

-- Annehmen darf nur, wer angefragt wurde.
create policy "friendships: anfrage annehmen" on public.friendships for update to authenticated
  using (addressee_id = (select auth.uid()))
  with check (addressee_id = (select auth.uid()) and status = 'accepted');

-- Ablehnen, zurückziehen oder Freundschaft beenden: beide Seiten.
create policy "friendships: beenden" on public.friendships for delete to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

revoke all on public.friendships from anon, authenticated;
grant select, delete on public.friendships to authenticated;
grant insert (addressee_id) on public.friendships to authenticated;
grant update (status) on public.friendships to authenticated;

create function public.are_friends(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.friendships
    where status = 'accepted'
      and ((requester_id = a and addressee_id = b) or (requester_id = b and addressee_id = a))
  );
$$;
revoke all on function public.are_friends(uuid, uuid) from public, anon;
grant execute on function public.are_friends(uuid, uuid) to authenticated;

-- Wer blockiert, beendet damit auch die Freundschaft.
create function public.handle_new_block()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.friendships
  where (requester_id = new.blocker_id and addressee_id = new.blocked_id)
     or (requester_id = new.blocked_id and addressee_id = new.blocker_id);
  return new;
end;
$$;
revoke all on function public.handle_new_block() from public, anon, authenticated;
create trigger blocks_end_friendship after insert on public.blocks
  for each row execute function public.handle_new_block();

-- ---------------------------------------------------------------------------
-- Sichtbarkeit von Profilen und Fotos an Freunde und Blockierungen anpassen
-- ---------------------------------------------------------------------------
drop policy "profiles: angemeldete Nutzer lesen" on public.profiles;
create policy "profiles: lesen ausser bei Blockierung" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or not public.is_blocked(id, (select auth.uid())));

drop policy "daily_photos: eigene und öffentliche lesen" on public.daily_photos;
create policy "daily_photos: eigene, Freunde und öffentliche lesen"
  on public.daily_photos for select to authenticated
  using (
    user_id = (select auth.uid())
    or (
      not public.is_blocked(user_id, (select auth.uid()))
      and (visibility = 'public' or public.are_friends(user_id, (select auth.uid())))
    )
  );

create or replace function public.can_view_photo(object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.daily_photos p
    where p.storage_path = regexp_replace(object_name, '_thumb\.jpg$', '.jpg')
      and (
        p.user_id = (select auth.uid())
        or (
          not public.is_blocked(p.user_id, (select auth.uid()))
          and (p.visibility = 'public' or public.are_friends(p.user_id, (select auth.uid())))
        )
      )
  );
$$;

create index daily_photos_user_day_idx on public.daily_photos (user_id, day desc);

-- ---------------------------------------------------------------------------
-- Chat: 1:1-Nachrichten zwischen Freunden
-- ---------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  -- Antwort auf ein Tagesfoto (optional)
  photo_id uuid references public.daily_photos (id) on delete set null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id)
);
create index messages_pair_idx on public.messages
  (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at desc);
create index messages_recipient_unread_idx on public.messages (recipient_id) where read_at is null;

alter table public.messages enable row level security;

create policy "messages: beteiligte lesen" on public.messages for select to authenticated
  using ((select auth.uid()) in (sender_id, recipient_id));

create policy "messages: an Freunde senden" on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and public.are_friends(sender_id, recipient_id)
    and not public.is_blocked(sender_id, recipient_id)
  );

-- Der Empfänger darf eine Nachricht als gelesen markieren, sonst nichts.
create policy "messages: als gelesen markieren" on public.messages for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

create policy "messages: eigene löschen" on public.messages for delete to authenticated
  using (sender_id = (select auth.uid()));

revoke all on public.messages from anon, authenticated;
grant select, delete on public.messages to authenticated;
grant insert (recipient_id, body, photo_id) on public.messages to authenticated;
grant update (read_at) on public.messages to authenticated;

-- Echtzeit: neue Nachrichten werden an verbundene Apps gesendet (RLS gilt auch dort).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Entdecken-Feed: Fakten und News, automatisch befüllt, mit Kommentaren
-- ---------------------------------------------------------------------------
create table public.feed_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('fact', 'news')),
  lang text not null check (lang in ('de', 'en', 'fr', 'it')),
  title text not null,
  body text,
  source_name text not null,
  source_url text not null,
  image_url text,
  published_on date not null default current_date,
  -- Eindeutige Kennung bei der Quelle, damit nichts doppelt landet
  external_id text not null,
  created_at timestamptz not null default now(),
  unique (kind, lang, external_id)
);
create index feed_items_lang_date_idx on public.feed_items (lang, published_on desc, created_at desc);

alter table public.feed_items enable row level security;
create policy "feed_items: angemeldete lesen" on public.feed_items for select to authenticated using (true);
-- Schreiben kann nur der Server (Edge Function refresh-feed).
revoke all on public.feed_items from anon, authenticated;
grant select on public.feed_items to authenticated;

create table public.feed_comments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.feed_items (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index feed_comments_item_idx on public.feed_comments (item_id, created_at);

alter table public.feed_comments enable row level security;
create policy "feed_comments: lesen ausser bei Blockierung" on public.feed_comments for select to authenticated
  using (user_id = (select auth.uid()) or not public.is_blocked(user_id, (select auth.uid())));
create policy "feed_comments: selbst schreiben" on public.feed_comments for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "feed_comments: eigene löschen" on public.feed_comments for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.feed_comments from anon, authenticated;
grant select, delete on public.feed_comments to authenticated;
grant insert (item_id, body) on public.feed_comments to authenticated;

-- ---------------------------------------------------------------------------
-- Moderation: Inhalte melden
-- ---------------------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('photo', 'profile', 'message', 'comment')),
  target_id uuid not null,
  reason text not null check (reason in ('spam', 'harassment', 'nudity', 'violence', 'hate', 'other')),
  details text check (char_length(details) <= 500),
  status text not null default 'open' check (status in ('open', 'reviewed')),
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);
alter table public.reports enable row level security;

-- Nutzer können melden, aber Meldungen nicht lesen. Du bearbeitest sie im
-- Supabase-Dashboard (Tabelle "reports").
create policy "reports: melden" on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));

revoke all on public.reports from anon, authenticated;
grant insert (target_type, target_id, reason, details) on public.reports to authenticated;

insert into public.app_config (key, value, is_public, description) values
  ('feed_sources', '[]', false,
   'Zusätzliche RSS-Quellen für den Entdecken-Feed: [{"name":"...","url":"https://...","lang":"de"}]. Nur Quellen eintragen, die die Nutzung erlauben.')
on conflict (key) do nothing;
