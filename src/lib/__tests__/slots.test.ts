import { describe, it, expect } from "vitest";
import { calcularSlots } from "../slots";
import type { Actividad, Disponibilidad, Turno } from "../database.types";

function actividadBase(overrides: Partial<Actividad> = {}): Actividad {
  return {
    id: "act-1",
    centro_id: "centro-1",
    nombre: "Actividad 1",
    codigo: "A1",
    categoria: null,
    tipo: "individual",
    duracion_min: 60,
    cupo: 1,
    cancelacion_horas: 2,
    activa: true,
    orden: 0,
    direccion: null,
    imagen_url: null,
    ...overrides
  };
}

function franja(overrides: Partial<Disponibilidad> = {}): Disponibilidad {
  return {
    id: "disp-1",
    actividad_id: "act-1",
    dia_semana: 1,
    hora_inicio: "09:00:00",
    hora_fin: "10:00:00",
    solo_socios_activos: false,
    ...overrides
  };
}

// Lunes 2026-10-12, para que dia.getDay() === 1.
const LUNES = new Date("2026-10-12T00:00:00");

describe("calcularSlots", () => {
  it("solo usa los horarios de la actividad elegida, no los de otras actividades del mismo día", () => {
    const actividadA = actividadBase({ id: "act-A", duracion_min: 60 });
    const disponibilidad: Disponibilidad[] = [
      franja({ id: "d-A", actividad_id: "act-A", dia_semana: 1, hora_inicio: "09:00:00", hora_fin: "10:00:00" }),
      franja({ id: "d-B", actividad_id: "act-B", dia_semana: 1, hora_inicio: "12:00:00", hora_fin: "13:00:00" })
    ];
    const turnosDelDia: Turno[] = [];

    const slots = calcularSlots(actividadA, disponibilidad, LUNES, turnosDelDia);

    expect(slots).toHaveLength(1);
    expect(slots[0].inicio.getHours()).toBe(9);
  });

  it("usa el aviso de solo socios de la franja de la actividad elegida, no de otra", () => {
    const actividadA = actividadBase({ id: "act-A", duracion_min: 60 });
    const disponibilidad: Disponibilidad[] = [
      franja({ id: "d-A", actividad_id: "act-A", dia_semana: 1, hora_inicio: "09:00:00", hora_fin: "10:00:00", solo_socios_activos: false }),
      franja({ id: "d-B", actividad_id: "act-B", dia_semana: 1, hora_inicio: "09:00:00", hora_fin: "10:00:00", solo_socios_activos: true })
    ];

    const slots = calcularSlots(actividadA, disponibilidad, LUNES, []);

    expect(slots).toHaveLength(1);
    expect(slots[0].soloSocios).toBe(false);
  });
});
