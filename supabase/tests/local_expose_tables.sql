-- Nur für lokale Tests: bildet die Projekt-Einstellung "Automatically expose
-- new tables" nach. Damit bekommen neue Tabellen in "public" automatisch alle
-- Rechte für die API-Rollen. Die Migrationen müssen in beiden Varianten sicher sein.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
