import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { construirEmail } from "./email.ts";

Deno.test("construirEmail arma el asunto con la actividad", () => {
  const { subject } = construirEmail({
    clienteNombre: "Ana Pérez",
    centroNombre: "Megatlon Núñez",
    actividadNombre: "Pilates",
    diaLargo: "jueves 1 de octubre",
    hora: "15:00"
  });
  assertEquals(subject, "Tu turno de Pilates en Megatlon Núñez");
});

Deno.test("construirEmail incluye el nombre del cliente y el horario en el HTML", () => {
  const { html } = construirEmail({
    clienteNombre: "Ana Pérez",
    centroNombre: "Megatlon Núñez",
    actividadNombre: "Pilates",
    diaLargo: "jueves 1 de octubre",
    hora: "15:00"
  });
  assertStringIncludes(html, "Ana Pérez");
  assertStringIncludes(html, "jueves 1 de octubre");
  assertStringIncludes(html, "15:00");
  assertStringIncludes(html, "cid:qr-turno");
});
