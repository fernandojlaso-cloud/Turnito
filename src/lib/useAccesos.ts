import { useState } from "react";
import { supabase } from "./supabase";
import { validarEscaneo, tieneAlertaMedica, type ResultadoEscaneo } from "./accesosLogic";
import type { Centro } from "./database.types";

export interface EscaneoUI {
  resultado: ResultadoEscaneo;
  clienteNombre?: string;
  actividadNombre?: string;
  hora?: string;
  alertaMedica?: boolean;
}

export function useAccesos(centro: Centro) {
  const [procesando, setProcesando] = useState(false);

  async function procesarQr(turnoId: string): Promise<EscaneoUI> {
    setProcesando(true);
    const { data: turno } = await supabase.from("turnos").select("*").eq("id", turnoId).maybeSingle();
    const resultado = validarEscaneo(turno, centro.id, new Date());

    if (resultado.tipo !== "ok" || !turno) {
      setProcesando(false);
      return { resultado };
    }

    const [{ data: cliente }, { data: actividad }] = await Promise.all([
      supabase.from("clientes").select("*").eq("id", turno.cliente_id).maybeSingle(),
      supabase.from("actividades").select("*").eq("id", turno.actividad_id).maybeSingle()
    ]);

    await supabase.from("turnos").update({ estado: "asistio", checkin_en: new Date().toISOString() }).eq("id", turnoId);

    setProcesando(false);
    return {
      resultado,
      clienteNombre: cliente?.nombre,
      actividadNombre: actividad?.nombre,
      hora: new Date(turno.inicio).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
      alertaMedica: cliente ? tieneAlertaMedica(cliente) : false
    };
  }

  return { procesarQr, procesando };
}
