-- Esquema para almacenar contratos/plantillas de Rental Holidays
-- Se ejecuta automáticamente al levantar el contenedor de Postgres (docker-entrypoint-initdb.d)

create table if not exists contratos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  form_data jsonb not null default '{}'::jsonb,
  config jsonb not null default '{}'::jsonb,
  contrato_html text not null default '',
  firma_base64 text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_contratos_nombre on contratos (nombre);

-- Rol anónimo que usa PostgREST. Solo accesible desde dentro del tailnet
-- (el puerto de PostgREST se publica exclusivamente en 127.0.0.1, ver docker-compose.yml).
create role web_anon nologin;
grant usage on schema public to web_anon;
grant select, insert, update, delete on contratos to web_anon;

alter default privileges in schema public grant select, insert, update, delete on tables to web_anon;
