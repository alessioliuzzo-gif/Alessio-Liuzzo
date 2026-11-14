-- Rechte für den Server (service_role).
--
-- Das Projekt gibt neue Tabellen nicht automatisch frei. Das ist für die
-- App-Rollen gewollt, betrifft aber auch den Server: Edge Functions arbeiten
-- mit service_role und brauchen Tabellenrechte. RLS umgeht diese Rolle ohnehin;
-- ihr Schlüssel liegt nur serverseitig.
grant all on all tables in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
