#!/usr/bin/env bash
# Aplica todas las migraciones en una base de datos PostgreSQL vacía y ejecuta las pruebas SQL.
# Uso: DATABASE_URL=postgres://... npm run test:db
set -euo pipefail
: "${DATABASE_URL:?Define DATABASE_URL (una base de datos de pruebas vacía)}"
cd "$(dirname "$0")/.."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f supabase/tests/00_supabase_stub.sql
for f in supabase/migrations/*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$f"
done
for f in supabase/tests/*.test.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$f"
done
