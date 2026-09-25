// Tipos manuales alineados a supabase/schema.sql.
// Cuando el esquema crezca, reemplazar por los tipos generados con:
//   npx supabase gen types typescript --project-id <id> > src/lib/database.types.ts

export type TipoActividad = "individual" | "grupal";
export type EstadoTurno = "pendiente" | "confirmado" | "cancelado" | "asistio" | "no_asistio";

export interface Centro {
  id: string;
  nombre: string;
  slug: string;
  logo_url: string | null;
  color_acento: string;
  plan_activo: boolean;
  creado_en: string;
}

export interface Profesional {
  id: string;
  centro_id: string;
  nombre: string;
  iniciales: string;
  activo: boolean;
}

export interface Actividad {
  id: string;
  centro_id: string;
  nombre: string;
  codigo: string;
  tipo: TipoActividad;
  duracion_min: number;
  cupo: number;
  cancelacion_horas: number;
  activa: boolean;
  orden: number;
}

export interface Disponibilidad {
  id: string;
  actividad_id: string;
  dia_semana: number; // 0 domingo .. 6 sábado
  hora_inicio: string; // "HH:MM:SS"
  hora_fin: string;
}

export interface Cliente {
  id: string;
  centro_id: string;
  nombre: string;
  email: string;
  telefono: string;
  activo: boolean;
  creado_en: string;
}

export interface Turno {
  id: string;
  centro_id: string;
  actividad_id: string;
  profesional_id: string | null;
  cliente_id: string;
  inicio: string;
  fin: string;
  estado: EstadoTurno;
  creado_en: string;
}

// Minimal shape que espera @supabase/supabase-js para createClient<Database>.
// No modela cada tabla en detalle: alcanza para tipar los `.from(...)` que
// usamos hoy sin bloquear el desarrollo.
export interface Database {
  public: {
    Tables: {
      centros: { Row: Centro; Insert: Partial<Centro>; Update: Partial<Centro> };
      profesionales: { Row: Profesional; Insert: Partial<Profesional>; Update: Partial<Profesional> };
      actividades: { Row: Actividad; Insert: Partial<Actividad>; Update: Partial<Actividad> };
      disponibilidad: { Row: Disponibilidad; Insert: Partial<Disponibilidad>; Update: Partial<Disponibilidad> };
      clientes: { Row: Cliente; Insert: Partial<Cliente>; Update: Partial<Cliente> };
      turnos: { Row: Turno; Insert: Partial<Turno>; Update: Partial<Turno> };
    };
  };
}
