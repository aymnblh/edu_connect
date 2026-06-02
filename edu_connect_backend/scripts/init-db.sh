#!/usr/bin/env sh
set -eu

: "${APP_DB_USER:?APP_DB_USER is required}"
: "${APP_DB_PASSWORD:?APP_DB_PASSWORD is required}"
: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"

psql \
  -v ON_ERROR_STOP=1 \
  -v app_user="${APP_DB_USER}" \
  -v app_password="${APP_DB_PASSWORD}" \
  -v db_name="${POSTGRES_DB}" \
  --username "${POSTGRES_USER}" \
  --dbname "${POSTGRES_DB}" <<'EOSQL'
CREATE ROLE :"app_user"
  LOGIN
  PASSWORD :'app_password'
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOBYPASSRLS;

GRANT CONNECT ON DATABASE :"db_name" TO :"app_user";
GRANT USAGE, CREATE ON SCHEMA public TO :"app_user";
EOSQL
