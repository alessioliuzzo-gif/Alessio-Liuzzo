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

PSQL=(psql -h localhost -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q)

# Zwei Durchläufe: einmal mit, einmal ohne automatische Freigabe neuer Tabellen.
for mode in strict expose; do
  echo "== Variante: $mode =="
  "${PSQL[@]}" -d postgres -c "create database test_$mode"
  DB=(-d "test_$mode")
  "${PSQL[@]}" "${DB[@]}" -f "$ROOT/tests/local_stub.sql" 2>/dev/null \
    || "${PSQL[@]}" "${DB[@]}" -f <(grep -v '^create role' "$ROOT/tests/local_stub.sql")
  if [ "$mode" = expose ]; then "${PSQL[@]}" "${DB[@]}" -f "$ROOT/tests/local_expose_tables.sql"; fi
  for migration in "$ROOT"/migrations/*.sql; do
    echo "Migration: $(basename "$migration")"
    "${PSQL[@]}" "${DB[@]}" -f "$migration"
  done
  for test in "$ROOT"/tests/*.test.sql; do
    echo "Test: $(basename "$test")"
    "${PSQL[@]}" "${DB[@]}" -t -f "$test" | grep -v '^ *{' | sed '/^$/d'
  done
done
