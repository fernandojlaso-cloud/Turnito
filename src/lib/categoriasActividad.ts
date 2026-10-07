import type { CategoriaActividad } from "./database.types";

/** Las 7 categorías fijas de actividad. El panel de Actividades solo
 *  deja elegir entre estas — no se puede escribir un nombre de
 *  categoría libre. */
export const CATEGORIAS_ACTIVIDAD: { valor: CategoriaActividad; etiqueta: string }[] = [
  { valor: "consultorio_medico", etiqueta: "Consultorio médico" },
  { valor: "kinesiologia_traumatologia_kiropraxia", etiqueta: "Kinesiología, traumatología o kiropraxia" },
  { valor: "masajes", etiqueta: "Masajes" },
  { valor: "pilates", etiqueta: "Pilates" },
  { valor: "clases_grupales", etiqueta: "Clases grupales" },
  { valor: "canchas_futbol_padel_tenis", etiqueta: "Canchas de fútbol, pádel, tenis" },
  { valor: "personal_trainer", etiqueta: "Personal trainer" }
];

/** Los únicos 3 deportes de la categoría "canchas". No es texto libre:
 *  se elige uno de estos tres. */
export const DEPORTES_CANCHA = ["Fútbol", "Pádel", "Tenis"] as const;

export function etiquetaCategoria(categoria: CategoriaActividad | null | undefined): string {
  return CATEGORIAS_ACTIVIDAD.find((c) => c.valor === categoria)?.etiqueta ?? "";
}

/** Arma el nombre a mostrar de una actividad según su categoría.
 *  "Clases grupales" y "Canchas" incorporan el sub-nombre que eligió
 *  el admin (el tipo de clase, o el deporte); las demás categorías
 *  tienen un nombre fijo, no editable. */
export function nombreDesdeCategoria(categoria: CategoriaActividad, subNombre: string): string {
  const limpio = subNombre.trim();
  if (categoria === "clases_grupales") {
    return limpio ? `Clases grupales: ${limpio}` : "Clases grupales";
  }
  if (categoria === "canchas_futbol_padel_tenis") {
    return limpio ? `Cancha de ${limpio}` : "Canchas de fútbol, pádel, tenis";
  }
  return etiquetaCategoria(categoria);
}
