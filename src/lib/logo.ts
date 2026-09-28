import { supabase } from "./supabase";

/** Sube el logo de un centro al bucket público "logos" y devuelve la URL
 *  pública para guardar en centros.logo_url. */
export async function subirLogo(centroId: string, archivo: File): Promise<string | null> {
  const ext = archivo.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${centroId}/logo-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from("logos").upload(path, archivo, {
    upsert: true,
    contentType: archivo.type || undefined
  });
  if (error) return null;

  const { data } = supabase.storage.from("logos").getPublicUrl(path);
  return data.publicUrl;
}
