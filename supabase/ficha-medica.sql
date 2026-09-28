-- =====================================================================
-- TURNITO — WhatsApp del centro, DNI y ficha médica del cliente
-- Pegar en Supabase → SQL Editor → Run.
-- =====================================================================

-- El número al que el CLIENTE le escribe para avisar sobre su turno.
-- Sin esto, el botón de WhatsApp de la página pública no tiene a quién
-- mandarle el mensaje.
alter table centros add column if not exists telefono_whatsapp text;

-- DNI: identificador real de cada persona (a diferencia del email, no
-- cambia y no tiene errores de tipeo tan fácilmente).
alter table clientes add column if not exists dni text;

-- Ficha médica básica. Todo opcional: se completa con calma desde el
-- panel, no hace falta pedírselo al cliente en el momento de reservar.
alter table clientes add column if not exists obra_social text;
alter table clientes add column if not exists contacto_emergencia_nombre text;
alter table clientes add column if not exists contacto_emergencia_telefono text;
alter table clientes add column if not exists alergias text;
alter table clientes add column if not exists condiciones_medicas text;
alter table clientes add column if not exists medicacion text;
alter table clientes add column if not exists observaciones_medicas text;

-- La función de reservar_turno tiene que poder guardar el DNI que carga
-- el cliente en el paso 3 de la reserva pública.
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
  v_duracion int;
  v_tipo text;
  v_cupo int;
  v_fin timestamptz;
  v_ocupados int;
  v_turno_id uuid;
begin
  select duracion_min, tipo, cupo into v_duracion, v_tipo, v_cupo
  from actividades where id = p_actividad_id and centro_id = p_centro_id and activa = true;

  if v_duracion is null then
    raise exception 'Actividad inválida';
  end if;

  v_fin := p_inicio + (v_duracion || ' minutes')::interval;

  if v_tipo = 'grupal' then
    select count(*) into v_ocupados from turnos
    where actividad_id = p_actividad_id and inicio = p_inicio
      and estado in ('pendiente', 'confirmado');
    if v_ocupados >= v_cupo then
      raise exception 'Sin cupo disponible para ese horario';
    end if;
  end if;

  insert into clientes (centro_id, nombre, email, telefono, dni)
  values (p_centro_id, p_nombre, lower(p_email), p_telefono, p_dni)
  on conflict (centro_id, email)
  do update set nombre = excluded.nombre, telefono = excluded.telefono, dni = coalesce(excluded.dni, clientes.dni)
  returning id into v_cliente_id;

  insert into turnos (centro_id, actividad_id, profesional_id, cliente_id, inicio, fin, estado)
  values (p_centro_id, p_actividad_id, p_profesional_id, v_cliente_id, p_inicio, v_fin, 'confirmado')
  returning id into v_turno_id;

  return v_turno_id;
end;
$$;
