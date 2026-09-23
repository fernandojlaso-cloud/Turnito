import type { Actividad, Disponibilidad, Turno } from "./database.types";

export interface Slot {
  inicio: Date;
  fin: Date;
  disponible: boolean;
  cuposLibres: number | null; // null en individuales
}

/** Arma la grilla de horarios posibles de una actividad para un día dado,
 *  a partir de su disponibilidad semanal, y marca cada uno como libre u
 *  ocupado según los turnos ya existentes. */
export function calcularSlots(
  actividad: Actividad,
  disponibilidad: Disponibilidad[],
  dia: Date,
  turnosDelDia: Turno[]
): Slot[] {
  const diaSemana = dia.getDay();
  const franjas = disponibilidad.filter((d) => d.dia_semana === diaSemana);
  const slots: Slot[] = [];

  for (const franja of franjas) {
    const [hIni, mIni] = franja.hora_inicio.split(":").map(Number);
    const [hFin, mFin] = franja.hora_fin.split(":").map(Number);

    let cursor = new Date(dia);
    cursor.setHours(hIni, mIni, 0, 0);
    const limite = new Date(dia);
    limite.setHours(hFin, mFin, 0, 0);

    while (cursor.getTime() + actividad.duracion_min * 60000 <= limite.getTime()) {
      const inicio = new Date(cursor);
      const fin = new Date(cursor.getTime() + actividad.duracion_min * 60000);

      const ocupantes = turnosDelDia.filter(
        (t) =>
          t.actividad_id === actividad.id &&
          t.estado !== "cancelado" &&
          new Date(t.inicio).getTime() === inicio.getTime()
      ).length;

      const cuposLibres = actividad.tipo === "grupal" ? actividad.cupo - ocupantes : null;
      const disponible = actividad.tipo === "grupal" ? (cuposLibres as number) > 0 : ocupantes === 0;

      slots.push({ inicio, fin, disponible, cuposLibres });
      cursor = new Date(cursor.getTime() + actividad.duracion_min * 60000);
    }
  }

  return slots.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
}

export function formatearHora(d: Date): string {
  return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function formatearDiaLargo(d: Date): string {
  const s = d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Enlace wa.me con mensaje precargado, sin costo y sin API de WhatsApp. */
export function linkWhatsapp(telefono: string, mensaje: string): string {
  const numero = telefono.replace(/\D/g, "");
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
