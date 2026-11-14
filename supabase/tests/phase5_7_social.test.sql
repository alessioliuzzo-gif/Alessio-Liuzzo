-- Tests für Freunde, Fotosichtbarkeit, Chat, Kommentare, Blockieren und Melden.
-- Läuft lokal und im SQL Editor von Supabase. Rollt alles zurück.
begin;

insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-4000-8000-0000000000' || suffix)::uuid, name || '@test.invalid',
       jsonb_build_object('username', name || '_s', 'display_name', name, 'terms_accepted', true,
                          'birth_year', extract(year from now())::int - 30)
from (values ('a1', 'anna'), ('b2', 'ben'), ('c3', 'cleo')) as t (suffix, name);

-- Annas Foto von heute, nur für Freunde (als Datenbank-Admin angelegt)
insert into public.daily_photos (user_id, day, storage_path)
values ('00000000-0000-4000-8000-0000000000a1', (now() at time zone 'utc')::date,
        '00000000-0000-4000-8000-0000000000a1/' || (now() at time zone 'utc')::date || '.jpg');
insert into public.feed_items (kind, lang, title, source_name, source_url, external_id)
values ('fact', 'de', 'Testfakt', 'Test', 'https://example.invalid', 'test-1');

select set_config('test.photo_id',
  (select id::text from public.daily_photos where user_id = '00000000-0000-4000-8000-0000000000a1'), true);

create temp table ids on commit drop as
select '00000000-0000-4000-8000-0000000000a1'::uuid as anna,
       '00000000-0000-4000-8000-0000000000b2'::uuid as ben,
       '00000000-0000-4000-8000-0000000000c3'::uuid as cleo;
grant select on ids to authenticated;

-- ============ Ben: noch kein Freund ============
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b2"}', true);
do $$
declare i record; n int;
begin
  select * into i from ids;
  assert not exists (select 1 from public.daily_photos where user_id = i.anna),
    'Nicht-Freund sieht kein Freunde-Foto';
  begin
    insert into public.messages (recipient_id, body) values (i.anna, 'Hallo');
    raise exception 'TEST FEHLGESCHLAGEN: Nachricht an Nicht-Freund möglich';
  exception when insufficient_privilege then null;
  end;

  insert into public.friendships (addressee_id) values (i.anna);
  begin
    insert into public.friendships (addressee_id) values (i.anna);
    raise exception 'TEST FEHLGESCHLAGEN: doppelte Anfrage möglich';
  exception when unique_violation then null;
  end;
  begin
    insert into public.friendships (addressee_id) values (i.ben);
    raise exception 'TEST FEHLGESCHLAGEN: Anfrage an sich selbst möglich';
  exception when check_violation then null;
  end;
  -- Der Anfragende kann seine eigene Anfrage nicht selbst annehmen.
  update public.friendships set status = 'accepted' where requester_id = i.ben;
  get diagnostics n = row_count;
  assert n = 0, 'Anfragender kann nicht selbst annehmen';
  assert not public.are_friends(i.anna, i.ben), 'offene Anfrage ist keine Freundschaft';
  assert not exists (select 1 from public.daily_photos where user_id = i.anna),
    'offene Anfrage gibt keinen Zugriff auf Fotos';
end $$;
reset role;

-- ============ Cleo: unbeteiligt ============
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c3"}', true);
do $$
declare i record; n int;
begin
  select * into i from ids;
  assert not exists (select 1 from public.friendships), 'Dritte sehen fremde Anfragen nicht';
  update public.friendships set status = 'accepted';
  get diagnostics n = row_count;
  assert n = 0, 'Dritte können fremde Anfragen nicht annehmen';
  begin
    insert into public.friendships (requester_id, addressee_id) values (i.anna, i.cleo);
    raise exception 'TEST FEHLGESCHLAGEN: Anfrage im Namen anderer möglich';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- ============ Anna nimmt an ============
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1"}', true);
do $$
declare i record; n int;
begin
  select * into i from ids;
  update public.friendships set status = 'accepted' where addressee_id = i.anna;
  get diagnostics n = row_count;
  assert n = 1, 'Angefragte nimmt an';
  assert public.are_friends(i.anna, i.ben), 'Freundschaft besteht';
