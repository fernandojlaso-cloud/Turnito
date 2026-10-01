import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const turnoMock = {
  id: "turno-1",
  centro_id: "centro-1",
  cliente_id: "cliente-1",
  actividad_id: "actividad-1",
  estado: "confirmado",
  inicio: new Date().toISOString(),
  checkin_en: null
};
const clienteMock = {
  id: "cliente-1",
  nombre: "Ana Pérez",
  alergias: "Polen",
  condiciones_medicas: null,
  medicacion: null,
  observaciones_medicas: null
};
const actividadMock = { id: "actividad-1", nombre: "Pilates" };

function tabla(nombre: string) {
  const datosPorTabla: Record<string, unknown> = { turnos: turnoMock, clientes: clienteMock, actividades: actividadMock };
  return {
    select: () => ({
      eq: () => ({
        maybeSingle: () => Promise.resolve({ data: datosPorTabla[nombre] })
      })
    }),
    update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) })
  };
}

vi.mock("../supabase", () => ({
  supabase: { from: (nombre: string) => tabla(nombre) }
}));

import { useAccesos } from "../useAccesos";

describe("useAccesos.procesarQr", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve ok con alertaMedica true cuando el cliente tiene datos médicos", async () => {
    const { result } = renderHook(() => useAccesos({ id: "centro-1" } as any));
    const escaneo = await result.current.procesarQr("turno-1");
    expect(escaneo.resultado).toEqual({ tipo: "ok" });
    expect(escaneo.clienteNombre).toBe("Ana Pérez");
    expect(escaneo.actividadNombre).toBe("Pilates");
    expect(escaneo.alertaMedica).toBe(true);
  });
});
