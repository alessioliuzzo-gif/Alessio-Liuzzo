-- Tests für die Zugriffsregeln der Tagesfotos (Phase 2).
-- Läuft lokal (run-local.sh) und im SQL Editor von Supabase. Rollt alles zurück.
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-0000000000a1', 'anna@test.invalid',
   jsonb_build_object('username', 'anna_p2', 'display_name', 'Anna', 'terms_accepted', true,
                      'birth_year', extract(year from now())::int - 30)),
  ('00000000-0000-4000-8000-0000000000b2', 'ben@test.invalid',
   jsonb_build_object('username', 'ben_p2', 'display_name', 'Ben', 'terms_accepted', true,
                      'birth_year', extract(year from now())::int - 30));

-- ---------------------------------------------------------------------------
-- Anna lädt ihr Foto von heute hoch (Standard: nur Freunde)
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1"}', true);

do $$
declare
  today date := (now() at time zone 'utc')::date;
  anna text := '00000000-0000-4000-8000-0000000000a1';
  ben text := '00000000-0000-4000-8000-0000000000b2';
  n int;
begin
  insert into storage.objects (bucket_id, name) values ('photos', anna || '/' || today || '.jpg');
  insert into public.daily_photos (day, storage_path) values (today, anna || '/' || today || '.jpg');

  assert (select visibility from public.daily_photos where user_id = anna::uuid) = 'friends',
    'Standard-Sichtbarkeit ist "nur Freunde"';
  assert (select user_id from public.daily_photos where day = today) = anna::uuid,
    'Besitzer wird automatisch gesetzt';

  begin
    insert into public.daily_photos (day, storage_path) values (today, anna || '/' || today || '.jpg');
    raise exception 'TEST FEHLGESCHLAGEN: zweites Foto am selben Tag möglich';
  exception when unique_violation then null;
  end;
  begin
    insert into public.daily_photos (day, storage_path)
    values (today - 5, anna || '/' || (today - 5) || '.jpg');
    raise exception 'TEST FEHLGESCHLAGEN: Foto für einen alten Tag möglich';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.daily_photos (day, storage_path)
    values (today + 3, anna || '/' || (today + 3) || '.jpg');
    raise exception 'TEST FEHLGESCHLAGEN: Foto für die Zukunft möglich';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.daily_photos (day, storage_path) values (today + 1, ben || '/' || (today + 1) || '.jpg');
    raise exception 'TEST FEHLGESCHLAGEN: Eintrag zeigt auf fremde Datei';
  exception when check_violation then null;
  end;
  begin
    insert into public.daily_photos (user_id, day, storage_path)
    values (ben::uuid, today, ben || '/' || today || '.jpg');
    raise exception 'TEST FEHLGESCHLAGEN: Foto im Namen eines anderen möglich';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.daily_photos set day = today - 1 where user_id = anna::uuid;
    raise exception 'TEST FEHLGESCHLAGEN: Tag ist nachträglich änderbar';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into storage.objects (bucket_id, name) values ('photos', ben || '/' || today || '.jpg');
    raise exception 'TEST FEHLGESCHLAGEN: Upload in fremden Ordner möglich';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

-- ---------------------------------------------------------------------------
-- Ben sieht Annas privates Foto nicht
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b2"}', true);

do $$
declare
  n int;
begin
  assert not exists (select 1 from public.daily_photos), 'Ben sieht Annas privaten Eintrag nicht';
  assert not exists (select 1 from storage.objects where bucket_id = 'photos'),
    'Ben sieht Annas private Bilddatei nicht';
  assert not public.can_view_photo('00000000-0000-4000-8000-0000000000a1/'
    || (now() at time zone 'utc')::date || '.jpg'), 'can_view_photo verneint für Ben';

  update public.daily_photos set visibility = 'public';
  get diagnostics n = row_count;
  assert n = 0, 'Ben kann Annas Foto nicht öffentlich machen';
  delete from public.daily_photos;
  get diagnostics n = row_count;
  assert n = 0, 'Ben kann Annas Foto nicht löschen';
end $$;

reset role;

-- Anna macht das Foto öffentlich
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1"}', true);
do $$
declare
  n int;
begin
  update public.daily_photos set visibility = 'public';
  get diagnostics n = row_count;
  assert n = 1, 'Anna ändert die Sichtbarkeit';
end $$;
reset role;

-- Jetzt sieht Ben es, kann es aber weiterhin nicht ändern
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b2"}', true);
do $$
declare
  n int;
begin
  assert (select count(*) from public.daily_photos) = 1, 'Ben sieht das öffentliche Foto';
  assert (select count(*) from storage.objects where bucket_id = 'photos') = 1,
    'Ben darf die öffentliche Bilddatei lesen';
  update public.daily_photos set visibility = 'friends';
  get diagnostics n = row_count;
  assert n = 0, 'Ben kann die Sichtbarkeit nicht ändern';
  update storage.objects set name = '00000000-0000-4000-8000-0000000000b2/x.jpg' where bucket_id = 'photos';
  get diagnostics n = row_count;
  assert n = 0, 'Ben kann die Datei nicht verschieben';
end $$;
reset role;

-- Ohne Login ist nichts sichtbar
set local role anon;
select set_config('request.jwt.claims', '{}', true);
do $$
begin
  begin
    perform 1 from public.daily_photos;
    raise exception 'TEST FEHLGESCHLAGEN: anon kann Tagesfotos lesen';
  exception when insufficient_privilege then null;
  end;
  assert not exists (select 1 from storage.objects where bucket_id = 'photos'),
    'anon sieht keine Bilddateien';
end $$;
reset role;

-- Konto löschen entfernt die Einträge
delete from auth.users where id = '00000000-0000-4000-8000-0000000000a1';
do $$
begin
  assert not exists (select 1 from public.daily_photos), 'Fotos werden mit dem Konto gelöscht';
end $$;

select 'ALLE TESTS BESTANDEN' as ergebnis;
rollback;
