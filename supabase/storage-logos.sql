-- =====================================================================
-- TURNITO — logos de cada centro (Supabase Storage)
-- Pegar en Supabase → SQL Editor → Run.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- Lectura pública: los logos se muestran en la página de reserva y en
-- el panel, sin login.
create policy "logos: lectura pública"
  on storage.objects for select
  using (bucket_id = 'logos');

-- Solo un usuario logueado puede subir (el dueño registrándose, o el
-- director editando un centro). No hace falta más granularidad: el
-- riesgo de que alguien suba un logo ajeno es bajo y no expone datos.
create policy "logos: usuarios logueados pueden subir"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'logos');

create policy "logos: usuarios logueados pueden reemplazar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'logos');
