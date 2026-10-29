-- =====================================================================
-- TURNITO — alta automática al registrarse + bloqueo automático al
-- llegar a 50 reservas (hasta que el director lo aprueba de nuevo).
-- Pegar en Supabase → SQL Editor → Run, DESPUÉS de haber corrido
-- schema.sql, director.sql y autoregistro.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Columnas nuevas en centros
-- ---------------------------------------------------------------------

-- Quién creó el centro (el propio usuario, en el alta pública; null si
-- lo creó el director a mano desde /director).
alter table centros add column if not exists creado_por uuid references auth.users(id);

-- Marca si este centro ya pasó por el control de las 50 reservas (una
-- sola vez en su vida: si ya pasó, nunca se vuelve a bloquear por esto).
alter table centros add column if not exists limite_50_aplicado boolean not null default false;

-- Los centros que ya existen hoy (reales o de prueba, con la cantidad
-- de turnos que tengan) quedan afuera del límite nuevo a propósito, para
-- no bloquearlos de sorpresa. El límite rige solo para los centros que
-- se registren de acá en adelante.
update centros set limite_50_aplicado = true where limite_50_aplicado = false;

-- ---------------------------------------------------------------------
-- 2) Políticas de alta pública: ya no dependen de "aprobado = false",
--    dependen de "vos sos quien creó este centro".
-- ---------------------------------------------------------------------

drop policy if exists "centros: autoregistro pendiente" on centros;
create policy "centros: autoregistro propio" on centros
  for insert with check (creado_por = auth.uid());

drop policy if exists "centro_usuarios: autovinculación a centro pendiente" on centro_usuarios;
create policy "centro_usuarios: autovinculación a centro propio" on centro_usuarios
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from centros c where c.id = centro_usuarios.centro_id and c.creado_por = auth.uid())
  );

-- ---------------------------------------------------------------------
-- 3) Trigger: al llegar a 50 turnos (de toda la vida), bloquea el panel
--    del centro (aprobado = false), una sola vez por centro.
-- ---------------------------------------------------------------------

create or replace function public.verificar_limite_reservas()
returns trigger
language plpgsql
security definer
as $$
declare
  ya_aplicado boolean;
  total integer;
begin
  select limite_50_aplicado into ya_aplicado from centros where id = new.centro_id;

  if ya_aplicado then
    return new;
  end if;

  select count(*) into total from turnos where centro_id = new.centro_id;

  if total >= 50 then
    update centros set aprobado = false, limite_50_aplicado = true where id = new.centro_id;
  end if;

  return new;
end;
$$;

drop trigger if exists turnos_verificar_limite on turnos;
create trigger turnos_verificar_limite
  after insert on turnos
  for each row
  execute function public.verificar_limite_reservas();
