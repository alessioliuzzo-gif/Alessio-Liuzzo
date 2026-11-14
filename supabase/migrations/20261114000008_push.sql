-- Phase 8: Push-Benachrichtigungen bei neuen Nachrichten.
create table public.push_tokens (
  token text primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android', 'web')),
  updated_at timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id);
alter table public.push_tokens enable row level security;

create policy "push_tokens: eigene lesen" on public.push_tokens for select to authenticated
  using (user_id = (select auth.uid()));
create policy "push_tokens: eigene speichern" on public.push_tokens for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "push_tokens: eigene aktualisieren" on public.push_tokens for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "push_tokens: eigene löschen" on public.push_tokens for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.push_tokens from anon, authenticated;
grant select, delete on public.push_tokens to authenticated;
grant insert (token, platform), update (platform, updated_at) on public.push_tokens to authenticated;
grant all on public.push_tokens to service_role;

-- Bei jeder neuen Nachricht die Edge Function "notify-message" aufrufen.
-- pg_net schickt die Anfrage im Hintergrund; das Senden der Nachricht wartet nicht darauf.
create function public.notify_new_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  secret text;
begin
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'cron_secret';
  if secret is null then
    return new;
  end if;
  perform net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/notify-message',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', secret),
    body := jsonb_build_object('message_id', new.id)
  );
  return new;
exception when others then
  -- Push ist Komfort: Ein Fehler hier darf das Senden nie verhindern.
  return new;
end;
$$;
revoke all on function public.notify_new_message() from public, anon, authenticated;
create trigger messages_notify after insert on public.messages
  for each row execute function public.notify_new_message();
