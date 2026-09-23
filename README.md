# Turnito

MVP funcional de turnos online multi-centro: kinesiología, masajes, pilates,
clases grupales y personal trainer, con página pública de reserva (sin
cuenta) y panel de administración (agenda, actividades, clientes).

Stack: **React + TypeScript + Vite**, **Supabase** (Postgres + Auth + RLS),
para publicar en **Vercel**.

## 1. Crear el proyecto en Supabase

1. Entrá a [supabase.com](https://supabase.com) → **New project**.
2. Cuando esté listo, andá a **SQL Editor** → pegá el contenido completo de
   `supabase/schema.sql` → **Run**. Esto crea todas las tablas, las políticas
   de seguridad (RLS) y la función `reservar_turno`.
3. En **Project Settings → API**, copiá la **Project URL** y la
   **anon public key**.

## 2. Configurar el proyecto local

```bash
npm install
cp .env.example .env
```

Completá `.env` con los dos valores del paso anterior:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anon-publica
```

```bash
npm run dev
```

## 3. Cargar tu primer centro (Megatlon Núñez, por ejemplo)

En el **SQL Editor** de Supabase:

```sql
insert into centros (nombre, slug, color_acento)
values ('Megatlon Núñez', 'megatlon-nunez', '#FFD400')
returning id;
```

Guardá el `id` que devuelve. Después, cargá actividades y profesionales
(podés repetir esto para cada centro que se sume):

```sql
insert into actividades (centro_id, nombre, codigo, tipo, duracion_min, cupo, cancelacion_horas)
values
  ('<centro_id>', 'Kinesiología', 'KI', 'individual', 50, 1, 24),
  ('<centro_id>', 'Masajes', 'MA', 'individual', 45, 1, 12),
  ('<centro_id>', 'Pilates', 'PI', 'grupal', 50, 8, 2),
  ('<centro_id>', 'Clases grupales', 'CL', 'grupal', 60, 20, 2),
  ('<centro_id>', 'Personal trainer', 'PT', 'individual', 60, 1, 4);
```

Para que una actividad tenga horarios reservables, necesita filas en
`disponibilidad` (día de semana 0=domingo..6=sábado):

```sql
insert into disponibilidad (actividad_id, dia_semana, hora_inicio, hora_fin)
values ('<actividad_id>', 1, '08:00', '20:00'); -- lunes 8 a 20
```

Esto también se puede hacer desde el panel: **Actividades → elegí los días
y tocá +/− en horas por día** (el editor de franjas horarias puntuales por
día queda en `/admin/actividades`).

## 4. Crear el primer usuario administrador

1. En Supabase → **Authentication → Users → Add user**, creá el usuario con
   email y contraseña del dueño/gerente del centro.
2. Vinculalo al centro:

```sql
insert into centro_usuarios (centro_id, user_id, rol)
values ('<centro_id>', '<user_id_de_auth>', 'admin');
```

3. Entrá a `/admin` con ese email y contraseña.

## 5. Probar la página pública

`/r/megatlon-nunez` (o el slug que hayas usado) — ahí reserva el cliente
final, sin necesidad de cuenta.

## 6. Publicar en Vercel

```bash
npm i -g vercel   # si no lo tenés
vercel
```

En el panel de Vercel, agregá las mismas variables de entorno
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) en **Settings →
Environment Variables**, y volvé a desplegar.

## Estructura del proyecto

```
src/
  components/UI.tsx        componentes compartidos (tarjetas, botones, etc.)
  lib/                      cliente de Supabase, tipos, hooks de datos
  pages/Reservar.tsx        página pública de reserva (mobile-first)
  pages/admin/              panel del centro: Agenda, Actividades, Clientes, Login
  styles/tokens.ts          colores y tipografías (gym-data + amarillo)
supabase/schema.sql         esquema completo + RLS + función de reserva
```

## Cómo cobrarles a los centros

El modelo de datos no incluye facturación: `centros.plan_activo` es un
booleano simple para cortar el acceso si un centro deja de pagar el abono
mensual (podés revisarlo a mano o automatizarlo después con un cron que
lo consulte contra tu sistema de cobro).

## Qué falta para producción real

- **Emails de confirmación:** hoy no se envían. Lo más simple es un Edge
  Function de Supabase que escuche inserts en `turnos` (o Postgres
  webhooks) y dispare un email transaccional (Resend, Postmark).
- **Reprogramar/cancelar desde el link de confirmación:** el MVP no genera
  un link único por turno todavía; se puede sumar un token en `turnos`.
- **Selector de profesional:** hoy el sistema asigna automáticamente el
  primer profesional de la actividad. Si una actividad tiene varios
  responsables, conviene dejar que el cliente elija.
- **Multi-centro por usuario:** el modelo ya lo soporta (`centro_usuarios`
  es N a N), falta el selector en el panel si un mismo admin maneja más
  de un centro.
