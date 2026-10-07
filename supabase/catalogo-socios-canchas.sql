-- =====================================================================
-- TURNITO — catálogo fijo de actividades, especialidad del profesional,
-- horarios "solo socios activos", clases compradas/usadas, canchas.
-- Pegar en Supabase → SQL Editor → Run.
-- =====================================================================

alter table actividades add column if not exists categoria text;

alter table actividades drop constraint if exists actividades_categoria_valida;
alter table actividades add constraint actividades_categoria_valida
  check (categoria is null or categoria in (
    'consultorio_medico',
    'kinesiologia_traumatologia_kiropraxia',
    'masajes',
    'pilates',
    'clases_grupales',
    'canchas_futbol_padel_tenis',
    'personal_trainer'
  ));

alter table profesionales add column if not exists especialidad text;
alter table profesionales add column if not exists es_cancha boolean not null default false;

alter table disponibilidad add column if not exists solo_socios_activos boolean not null default false;

alter table clientes add column if not exists clases_compradas int not null default 0;
alter table clientes add column if not exists clases_usadas int not null default 0;

create or replace function reservar_turno(
  p_centro_id uuid,
  p_actividad_id uuid,
  p_profesional_id uuid,
  p_inicio timestamptz,
  p_nombre text,
  p_email text,
  p_telefono text,
  p_dni text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente_id uuid;
  v_cliente_activo boolean;
  v_duracion int;
  v_tipo text;
  v_categoria text;
  v_cupo int;
  v_fin timestamptz;
  v_ocupados int;
  v_turno_id uuid;
  v_inicio_local timestamp;
  v_solo_socios boolean;
  v_profesional_id uuid;
begin
  select duracion_min, tipo, cupo, categoria into v_duracion, v_tipo, v_cupo, v_categoria
  from actividades where id = p_actividad_id and centro_id = p_centro_id and activa = true;

  if v_duracion is null then
    raise exception 'Actividad inválida';
  end if;

  v_fin := p_inicio + (v_duracion || ' minutes')::interval;
  v_inicio_local := p_inicio at time zone 'America/Argentina/Buenos_Aires';

  if v_tipo = 'grupal' then
    select count(*) into v_ocupados from turnos
    where actividad_id = p_actividad_id and inicio = p_inicio
      and estado in ('pendiente', 'confirmado');
    if v_ocupados >= v_cupo then
      raise exception 'Sin cupo disponible para ese horario';
    end if;
  end if;

  select solo_socios_activos into v_solo_socios
  from disponibilidad
  where actividad_id = p_actividad_id
    and dia_semana = extract(dow from v_inicio_local)
    and hora_inicio <= (v_inicio_local::time)
    and hora_fin > (v_inicio_local::time)
  limit 1;

  if v_solo_socios then
    select id, activo into v_cliente_id, v_cliente_activo
    from clientes where centro_id = p_centro_id and email = lower(p_email);

    if v_cliente_id is null or not v_cliente_activo then
      raise exception 'Este horario es solo para socios activos. Buscá un horario sin esa marca, o date de alta primero con el centro.';
    end if;
  else
    insert into clientes (centro_id, nombre, email, telefono, dni)
    values (p_centro_id, p_nombre, lower(p_email), p_telefono, p_dni)
    on conflict (centro_id, email)
    do update set nombre = excluded.nombre, telefono = excluded.telefono, dni = coalesce(excluded.dni, clientes.dni)
    returning id into v_cliente_id;
  end if;

  v_profesional_id := p_profesional_id;

  if v_categoria = 'canchas_futbol_padel_tenis' then
    select ap.profesional_id into v_profesional_id
    from actividad_profesionales ap
    join profesionales p on p.id = ap.profesional_id and p.activo = true
    where ap.actividad_id = p_actividad_id
      and not exists (
        select 1 from turnos t
        where t.profesional_id = ap.profesional_id
          and t.inicio = p_inicio
          and t.estado in ('pendiente', 'confirmado')
      )
    order by p.nombre
    limit 1;

    if v_profesional_id is null then
      raise exception 'Sin canchas disponibles para ese horario';
    end if;
  end if;

  insert into turnos (centro_id, actividad_id, profesional_id, cliente_id, inicio, fin, estado)
  values (p_centro_id, p_actividad_id, v_profesional_id, v_cliente_id, p_inicio, v_fin, 'confirmado')
  returning id into v_turno_id;

  return v_turno_id;
end;
$$;
