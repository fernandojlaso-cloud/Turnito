export type ResultadoEscaneo =
  | { tipo: "ok" }
  | { tipo: "ya_registrado"; checkinEn: string }
  | { tipo: "no_corresponde_hoy" }
  | { tipo: "cancelado" }
  | { tipo: "no_encontrado" };

export const VENTANA_ANTES_MIN = 30;
export const VENTANA_DESPUES_MIN = 120;

interface TurnoParaValidar {
  centro_id: string;
  estado: string;
  inicio: string;
  checkin_en: string | null;
}

export function validarEscaneo(turno: TurnoParaValidar | null, centroId: string, ahora: Date): ResultadoEscaneo {
  if (!turno || turno.centro_id !== centroId) return { tipo: "no_encontrado" };
  if (turno.estado === "cancelado") return { tipo: "cancelado" };
  if (turno.checkin_en) return { tipo: "ya_registrado", checkinEn: turno.checkin_en };

  const inicio = new Date(turno.inicio).getTime();
  const desde = inicio - VENTANA_ANTES_MIN * 60_000;
  const hasta = inicio + VENTANA_DESPUES_MIN * 60_000;
  const ahoraMs = ahora.getTime();
  if (ahoraMs < desde || ahoraMs > hasta) return { tipo: "no_corresponde_hoy" };

  return { tipo: "ok" };
}

interface ClienteParaAlerta {
  alergias: string | null;
  condiciones_medicas: string | null;
  medicacion: string | null;
  observaciones_medicas: string | null;
}

export function tieneAlertaMedica(cliente: ClienteParaAlerta): boolean {
  return [cliente.alergias, cliente.condiciones_medicas, cliente.medicacion, cliente.observaciones_medicas].some(
    (valor) => !!valor && valor.trim().length > 0
  );
}

interface ActividadParaClases {
  categoria: string | null;
}

/** Las clases compradas/usadas solo aplican a Pilates y clases
 *  grupales — en consultorio médico, kinesiología, masajes, personal
 *  trainer y canchas no se descuenta nada. */
export function debeDescontarClase(actividad: ActividadParaClases | null | undefined): boolean {
  return actividad?.categoria === "pilates" || actividad?.categoria === "clases_grupales";
}