end $$;
reset role;

-- ============ Ben: jetzt Freund ============
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b2"}', true);
do $$
declare i record; n int; photo uuid; item uuid;
begin
  select * into i from ids;
  select id into photo from public.daily_photos where user_id = i.anna;
  assert photo is not null, 'Freund sieht das Freunde-Foto';
  assert public.can_view_photo(i.anna || '/' || (now() at time zone 'utc')::date || '_thumb.jpg'),
    'Freund darf die Bilddatei lesen';

  insert into public.push_tokens (token, platform) values ('ExponentPushToken[ben]', 'ios');
  insert into public.albums (title) values ('Bens Album');
  insert into public.memories (album_id, storage_path, caption)
  select id, i.ben || '/m1.jpg', 'geheim' from public.albums;
  begin
    insert into public.memories (album_id, storage_path) select id, i.anna || '/x.jpg' from public.albums;
    raise exception 'TEST FEHLGESCHLAGEN: Erinnerung zeigt auf fremden Ordner';
  exception when check_violation then null;
  end;
  insert into storage.objects (bucket_id, name) values ('memories', i.ben || '/m1.jpg');
  insert into public.ideas (title) values ('Dunkler Kalender');
  insert into public.idea_votes (idea_id) select id from public.ideas where title = 'Dunkler Kalender';
  begin
    insert into public.idea_votes (idea_id) select id from public.ideas where title = 'Dunkler Kalender';
    raise exception 'TEST FEHLGESCHLAGEN: doppelte Stimme möglich';
  exception when unique_violation then null;
  end;
  begin
    update public.ideas set vote_count = 999;
    raise exception 'TEST FEHLGESCHLAGEN: Stimmenzahl manipulierbar';
  exception when insufficient_privilege then null;
  end;
  insert into public.ideas (title) values ('Idee 2'), ('Idee 3');
  begin
    insert into public.ideas (title) values ('Idee 4');
    raise exception 'TEST FEHLGESCHLAGEN: mehr als 3 Ideen pro Tag';
  exception when raise_exception then
    if sqlerrm <> 'idea_limit_reached' then raise; end if;
  end;
  begin
    insert into public.push_tokens (token, user_id, platform) values ('ExponentPushToken[fake]', i.anna, 'ios');
    raise exception 'TEST FEHLGESCHLAGEN: Push-Token für andere speicherbar';
  exception when insufficient_privilege then null;
  end;
  insert into public.messages (recipient_id, body, photo_id) values (i.anna, 'Schönes Foto!', photo);
  insert into public.photo_comments (photo_id, body) values (photo, 'Toll!');
  assert (select count(*) from public.photo_comments where photo_id = photo) = 1, 'Freund kommentiert';
  begin
    insert into public.messages (recipient_id, body) values (i.cleo, 'Hi');
    raise exception 'TEST FEHLGESCHLAGEN: Nachricht an Nicht-Freund möglich';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.messages (sender_id, recipient_id, body) values (i.anna, i.ben, 'gefälscht');
    raise exception 'TEST FEHLGESCHLAGEN: Absender fälschbar';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.messages (recipient_id, body) values (i.anna, '   ');
    raise exception 'TEST FEHLGESCHLAGEN: leere Nachricht möglich';
  exception when check_violation then null;
  end;
  -- Der Absender kann seine Nachricht nicht selbst als gelesen markieren.
  update public.messages set read_at = now() where sender_id = i.ben;
  get diagnostics n = row_count;
  assert n = 0, 'Absender kann nicht als gelesen markieren';

  select id into item from public.feed_items where external_id = 'test-1';
  insert into public.feed_comments (item_id, body) values (item, 'Spannend');
  begin
    insert into public.feed_items (kind, lang, title) values ('news', 'de', 'Fake');
    raise exception 'TEST FEHLGESCHLAGEN: Nutzer können automatische Einträge anlegen';
  exception when insufficient_privilege then null;
  end;
  -- Eigene Beiträge sind erlaubt, aber höchstens 5 pro Tag.
  begin
    insert into public.feed_items (kind, lang, title) values ('post', 'de', repeat('x', 81));
    raise exception 'TEST FEHLGESCHLAGEN: zu langer Titel möglich';
  exception when check_violation then null;
  end;
  insert into public.feed_items (kind, lang, title, body) values ('post', 'de', 'Wusstest du?', 'Bens Fakt');
  assert (select user_id from public.feed_items where body = 'Bens Fakt') = i.ben, 'Verfasser wird gesetzt';
  insert into public.feed_items (kind, lang, title)
  select 'post', 'de', 'Fakt ' || g from generate_series(2, 5) as g;
  begin
    insert into public.feed_items (kind, lang, title) values ('post', 'de', 'Fakt 6');
    raise exception 'TEST FEHLGESCHLAGEN: mehr als 5 Beiträge pro Tag möglich';
  exception when raise_exception then
    if sqlerrm <> 'post_limit_reached' then raise; end if;
  end;
  insert into public.reports (target_type, target_id, reason)
  select 'post', id, 'spam' from public.feed_items where body = 'Bens Fakt';

  insert into public.reports (target_type, target_id, reason) values ('photo', photo, 'spam');
  begin
    perform 1 from public.reports;
    raise exception 'TEST FEHLGESCHLAGEN: Nutzer können Meldungen lesen';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- ============ Cleo liest mit? ============
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c3"}', true);
do $$
begin
  assert not exists (select 1 from public.messages where body = 'Schönes Foto!'),
    'Dritte lesen keine fremden Nachrichten';
  assert not exists (select 1 from public.push_tokens), 'Dritte sehen keine fremden Push-Token';
  assert not exists (select 1 from public.albums), 'Alben sind privat';
  assert not exists (select 1 from public.memories), 'Erinnerungen sind privat';
  assert not exists (select 1 from storage.objects where bucket_id = 'memories'), 'Album-Bilder sind privat';
  begin
    insert into public.memories (album_id, storage_path)
    values ((select current_setting('test.photo_id'))::uuid, (select auth.uid()) || '/x.jpg');
    raise exception 'TEST FEHLGESCHLAGEN: Erinnerung in fremdes Album möglich';
  exception when others then
    if sqlerrm like 'TEST FEHLGESCHLAGEN%' then raise; end if;
  end;
  insert into public.idea_votes (idea_id) select id from public.ideas where title = 'Dunkler Kalender';
  assert (select vote_count from public.ideas where title = 'Dunkler Kalender') = 2, 'Stimmen werden gezählt';
  delete from public.idea_votes;
  assert (select vote_count from public.ideas where title = 'Dunkler Kalender') = 1,
    'nur die eigene Stimme lässt sich zurückziehen';
  delete from public.ideas;
  assert (select count(*) from public.ideas where title like 'Idee%' or title = 'Dunkler Kalender') = 3,
    'fremde Ideen sind nicht löschbar';
  begin
    insert into public.print_orders (user_id, start_month, amount_chf) values ((select auth.uid()), '2027-01', 0);
    raise exception 'TEST FEHLGESCHLAGEN: Nutzer können Druckaufträge selbst anlegen';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.subscriptions (user_id, active) values ((select auth.uid()), true);
    raise exception 'TEST FEHLGESCHLAGEN: Nutzer können sich selbst ein Abo geben';
  exception when insufficient_privilege then null;
  end;
  assert not exists (select 1 from public.app_config where key = 'print_margin_chf'),
    'die Marge ist für die App unsichtbar';
  assert exists (select 1 from public.app_config where key = 'print_price_chf'), 'der Preis ist sichtbar';
  assert not exists (select 1 from public.photo_comments
    where photo_id = (select current_setting('test.photo_id'))::uuid),
    'Dritte sehen keine Kommentare zu Freunde-Fotos';
  begin
    insert into public.photo_comments (photo_id, body)
    select id, 'heimlich' from pg_catalog.unnest(array[]::uuid[]) as id;
    -- Ohne Zugriff auf das Foto kennt Cleo dessen ID nicht; mit erratener ID greift die Regel:
    insert into public.photo_comments (photo_id, body)
    values ((select current_setting('test.photo_id'))::uuid, 'heimlich');
    raise exception 'TEST FEHLGESCHLAGEN: Kommentar zu unsichtbarem Foto möglich';
  exception when insufficient_privilege then null;
  end;
  assert (select count(*) from public.feed_comments where body = 'Spannend') = 1,
    'Kommentare sind für alle Angemeldeten sichtbar';
  assert (select count(*) from public.feed_items where user_id = '00000000-0000-4000-8000-0000000000b2') = 5, 'Beiträge sind für alle sichtbar';
  delete from public.feed_items where user_id = '00000000-0000-4000-8000-0000000000b2';
  assert (select count(*) from public.feed_items where user_id = '00000000-0000-4000-8000-0000000000b2') = 5, 'fremde Beiträge sind nicht löschbar';
  assert not exists (select 1 from public.daily_photos
    where user_id = '00000000-0000-4000-8000-0000000000a1'), 'Dritte sehen das Freunde-Foto nicht';
