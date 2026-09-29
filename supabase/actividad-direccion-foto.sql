-- =====================================================================
-- TURNITO — dirección y foto de cada actividad
-- Pegar en Supabase → SQL Editor → Run.
-- =====================================================================

alter table actividades add column if not exists direccion text;
alter table actividades add column if not exists imagen_url text;

-- Reutilizamos el bucket "logos" (ya público, ya con permisos para
-- usuarios logueados) también para las fotos de actividad — no hace
-- falta un bucket nuevo.
