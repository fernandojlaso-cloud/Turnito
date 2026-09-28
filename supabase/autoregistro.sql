-- =====================================================================
-- TURNITO — autoregistro de centros con aprobación del director
-- Pegar en Supabase → SQL Editor → Run, DESPUÉS de haber corrido
-- schema.sql y director.sql.
-- =====================================================================

alter table centros add column if not exists aprobado boolean not null default true;

-- Los centros que ya existen (creados por vos desde /director o a mano)
-- quedan aprobados automáticamente con el default de arriba. Los nuevos
-- que se registren solos van a insertar con aprobado = false a propósito.

-- Cualquier persona autenticada puede crear SU PROPIO centro, pero
-- únicamente en estado "pendiente" (aprobado = false). No puede crear
-- uno ya aprobado — eso solo lo hace un director (política ya existente
-- "centros: super admin gestiona todo", que sigue vigente).
create policy "centros: autoregistro pendiente" on centros
  for insert with check (aprobado = false);

-- El dueño que se registra necesita poder vincularse a SU centro recién
-- creado (que todavía está pendiente). Una vez aprobado, ya no puede
-- vincular usuarios nuevos por esta vía — solo el director gestiona eso
-- (a través de la policy de super_admins, que ya cubre "for all").
create policy "centro_usuarios: autovinculación a centro pendiente" on centro_usuarios
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from centros c where c.id = centro_usuarios.centro_id and c.aprobado = false)
  );
