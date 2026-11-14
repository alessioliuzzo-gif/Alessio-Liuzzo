-- Phasen 9 und 10: Abo-Status (von RevenueCat gemeldet) und Kalenderdruck.

-- Abo-Status pro Nutzer. Schreibt nur der Server (Webhook von RevenueCat).
create table public.subscriptions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  active boolean not null default false,
  product_id text,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
create policy "subscriptions: eigenen Status lesen" on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;

-- Druckaufträge. Anlegen und Ändern nur über Edge Functions (Stripe, Gelato).
create table public.print_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  start_month text not null check (start_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'submitted', 'failed', 'shipped', 'cancelled')),
  amount_chf numeric(10, 2) not null,
  discount_percent int not null default 0,
  stripe_session_id text unique,
  gelato_order_id text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index print_orders_user_idx on public.print_orders (user_id, created_at desc);
alter table public.print_orders enable row level security;
create policy "print_orders: eigene lesen" on public.print_orders for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.print_orders from anon, authenticated;
grant select on public.print_orders to authenticated;
grant all on public.print_orders to service_role;
create trigger print_orders_set_updated_at before update on public.print_orders
  for each row execute function public.set_updated_at();

-- Privater Speicher für die erzeugten Druckdateien (PDF).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('print-files', 'print-files', false, 104857600, array['application/pdf'])
on conflict (id) do nothing;

-- Einstellbare Werte. Öffentlich: was die App anzeigen muss. Intern: nur Server.
insert into public.app_config (key, value, is_public, description) values
  ('print_enabled', 'false', true, 'Feature Flag: Kalenderdruck in der App anzeigen (true/false)'),
  ('print_price_chf', '29.90', true, 'Verkaufspreis Wandkalender A4 in CHF inkl. MwSt. und Versand'),
  ('print_premium_discount_percent', '15', true, 'Rabatt auf den Kalenderdruck für Abonnenten in Prozent'),
  ('print_margin_chf', '10.00', false, 'Deine geplante Marge pro Kalender in CHF (nur zur Übersicht, intern)'),
  ('print_gelato_product_uid', '"NOCH_AUSFUELLEN"', false, 'Gelato Produkt-UID des Wandkalenders A4 (aus dem Gelato-Katalog)'),
  ('print_ship_countries', '["CH","LI","DE","AT","FR","IT"]', false, 'Länder, in die geliefert wird (ISO-Codes)')
on conflict (key) do nothing;
