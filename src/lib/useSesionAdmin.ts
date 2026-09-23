import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { Centro } from "./database.types";

/** Resuelve el centro del usuario logueado, vía centro_usuarios.
 *  Asume un admin por centro en el MVP (multi-centro por usuario queda
 *  para una iteración futura: alcanzaría con un selector). */
export function useSesionAdmin() {
  const [centro, setCentro] = useState<Centro | null>(null);
  const [cargando, setCargando] = useState(true);
  const [autenticado, setAutenticado] = useState(false);

  useEffect(() => {
    let activo = true;

    async function resolver() {
      const { data: sesion } = await supabase.auth.getSession();
      const user = sesion.session?.user;
      if (!user) {
        if (activo) {
          setAutenticado(false);
          setCargando(false);
        }
        return;
      }
      if (activo) setAutenticado(true);

      const { data: cu } = await supabase
        .from("centro_usuarios")
        .select("centro_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (!cu) {
        if (activo) setCargando(false);
        return;
      }

      const { data: c } = await supabase.from("centros").select("*").eq("id", cu.centro_id).single();
      if (activo) {
        setCentro(c ?? null);
        setCargando(false);
      }
    }

    resolver();
    const { data: sub } = supabase.auth.onAuthStateChange(() => resolver());
    return () => {
      activo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { centro, cargando, autenticado };
}
