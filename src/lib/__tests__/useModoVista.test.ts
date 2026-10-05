import { describe, expect, it } from "vitest";
import { calcularModoVista, BREAKPOINT_MOVIL } from "../useModoVista";

describe("calcularModoVista", () => {
  it("sin preferencia forzada y pantalla angosta, devuelve movil", () => {
    expect(calcularModoVista(BREAKPOINT_MOVIL - 1, null)).toBe("movil");
  });

  it("sin preferencia forzada y pantalla ancha, devuelve escritorio", () => {
    expect(calcularModoVista(BREAKPOINT_MOVIL, null)).toBe("escritorio");
  });

  it("preferencia forzada a movil gana aunque la pantalla sea ancha", () => {
    expect(calcularModoVista(1920, "movil")).toBe("movil");
  });

  it("preferencia forzada a escritorio gana aunque la pantalla sea angosta", () => {
    expect(calcularModoVista(320, "escritorio")).toBe("escritorio");
  });
});
