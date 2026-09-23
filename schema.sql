-- =====================================================================
-- TURNITO — esquema inicial (multi-centro)
-- Pegar en Supabase → SQL Editor → Run. Requiere extensión pgcrypto
-- (Supabase la trae activada por defecto) para gen_random_uuid().
-- =====================================================================

-- ---------------------------------------------------------------------
-- CENTROS (cada gimnasio/estudio que paga el abono mensual)
-- ---------------------------------------------------------------------
create table if not exists centros (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text not null unique,               -- usado en la URL pública: /r/:slug
  logo_url text,
  color_acento text not null default '#FFD400',
  plan_activo boolean not null default true,
  creado_en timestamptz not null default now()
);

-- Dueños/administradores de un centro (login con Supabase Auth)
create table if not exists centro_usuarios (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references centros(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rol text not null default 'admin' check (rol in ('admin', 'staff')),
  creado_en timestamptz not null default now(),
  unique (centro_id, user_id)
);

-- ---------------------------------------------------------------------
-- PROFESIONALES (responsables de actividades: kinesiólogos, profes, etc.)
-- ---------------------------------------------------------------------
create table if not exists profesionales (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references centros(id) on delete cascade,
  nombre text not null,
  iniciales text not null,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- ACTIVIDADES (kinesiología, masajes, pilates, clases, personal trainer...)
-- Configuración completa vive acá: tipo de turno, duración, cupo, política
-- de cancelación, días y horas disponibles.
-- ---------------------------------------------------------------------
create table if not exists actividades (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references centros(id) on delete cascade,
  nombre text not null,
  codigo text not null,                              -- ej. "PI", "KI"
  tipo text not null check (tipo in ('individual', 'grupal')),
  duracion_min int not null default 50,
  cupo int not null default 1,                       -- 1 en individual
  cancelacion_horas int not null default 2,
  activa boolean not null default true,
  orden int not null default 0,
  creado_en timestamptz not null default now()
);

-- Responsables asignados a cada actividad (N a N)
create table if not exists actividad_profesionales (
  actividad_id uuid not null references actividades(id) on delete cascade,
  profesional_id uuid not null references profesionales(id) on delete cascade,
  primary key (actividad_id, profesional_id)
);

-- Disponibilidad semanal por actividad: día de semana (0=domingo..6=sábado)
-- + franja horaria. Simple y suficiente para el MVP; permite varias franjas
-- por día si un centro cierra al mediodía, por ejemplo.
create table if not exists disponibilidad (
  id uuid primary key default gen_random_uuid(),
  actividad_id uuid not null references actividades(id) on delete cascade,
  dia_semana int not null check (dia_semana between 0 and 6),
  hora_inicio time not null,
  hora_fin time not null
);

-- ---------------------------------------------------------------------
-- CLIENTES (sin cuenta: se identifican por email + teléfono en cada centro)
-- ---------------------------------------------------------------------
create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references centros(id) on delete cascade,
  nombre text not null,
  email text not null,
  telefono text not null,
  creado_en timestamptz not null default now(),
  unique (centro_id, email)
);

-- ---------------------------------------------------------------------
-- TURNOS (el log de cada cliente vive acá, filtrando por cliente_id)
-- ---------------------------------------------------------------------
create table if not exists turnos (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references centros(id) on delete cascade,
  actividad_id uuid not null references actividades(id) on delete restrict,
  profesional_id uuid references profesionales(id) on delete set null,
  cliente_id uuid not null references clientes(id) on delete cascade,
  inicio timestamptz not null,
  fin timestamptz not null,
  estado text not null default 'confirmado'
    check (estado in ('pendiente', 'confirmado', 'cancelado', 'asistio', 'no_asistio')),
  creado_en timestamptz not null default now()
);

create index if not exists idx_turnos_centro_inicio on turnos (centro_id, inicio);
create index if not exists idx_turnos_cliente on turnos (cliente_id);
create index if not exists idx_turnos_actividad_inicio on turnos (actividad_id, inicio);

-- Evita doble reserva del mismo profesional en el mismo momento
-- (para individuales; en grupales el cupo se valida en la app).
create unique index if not exists uq_turno_profesional_inicio
  on turnos (profesional_id, inicio)
  where profesional_id is not null and estado in ('pendiente', 'confirmado');

-- =====================================================================
-- ROW LEVEL SECURITY
-- Lectura pública de centros/actividades/profesionales/disponibilidad
-- (para que la página de reserva funcione sin login).
-- Turnos y clientes: lectura/escritura solo vía función segura o admin
-- del centro logueado.
-- =====================================================================
alter table centros enable row level security;
alter table centro_usuarios enable row level security;
alter table profesionales enable row level security;
alter table actividades enable row level security;
alter table actividad_profesionales enable row level security;
alter table disponibilidad enable row level security;
alter table clientes enable row level security;
alter table turnos enable row level security;

create policy "centros: lectura pública" on centros for select using (true);

create policy "actividades: lectura pública de activas" on actividades
  for select using (activa = true);

create policy "profesionales: lectura pública de activos" on profesionales
  for select using (activo = true);

create policy "actividad_profesionales: lectura pública" on actividad_profesionales
  for select using (true);

create policy "disponibilidad: lectura pública" on disponibilidad
  for select using (true);

-- Administración: solo un usuario que figure en centro_usuarios para ese centro
create policy "centro_usuarios: ver el propio" on centro_usuarios
  for select using (auth.uid() = user_id);

create policy "actividades: admin del centro edita" on actividades
  for all using (
    exists (select 1 from centro_usuarios cu
            where cu.centro_id = actividades.centro_id and cu.user_id = auth.uid())
  );

create policy "profesionales: admin del centro edita" on profesionales
  for all using (
    exists (select 1 from centro_usuarios cu
            where cu.centro_id = profesionales.centro_id and cu.user_id = auth.uid())
  );

create policy "turnos: admin del centro ve y edita" on turnos
  for all using (
    exists (select 1 from centro_usuarios cu
            where cu.centro_id = turnos.centro_id and cu.user_id = auth.uid())
  );

create policy "clientes: admin del centro ve y edita" on clientes
  for all using (
    exists (select 1 from centro_usuarios cu
            where cu.centro_id = clientes.centro_id and cu.user_id = auth.uid())
  );

-- La reserva pública (sin login) se hace vía la función reservar_turno()
-- de abajo con SECURITY DEFINER, así no necesita policies de insert
-- abiertas en turnos/clientes.

-- =====================================================================
-- FUNCIÓN: reservar_turno
-- Crea (o reutiliza) el cliente y crea el turno, todo en una transacción,
-- validando cupo para actividades grupales y evitando doble reserva.
-- =====================================================================
create or replace function reservar_turno(
  p_centro_id uuid,
  p_actividad_id uuid,
  p_profesional_id uuid,
  p_inicio timestamptz,
  p_nombre text,
  p_email text,
  p_telefono text
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

  insert into clientes (centro_id, nombre, email, telefono)
  values (p_centro_id, p_nombre, lower(p_email), p_telefono)
  on conflict (centro_id, email)
  do update set nombre = excluded.nombre, telefono = excluded.telefono
  returning id into v_cliente_id;

  insert into turnos (centro_id, actividad_id, profesional_id, cliente_id, inicio, fin, estado)
  values (p_centro_id, p_actividad_id, p_profesional_id, v_cliente_id, p_inicio, v_fin, 'confirmado')
  returning id into v_turno_id;

  return v_turno_id;
end;
$$;

-- =====================================================================
-- DATOS DE EJEMPLO (opcional — comentar si no se quiere semilla)
-- =====================================================================
-- insert into centros (nombre, slug, color_acento) values ('Centro Demo', 'centro-demo', '#FFD400');
