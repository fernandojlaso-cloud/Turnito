import { describe, it, expect } from "vitest";
import { validarEscaneo, tieneAlertaMedica, debeDescontarClase } from "../accesosLogic";

const CENTRO_A = "11111111-1111-1111-1111-111111111111";
const CENTRO_B = "22222222-2222-2222-2222-222222222222";

function turnoBase(overrides: Partial<Parameters<typeof validarEscaneo>[0]> = {}) {
  return {
    id: "turno-1",
    centro_id: CENTRO_A,
    estado: "confirmado" as const,
    inicio: new Date("2026-10-01T15:00:00Z").toISOString(),
    checkin_en: null,
    ...overrides
  };
}

describe("validarEscaneo", () => {
  it("devuelve no_encontrado si el turno es null", () => {
    expect(validarEscaneo(null, CENTRO_A, new Date("2026-10-01T15:00:00Z"))).toEqual({ tipo: "no_encontrado" });
  });

  it("devuelve no_encontrado si el turno es de otro centro", () => {
    const turno = turnoBase({ centro_id: CENTRO_B });
    expect(validarEscaneo(turno, CENTRO_A, new Date("2026-10-01T15:00:00Z"))).toEqual({ tipo: "no_encontrado" });
  });

  it("devuelve cancelado si el turno está cancelado", () => {
    const turno = turnoBase({ estado: "cancelado" });
    expect(validarEscaneo(turno, CENTRO_A, new Date("2026-10-01T15:00:00Z"))).toEqual({ tipo: "cancelado" });
  });

  it("devuelve ya_registrado si ya tiene checkin_en", () => {
    const turno = turnoBase({ checkin_en: "2026-10-01T15:01:00Z" });
    expect(validarEscaneo(turno, CENTRO_A, new Date("2026-10-01T15:05:00Z"))).toEqual({
      tipo: "ya_registrado",
      checkinEn: "2026-10-01T15:01:00Z"
    });
  });

  it("devuelve no_corresponde_hoy si faltan más de 30 minutos para el turno", () => {
    const turno = turnoBase();
    expect(validarEscaneo(turno, CENTRO_A, new Date("2026-10-01T14:00:00Z"))).toEqual({ tipo: "no_corresponde_hoy" });
  });

  it("devuelve no_corresponde_hoy si pasaron más de 120 minutos del turno", () => {
    const turno = turnoBase();
    expect(validarEscaneo(turno, CENTRO_A, new Date("2026-10-01T17:01:00Z"))).toEqual({ tipo: "no_corresponde_hoy" });
  });

  it("devuelve ok dentro de la ventana horaria", () => {
    const turno = turnoBase();
    expect(validarEscaneo(turno, CENTRO_A, new Date("2026-10-01T14:35:00Z"))).toEqual({ tipo: "ok" });
    expect(validarEscaneo(turno, CENTRO_A, new Date("2026-10-01T15:00:00Z"))).toEqual({ tipo: "ok" });
    expect(validarEscaneo(turno, CENTRO_A, new Date("2026-10-01T17:00:00Z"))).toEqual({ tipo: "ok" });
  });
});

describe("tieneAlertaMedica", () => {
  it("es false si no hay ningún campo médico cargado", () => {
    expect(
      tieneAlertaMedica({ alergias: null, condiciones_medicas: null, medicacion: null, observaciones_medicas: null })
    ).toBe(false);
  });

  it("es false si solo hay espacios en blanco", () => {
    expect(
      tieneAlertaMedica({ alergias: "   ", condiciones_medicas: null, medicacion: null, observaciones_medicas: null })
    ).toBe(false);
  });

  it("es true si hay alguna alergia cargada", () => {
    expect(
      tieneAlertaMedica({ alergias: "Penicilina", condiciones_medicas: null, medicacion: null, observaciones_medicas: null })
    ).toBe(true);
  });

  it("es true si hay medicación cargada", () => {
    expect(
      tieneAlertaMedica({ alergias: null, condiciones_medicas: null, medicacion: "Insulina", observaciones_medicas: null })
    ).toBe(true);
  });
});

describe("debeDescontarClase", () => {
  it("es true para pilates", () => {
    expect(debeDescontarClase({ categoria: "pilates" })).toBe(true);
  });

  it("es true para clases grupales", () => {
    expect(debeDescontarClase({ categoria: "clases_grupales" })).toBe(true);
  });

  it("es false para otras categorías", () => {
    expect(debeDescontarClase({ categoria: "masajes" })).toBe(false);
    expect(debeDescontarClase({ categoria: "canchas_futbol_padel_tenis" })).toBe(false);
  });

  it("es false si no hay actividad", () => {
    expect(debeDescontarClase(null)).toBe(false);
    expect(debeDescontarClase(undefined)).toBe(false);
  });
});
