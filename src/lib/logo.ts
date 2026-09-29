import { supabase } from "./supabase";

/** Sube una imagen al bucket público "logos" (se usa tanto para el logo
 *  de un centro como para la foto de una actividad) y devuelve la URL
 *  pública para guardar en la base. `carpeta` es el prefijo de ruta,
 *  por ejemplo el id del centro, o "<centroId>/act-<actividadId>". */
export async function subirImagen(carpeta: string, archivo: File): Promise<string | null> {
  const ext = archivo.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${carpeta}/img-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from("logos").upload(path, archivo, {
    upsert: true,
    contentType: archivo.type || undefined
  });
  if (error) return null;

  const { data } = supabase.storage.from("logos").getPublicUrl(path);
  return data.publicUrl;
}

/** @deprecated usar subirImagen(centroId, archivo) */
export const subirLogo = subirImagen;
