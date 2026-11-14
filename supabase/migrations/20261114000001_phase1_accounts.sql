-- Phase 1: Konten, Profile und App-Konfiguration.
--
-- Grundregel für alle Tabellen: Row Level Security (RLS) ist eingeschaltet.
-- Ohne passende Policy sieht und ändert ein Nutzer nichts. Die App benutzt
-- nur den öffentlichen anon Key; was sie darf, entscheidet allein die Datenbank.

-- ---------------------------------------------------------------------------
-- app_config: Einstellungen, die ohne App-Update geändert werden können
-- ---------------------------------------------------------------------------
create table public.app_config (
  key text primary key,
  value jsonb not null,
  -- Nur Zeilen mit is_public = true sind für die App lesbar. Interne Werte
  -- (z. B. die Marge beim Kalenderdruck) bleiben serverseitig.
  is_public boolean not null default false,
  description text,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;

create policy "app_config: öffentliche Werte lesen"
  on public.app_config for select
  to anon, authenticated
  using (is_public);

-- Schreiben darf niemand über die App. Du änderst Werte im Supabase-Dashboard.
revoke insert, update, delete, truncate on public.app_config from anon, authenticated;

insert into public.app_config (key, value, is_public, description) values
  ('subscriptions_enabled', 'false', true, 'Feature Flag: Abo und Paywall sichtbar (true/false)'),
  ('min_age', '16', true, 'Mindestalter bei der Registrierung'),
  ('terms_version', '"2026-11-entwurf"', true, 'Aktuelle Version der Nutzungsbedingungen');

-- ---------------------------------------------------------------------------
-- profiles: der für andere Nutzer sichtbare Teil eines Kontos
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Angemeldete Nutzer dürfen Profile sehen (nötig für Freundessuche und Feed).
-- Phase 7 schränkt das für blockierte Nutzer ein.
create policy "profiles: angemeldete Nutzer lesen"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles: eigenes Profil ändern"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Zusätzlich zur Policy: nur diese Spalten sind änderbar (nicht id, created_at).
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (username, display_name, avatar_path) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- profile_private: Angaben, die nur der Nutzer selbst sehen darf
-- ---------------------------------------------------------------------------
create table public.profile_private (
  id uuid primary key references public.profiles (id) on delete cascade,
  birth_year int not null check (birth_year between 1900 and 2100),
  terms_version text not null,
  terms_accepted_at timestamptz not null default now()
);

alter table public.profile_private enable row level security;

create policy "profile_private: nur eigene Zeile lesen"
  on public.profile_private for select
  to authenticated
  using (id = (select auth.uid()));

revoke all on public.profile_private from anon, authenticated;
grant select on public.profile_private to authenticated;

-- ---------------------------------------------------------------------------
-- updated_at automatisch setzen
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger app_config_set_updated_at
  before update on public.app_config
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Profil beim Registrieren anlegen
-- ---------------------------------------------------------------------------
-- Läuft in derselben Transaktion wie die Registrierung. Schlägt eine Prüfung
-- fehl, wird auch das Konto nicht angelegt. So gelten Mindestalter und
-- AGB-Zustimmung auch dann, wenn jemand die App umgeht und die API direkt
-- aufruft.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_birth_year int;
  v_min_age int;
  v_terms_version text;
begin
  if coalesce(meta ->> 'birth_year', '') !~ '^[0-9]{4}$' then
    raise exception 'birth_year_required';
  end if;
  v_birth_year := (meta ->> 'birth_year')::int;

  select (value #>> '{}')::int into v_min_age
    from public.app_config where key = 'min_age';
  if extract(year from now())::int - v_birth_year < coalesce(v_min_age, 16) then
    raise exception 'too_young';
  end if;

  if coalesce(meta ->> 'terms_accepted', '') <> 'true' then
    raise exception 'terms_required';
  end if;

  select value #>> '{}' into v_terms_version
    from public.app_config where key = 'terms_version';

  insert into public.profiles (id, username, display_name)
  values (new.id, lower(btrim(meta ->> 'username')), btrim(meta ->> 'display_name'));

  insert into public.profile_private (id, birth_year, terms_version)
  values (new.id, v_birth_year, coalesce(v_terms_version, 'unbekannt'));

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Benutzername frei? (wird vor der Registrierung aufgerufen, also ohne Login)
-- ---------------------------------------------------------------------------
create function public.username_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select candidate ~ '^[a-z0-9_]{3,20}$'
    and not exists (select 1 from public.profiles where username = candidate);
$$;

revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage: Profilbilder
-- ---------------------------------------------------------------------------
-- Öffentlicher Bucket: Profilbilder sind über ihre URL abrufbar, weil sie in
-- Suche und Feeds ohnehin sichtbar sind. Tagesfotos (Phase 2) kommen in einen
-- privaten Bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Jeder Nutzer darf nur in seinem eigenen Ordner "<user-id>/..." schreiben.
create policy "avatars: eigenen Ordner lesen"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: in eigenen Ordner hochladen"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: eigene Dateien ersetzen"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: eigene Dateien löschen"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