end $$;
reset role;

-- ============ Anna liest, markiert und blockiert Ben ============
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1"}', true);
do $$
declare i record; n int;
begin
  select * into i from ids;
  assert (select count(*) from public.messages where recipient_id = i.anna) = 1, 'Anna sieht die Nachricht';
  update public.messages set read_at = now() where recipient_id = i.anna;
  get diagnostics n = row_count;
  assert n = 1, 'Empfängerin markiert als gelesen';
  begin
    update public.messages set body = 'verändert' where recipient_id = i.anna;
    raise exception 'TEST FEHLGESCHLAGEN: Nachrichtentext änderbar';
  exception when insufficient_privilege then null;
  end;

  insert into public.blocks (blocked_id) values (i.ben);
  assert not public.are_friends(i.anna, i.ben), 'Blockieren beendet die Freundschaft';
  assert not exists (select 1 from public.profiles where id = i.ben), 'Blockierte Profile sind ausgeblendet';
  assert not exists (select 1 from public.feed_comments where user_id = i.ben),
    'Kommentare Blockierter sind ausgeblendet';
  assert not exists (select 1 from public.photo_comments where user_id = i.ben),
    'Foto-Kommentare Blockierter sind ausgeblendet';
  assert not exists (select 1 from public.feed_items where user_id = i.ben),
    'Beiträge Blockierter sind ausgeblendet';
