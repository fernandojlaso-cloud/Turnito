import { useState } from "react";
import { supabase } from "./supabase";

interface ReservarInput {
  centroId: string;
  actividadId: string;
  profesionalId: string | null;
  inicio: Date;
  nombre: string;
  email: string;
  telefono: string;
  dni: string;
}

export function useReservar() {
  const [reservando, setReservando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reservar(input: ReservarInput): Promise<string | null> {
    setReservando(true);
    setError(null);

    const { data, error: e } = await (supabase.rpc as any)("reservar_turno", {
      p_centro_id: input.centroId,
      p_actividad_id: input.actividadId,
      p_profesional_id: input.profesionalId,
      p_inicio: input.inicio.toISOString(),
      p_nombre: input.nombre,
      p_email: input.email,
      p_telefono: input.telefono,
      p_dni: input.dni
    });

    setReservando(false);

    if (e) {
      let mensaje = "No pudimos confirmar el turno. Probá de nuevo.";
      if (e.message.includes("cupo")) {
        mensaje = "Ese horario ya no tiene cupo. Elegí otro.";
      } else if (e.message.includes("socios")) {
        mensaje = "Este horario es solo para socios activos. Buscá un horario sin esa marca, o date de alta primero con el centro.";
      } else if (e.message.includes("cancha")) {
        mensaje = "No quedan canchas libres para ese horario. Elegí otro.";
      }
      setError(mensaje);
      return null;
    }

    return data as string; // id del turno creado
  }

  return { reservar, reservando, error };
}
