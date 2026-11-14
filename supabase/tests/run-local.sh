#!/usr/bin/env bash
# Startet eine Wegwerf-Postgres-Datenbank, spielt alle Migrationen ein und
# führt die RLS-Tests aus. Braucht eine lokale PostgreSQL-Installation
# (initdb, pg_ctl, psql), aber kein Supabase-Konto.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PGTEST_PORT:-54329}"
DATA="$(mktemp -d)"
BIN="$(dirname "$(command -v initdb || ls /usr/lib/postgresql/*/bin/initdb | tail -1)")"

# Postgres startet nicht als root. In dem Fall als Nutzer "postgres" ausführen.
run() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
if [ "$(id -u)" = 0 ]; then chown postgres "$DATA"; fi

cleanup() { run "$BIN/pg_ctl -D $DATA -m immediate stop" >/dev/null 2>&1 || true; rm -rf "$DATA"; }
trap cleanup EXIT

run "$BIN/initdb -D $DATA -U postgres -A trust" >/dev/null
run "$BIN/pg_ctl -D $DATA -o '-p $PORT -c listen_addresses=localhost -k $DATA' -w start" >/dev/null

PSQL=(psql -h localhost -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)

"${PSQL[@]}" -f "$ROOT/tests/local_stub.sql"
for migration in "$ROOT"/migrations/*.sql; do
  echo "Migration: $(basename "$migration")"
  "${PSQL[@]}" -f "$migration"
done
for test in "$ROOT"/tests/*.test.sql; do
  echo "Test: $(basename "$test")"
  "${PSQL[@]}" -t -f "$test"
done
