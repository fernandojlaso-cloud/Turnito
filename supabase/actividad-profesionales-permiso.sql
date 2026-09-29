-- =====================================================================
-- TURNITO — permiso faltante: vincular/desvincular profesionales de
-- actividades desde el panel (misma clase de agujero que ya
-- encontramos en "disponibilidad").
-- Pegar en Supabase → SQL Editor → Run.
-- =====================================================================

create policy "actividad_profesionales: admin del centro edita" on actividad_profesionales
  for all using (
    exists (
      select 1 from actividades a
      join centro_usuarios cu on cu.centro_id = a.centro_id
      where a.id = actividad_profesionales.actividad_id and cu.user_id = auth.uid()
    )
  );
