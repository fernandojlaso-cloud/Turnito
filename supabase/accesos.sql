-- =====================================================================
-- TURNITO — Accesos: check-in por QR
-- Pegar en Supabase → SQL Editor → Run.
-- =====================================================================

-- Momento en que se escaneó el QR de presentismo de este turno. Null
-- hasta que se escanea. Se usa para no permitir un segundo check-in y
-- para distinguir "asistió porque lo escaneamos" de "lo marcó el admin
-- a mano" desde Agenda.
alter table turnos add column if not exists checkin_en timestamptz;
