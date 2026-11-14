-- Tests für die Zugriffsregeln aus Phase 1.
--
-- Lokal:      supabase/tests/run-local.sh
-- Supabase:   Inhalt in den SQL Editor kopieren und ausführen.
-- Alles läuft in einer Transaktion und wird am Ende zurückgerollt; es bleiben
-- keine Testdaten zurück. Endet das Skript mit "ALLE TESTS BESTANDEN", ist alles gut.
begin;

-- Zwei Testnutzer registrieren (löst den Trigger handle_new_user aus)
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-0000000000a1', 'anna@test.invalid',
   jsonb_build_object('username', 'Anna_1', 'display_name', ' Anna ', 'terms_accepted', true,
                      'birth_year', extract(year from now())::int - 30)),
  ('00000000-0000-4000-8000-0000000000b2', 'ben@test.invalid',
   jsonb_build_object('username', 'ben', 'display_name', 'Ben', 'terms_accepted', true,
                      'birth_year', extract(year from now())::int - 16));

do $$
begin
  assert (select username from public.profiles where id = '00000000-0000-4000-8000-0000000000a1') = 'anna_1',
    'Benutzername wird kleingeschrieben gespeichert';
  assert (select display_name from public.profiles where id = '00000000-0000-4000-8000-0000000000a1') = 'Anna',
    'Anzeigename wird getrimmt';
  assert (select count(*) from public.profile_private) >= 2, 'private Angaben werden angelegt';
  assert (select terms_version from public.profile_private where id = '00000000-0000-4000-8000-0000000000b2')
    = (select value #>> '{}' from public.app_config where key = 'terms_version'),
    'akzeptierte AGB-Version wird festgehalten';
end $$;

-- Registrierungen, die abgelehnt werden müssen
do $$
declare
  c record;
begin
  for c in
    select * from (values
      ('zu jung', 'too_young',
       jsonb_build_object('username', 'kid', 'display_name', 'Kid', 'terms_accepted', true,
                          'birth_year', extract(year from now())::int - 15)),
      ('ohne Geburtsjahr', 'birth_year_required',
       jsonb_build_object('username', 'nobirth', 'display_name', 'X', 'terms_accepted', true)),
      ('ohne AGB', 'terms_required',
       jsonb_build_object('username', 'noterms', 'display_name', 'X',
                          'birth_year', extract(year from now())::int - 30)),
      ('Benutzername vergeben', '%profiles_username_key%',
       jsonb_build_object('username', 'ben', 'display_name', 'X', 'terms_accepted', true,
                          'birth_year', extract(year from now())::int - 30)),
      ('Benutzername ungültig', '%profiles_username_check%',
       jsonb_build_object('username', 'a b', 'display_name', 'X', 'terms_accepted', true,
                          'birth_year', extract(year from now())::int - 30)),
      ('ohne Metadaten', 'birth_year_required', null::jsonb)
    ) as t (label, expected, meta)
  loop
    begin
      insert into auth.users (id, email, raw_user_meta_data)
      values (gen_random_uuid(), 'x-' || gen_random_uuid() || '@test.invalid', c.meta);
      raise exception 'TEST FEHLGESCHLAGEN: Registrierung "%" wurde angenommen', c.label;
    exception when others then
      if sqlerrm like 'TEST FEHLGESCHLAGEN%' then raise; end if;
      assert sqlerrm like c.expected, format('"%s": unerwarteter Fehler: %s', c.label, sqlerrm);
    end;
  end loop;
end $$;

-- Eine interne Einstellung, die die App nie sehen darf
insert into public.app_config (key, value, is_public) values ('test_intern', '"geheim"', false);

-- ---------------------------------------------------------------------------
-- Ohne Login (anon)
-- ---------------------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{}', true);

do $$
begin
  assert (select value from public.app_config where key = 'subscriptions_enabled') = 'false'::jsonb,
    'anon liest öffentliche Konfiguration';
  assert not exists (select 1 from public.app_config where key = 'test_intern'),
    'anon sieht keine interne Konfiguration';
  assert public.username_available('frei_123'), 'freier Benutzername';
  assert not public.username_available('ben'), 'vergebener Benutzername';
  assert not public.username_available('Zu Kurz!'), 'ungültiger Benutzername';

  begin
    perform 1 from public.profiles;
    raise exception 'TEST FEHLGESCHLAGEN: anon kann Profile lesen';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.profile_private;
    raise exception 'TEST FEHLGESCHLAGEN: anon kann private Angaben lesen';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.app_config set value = 'true' where key = 'subscriptions_enabled';
    raise exception 'TEST FEHLGESCHLAGEN: anon kann Konfiguration ändern';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

-- ---------------------------------------------------------------------------
-- Angemeldet als Anna
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1"}', true);

do $$
declare
  n int;
begin
  assert exists (select 1 from public.profiles where username = 'ben'), 'Anna sieht Bens Profil';
  assert (select count(*) from public.profile_private) = 1, 'Anna sieht nur ihre privaten Angaben';
  assert not exists (select 1 from public.profile_private where id = '00000000-0000-4000-8000-0000000000b2'),
    'Anna sieht Bens Geburtsjahr nicht';
  assert not exists (select 1 from public.app_config where key = 'test_intern'),
    'angemeldete Nutzer sehen keine interne Konfiguration';

  update public.profiles set display_name = 'Anna Neu' where id = '00000000-0000-4000-8000-0000000000a1';
  get diagnostics n = row_count;
  assert n = 1, 'Anna ändert ihr Profil';

  update public.profiles set display_name = 'Gehackt' where id = '00000000-0000-4000-8000-0000000000b2';
  get diagnostics n = row_count;
  assert n = 0, 'Anna kann Bens Profil nicht ändern';

  begin
    update public.profiles set id = gen_random_uuid() where id = '00000000-0000-4000-8000-0000000000a1';
    raise exception 'TEST FEHLGESCHLAGEN: id ist änderbar';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.profiles (id, username, display_name) values (gen_random_uuid(), 'fake', 'Fake');
    raise exception 'TEST FEHLGESCHLAGEN: Profile lassen sich direkt anlegen';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.profiles where id = '00000000-0000-4000-8000-0000000000b2';
    raise exception 'TEST FEHLGESCHLAGEN: Profile lassen sich direkt löschen';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profile_private set birth_year = 1990;
    raise exception 'TEST FEHLGESCHLAGEN: private Angaben sind änderbar';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.app_config (key, value, is_public) values ('x', 'true', true);
    raise exception 'TEST FEHLGESCHLAGEN: Nutzer können Konfiguration anlegen';
  exception when insufficient_privilege then null;
  end;

  -- Storage: nur der eigene Ordner
  insert into storage.objects (bucket_id, name)
  values ('avatars', '00000000-0000-4000-8000-0000000000a1/avatar.jpg');
  begin
    insert into storage.objects (bucket_id, name)
    values ('avatars', '00000000-0000-4000-8000-0000000000b2/avatar.jpg');
    raise exception 'TEST FEHLGESCHLAGEN: Upload in fremden Ordner möglich';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

-- ---------------------------------------------------------------------------
-- Angemeldet als Ben
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b2"}', true);

do $$
declare
  n int;
begin
  assert (select display_name from public.profiles where username = 'anna_1') = 'Anna Neu',
    'Ben sieht Annas geänderten Namen';
  -- Supabase verbietet direktes Löschen in Storage-Tabellen; darum prüfen wir
  -- über Lesen und Ändern, dass Ben nicht an Annas Datei kommt.
  assert not exists (select 1 from storage.objects
    where name = '00000000-0000-4000-8000-0000000000a1/avatar.jpg'),
    'Ben sieht Annas Datei nicht über die Storage-Tabelle';
  update storage.objects set name = '00000000-0000-4000-8000-0000000000b2/geklaut.jpg'
    where name = '00000000-0000-4000-8000-0000000000a1/avatar.jpg';
  get diagnostics n = row_count;
  assert n = 0, 'Ben kann Annas Profilbild nicht verschieben';
end $$;

reset role;

-- ---------------------------------------------------------------------------
-- Konto löschen entfernt alle Profildaten (Kaskade)
-- ---------------------------------------------------------------------------
delete from auth.users where id = '00000000-0000-4000-8000-0000000000a1';

do $$
begin
  assert not exists (select 1 from public.profiles where id = '00000000-0000-4000-8000-0000000000a1'),
    'Profil wird mit dem Konto gelöscht';
  assert not exists (select 1 from public.profile_private where id = '00000000-0000-4000-8000-0000000000a1'),
    'private Angaben werden mit dem Konto gelöscht';
  assert public.username_available('anna_1'), 'Benutzername wird wieder frei';
end $$;

select 'ALLE TESTS BESTANDEN' as ergebnis;
rollback;
