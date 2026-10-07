import { describe, it, expect } from "vitest";
import { etiquetaCategoria, nombreDesdeCategoria } from "../categoriasActividad";

describe("etiquetaCategoria", () => {
  it("devuelve la etiqueta fija de una categoría conocida", () => {
    expect(etiquetaCategoria("pilates")).toBe("Pilates");
  });

  it("devuelve texto vacío si no hay categoría", () => {
    expect(etiquetaCategoria(null)).toBe("");
    expect(etiquetaCategoria(undefined)).toBe("");
  });
});

describe("nombreDesdeCategoria", () => {
  it("usa la etiqueta fija para categorías sin sub-nombre", () => {
    expect(nombreDesdeCategoria("masajes", "")).toBe("Masajes");
  });

  it("agrega el sub-nombre libre para clases grupales", () => {
    expect(nombreDesdeCategoria("clases_grupales", "Aeróbica")).toBe("Clases grupales: Aeróbica");
  });

  it("usa el nombre genérico de clases grupales si no hay sub-nombre", () => {
    expect(nombreDesdeCategoria("clases_grupales", "")).toBe("Clases grupales");
  });

  it("agrega el deporte elegido para canchas", () => {
    expect(nombreDesdeCategoria("canchas_futbol_padel_tenis", "Pádel")).toBe("Cancha de Pádel");
  });

  it("usa el nombre genérico de canchas si no hay deporte elegido", () => {
    expect(nombreDesdeCategoria("canchas_futbol_padel_tenis", "")).toBe("Canchas de fútbol, pádel, tenis");
  });
});
