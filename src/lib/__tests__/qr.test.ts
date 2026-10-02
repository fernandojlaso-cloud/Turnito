import { describe, it, expect } from "vitest";
import { generarQrDataUrl } from "../qr";

describe("generarQrDataUrl", () => {
  it("genera una data URL de imagen PNG", async () => {
    const url = await generarQrDataUrl("turno-de-prueba");
    expect(url.startsWith("data:image/png;base64,")).toBe(true);
  });
});