end $$;
reset role;

-- ============ Ben nach der Blockierung ============
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b2"}', true);
do $$
declare i record;
begin
  select * into i from ids;
  assert not exists (select 1 from public.daily_photos where user_id = i.anna), 'Blockierter sieht keine Fotos';
  assert not exists (select 1 from public.profiles where id = i.anna), 'Blockierter sieht das Profil nicht';
  assert not exists (select 1 from public.blocks), 'Blockierter sieht die Blockierung nicht';
  begin
    insert into public.friendships (addressee_id) values (i.anna);
    raise exception 'TEST FEHLGESCHLAGEN: Anfrage trotz Blockierung möglich';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.messages (recipient_id, body) values (i.anna, 'Hallo?');
    raise exception 'TEST FEHLGESCHLAGEN: Nachricht trotz Blockierung möglich';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Öffentliche Fotos sind für Blockierte ebenfalls unsichtbar
update public.daily_photos set visibility = 'public' where user_id = '00000000-0000-4000-8000-0000000000a1';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b2"}', true);
do $$ begin
  assert not exists (select 1 from public.daily_photos where user_id = '00000000-0000-4000-8000-0000000000a1'),
    'Blockierter sieht auch öffentliche Fotos nicht';
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c3"}', true);
do $$ begin
  assert exists (select 1 from public.daily_photos where user_id = '00000000-0000-4000-8000-0000000000a1'),
    'Andere sehen das öffentliche Foto';
end $$;
reset role;

-- Ohne Login
set local role anon;
select set_config('request.jwt.claims', '{}', true);
do $$
declare t text;
begin
  foreach t in array array['friendships','blocks','messages','feed_items','feed_comments','photo_comments','reports','push_tokens','subscriptions','print_orders','albums','memories','ideas','idea_votes'] loop
    begin
      execute format('select 1 from public.%I', t);
      raise exception 'TEST FEHLGESCHLAGEN: anon kann % lesen', t;
    exception when insufficient_privilege then null;
    end;
  end loop;
end $$;
reset role;

select 'ALLE TESTS BESTANDEN' as ergebnis;
rollback;
