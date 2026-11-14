-- Eigene Beiträge im Entdecken-Feed: Nutzer teilen selbst Fakten und
-- Fundstücke. Sie liegen in derselben Tabelle wie die automatischen Einträge,
-- haben aber einen Verfasser.
alter table public.feed_items
  add column user_id uuid references public.profiles (id) on delete cascade,
  alter column source_name drop not null,
  alter column source_url drop not null,
  alter column external_id set default gen_random_uuid()::text;

alter table public.feed_items drop constraint feed_items_kind_check;
alter table public.feed_items add constraint feed_items_kind_check
  check (kind in ('fact', 'news', 'post'));
-- Beiträge haben immer einen Verfasser, automatische Einträge nie, dafür eine Quelle.
alter table public.feed_items add constraint feed_items_author_check check (
  (kind = 'post' and user_id is not null)
  or (kind <> 'post' and user_id is null and source_name is not null and source_url is not null)
);
alter table public.feed_items add constraint feed_items_post_length_check check (
  kind <> 'post' or (char_length(btrim(title)) between 1 and 80 and char_length(coalesce(body, '')) <= 500)
);
create index feed_items_user_idx on public.feed_items (user_id) where user_id is not null;

alter table public.feed_items alter column user_id set default auth.uid();

drop policy "feed_items: angemeldete lesen" on public.feed_items;
create policy "feed_items: lesen ausser bei Blockierung" on public.feed_items for select to authenticated
  using (user_id is null or user_id = (select auth.uid()) or not public.is_blocked(user_id, (select auth.uid())));

create policy "feed_items: eigene Beiträge schreiben" on public.feed_items for insert to authenticated
  with check (kind = 'post' and user_id = (select auth.uid()));

create policy "feed_items: eigene Beiträge löschen" on public.feed_items for delete to authenticated
  using (kind = 'post' and user_id = (select auth.uid()));

grant insert (kind, lang, title, body) on public.feed_items to authenticated;
grant delete on public.feed_items to authenticated;

-- Spam-Schutz: höchstens 5 Beiträge pro Person und Tag.
create function public.limit_posts_per_day()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.kind = 'post' and (
    select count(*) from public.feed_items
    where user_id = new.user_id and kind = 'post' and created_at > now() - interval '1 day'
  ) >= 5 then
    raise exception 'post_limit_reached';
  end if;
  return new;
end;
$$;
revoke all on function public.limit_posts_per_day() from public, anon, authenticated;
create trigger feed_items_limit_posts before insert on public.feed_items
  for each row execute function public.limit_posts_per_day();

-- Beiträge können gemeldet werden.
alter table public.reports drop constraint reports_target_type_check;
alter table public.reports add constraint reports_target_type_check
  check (target_type in ('photo', 'profile', 'message', 'comment', 'post'));
