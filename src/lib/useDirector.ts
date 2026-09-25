import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { Centro } from "./database.types";

/** Resuelve si el usuario logueado es "director" (super admin, gestiona
 *  todos los centros) en vez de admin de un centro puntual. */
export function useSesionDirector() {
  const [esDirector, setEsDirector] = useState(false);
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

      const { data } = await supabase.from("super_admins").select("user_id").eq("user_id", user.id).maybeSingle();

      if (activo) {
        setEsDirector(!!data);
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

  return { esDirector, cargando, autenticado };
}

/** CRUD de centros para la vista de Director. */
export function useCentrosDirector() {
  const [centros, setCentros] = useState<Centro[]>([]);
  const [cargando, setCargando] = useState(true);

  async function recargar() {
    setCargando(true);
    const { data } = await supabase.from("centros").select("*").order("nombre");
    setCentros((data ?? []) as Centro[]);
    setCargando(false);
  }

  useEffect(() => {
    recargar();
  }, []);

  function slugify(nombre: string): string {
    return nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  async function crear(nombre: string): Promise<string | null> {
    const slugBase = slugify(nombre);
    let slug = slugBase;
    let intento = 1;
    // Evita colisión de slug si ya existe un centro con ese nombre.
    // (Chequeo simple en el cliente; el índice unique en la base es la
    // garantía real contra condiciones de carrera.)
    while (centros.some((c) => c.slug === slug)) {
      intento += 1;
      slug = `${slugBase}-${intento}`;
    }
    const { data, error } = await supabase
      .from("centros")
      .insert({ nombre, slug, color_acento: "#FFD400", plan_activo: true })
      .select()
      .single();
    if (error || !data) return null;
    await recargar();
    return (data as Centro).id;
  }

  async function actualizar(id: string, cambios: Partial<Centro>) {
    setCentros((prev) => prev.map((c) => (c.id === id ? { ...c, ...cambios } : c)));
    await supabase.from("centros").update(cambios).eq("id", id);
  }

  async function alternarPlan(id: string, activo: boolean) {
    await actualizar(id, { plan_activo: activo });
  }

  return { centros, cargando, crear, actualizar, alternarPlan };
}
