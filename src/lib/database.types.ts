// Tipos manuales alineados a supabase/schema.sql.
// Cuando el esquema crezca, reemplazar por los tipos generados con:
//   npx supabase gen types typescript --project-id <id> > src/lib/database.types.ts

export type TipoActividad = "individual" | "grupal";
export type EstadoTurno = "pendiente" | "confirmado" | "cancelado" | "asistio" | "no_asistio";
export type CategoriaActividad =
  | "consultorio_medico"
  | "kinesiologia_traumatologia_kiropraxia"
  | "masajes"
  | "pilates"
  | "clases_grupales"
  | "canchas_futbol_padel_tenis"
  | "personal_trainer";

export interface Centro {
  id: string;
  nombre: string;
  slug: string;
  logo_url: string | null;
  telefono_whatsapp: string | null;
  color_acento: string;
  plan_activo: boolean;
  aprobado: boolean;
  creado_en: string;
}

export interface Profesional {
  id: string;
  centro_id: string;
  nombre: string;
  iniciales: string;
  activo: boolean;
  especialidad: string | null;
  es_cancha: boolean;
}

export interface Actividad {
  id: string;
  centro_id: string;
  nombre: string;
  codigo: string;
  categoria: CategoriaActividad | null;
  tipo: TipoActividad;
  duracion_min: number;
  cupo: number;
  cancelacion_horas: number;
  activa: boolean;
  orden: number;
  direccion: string | null;
  imagen_url: string | null;
}

export interface Disponibilidad {
  id: string;
  actividad_id: string;
  dia_semana: number; // 0 domingo .. 6 sábado
  hora_inicio: string; // "HH:MM:SS"
  hora_fin: string;
  solo_socios_activos: boolean;
}

export interface Cliente {
  id: string;
  centro_id: string;
  nombre: string;
  email: string;
  telefono: string;
  dni: string | null;
  activo: boolean;
  obra_social: string | null;
  contacto_emergencia_nombre: string | null;
  contacto_emergencia_telefono: string | null;
  alergias: string | null;
  condiciones_medicas: string | null;
  medicacion: string | null;
  observaciones_medicas: string | null;
  clases_compradas: number;
  clases_usadas: number;
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
  checkin_en: string | null;
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
