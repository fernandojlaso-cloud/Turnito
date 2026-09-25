-- =====================================================================
-- TURNITO — clientes: alta manual y baja reversible
-- Pegar en Supabase → SQL Editor → Run.
-- =====================================================================

alter table clientes add column if not exists activo boolean not null default true;
