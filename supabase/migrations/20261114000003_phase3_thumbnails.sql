-- Phase 3: Vorschaubilder für den Kalender.
--
-- Zu jedem Tagesfoto "<user-id>/<tag>.jpg" gibt es ein kleines Vorschaubild
-- "<user-id>/<tag>_thumb.jpg". Der Kalender lädt nur diese kleinen Dateien.
-- Für beide gelten dieselben Zugriffsregeln.
create or replace function public.can_view_photo(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.daily_photos p
    where p.storage_path = regexp_replace(object_name, '_thumb\.jpg$', '.jpg')
      and (p.user_id = (select auth.uid()) or p.visibility = 'public')
  );
$$;
