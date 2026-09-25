-- =====================================================================
-- TURNITO — vista de Director (super admin)
-- Pegar en Supabase → SQL Editor → Run, DESPUÉS de haber corrido
-- schema.sql. Agrega el rol de "director": alguien que no pertenece a
-- un centro puntual, sino que gestiona TODOS los centros (altas, bajas,
-- edición de datos) — el dueño del producto Turnito, no de un gimnasio.
-- =====================================================================

create table if not exists super_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  creado_en timestamptz not null default now()
);

alter table super_admins enable row level security;

-- Un super admin puede ver la lista de super admins (para saber que lo es).
create policy "super_admins: ver la propia membresía" on super_admins
  for select using (auth.uid() = user_id);

-- Los super admins pueden crear, editar y dar de baja centros.
-- (La lectura de centros ya es pública desde schema.sql, así que no
-- hace falta una policy de select acá.)
create policy "centros: super admin gestiona todo" on centros
  for all using (
    exists (select 1 from super_admins sa where sa.user_id = auth.uid())
  );

-- =====================================================================
-- Convertir a tu usuario en director (super admin)
-- Reemplazá el UUID por tu propio user_id de auth.users.
-- =====================================================================
-- insert into super_admins (user_id) values ('TU-USER-ID-ACA');
