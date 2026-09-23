import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { Actividad, Centro, Disponibilidad, Profesional } from "./database.types";

export interface CentroCompleto {
  centro: Centro;
  actividades: Actividad[];
  profesionales: Profesional[];
  profesionalesPorActividad: Record<string, string[]>; // actividad_id -> profesional_id[]
  disponibilidad: Disponibilidad[];
}

const SIN_RESULTADOS = ["00000000-0000-0000-0000-000000000000"];

/** Carga todo lo necesario para renderizar la página pública de reservas
 *  de un centro, a partir de su slug en la URL (/r/:slug). */
export function useCentro(slug: string | undefined) {
  const [data, setData] = useState<CentroCompleto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelado = false;

    async function cargar() {
      setLoading(true);
      setError(null);

      const { data: centroData, error: eCentro } = await supabase
        .from("centros")
        .select("*")
        .eq("slug", slug)
        .single();

      if (eCentro || !centroData) {
        if (!cancelado) {
          setError("No encontramos este centro. Revisá el enlace.");
          setLoading(false);
        }
        return;
      }
      const centro = centroData as Centro;

      const { data: actividadesData } = await supabase
        .from("actividades")
        .select("*")
        .eq("centro_id", centro.id)
        .eq("activa", true)
        .order("orden");
      const actividades = (actividadesData ?? []) as Actividad[];
      const idsActividades = actividades.length ? actividades.map((a) => a.id) : SIN_RESULTADOS;

      const [{ data: profesionalesData }, { data: relData }, { data: disponibilidadData }] = await Promise.all([
        supabase.from("profesionales").select("*").eq("centro_id", centro.id).eq("activo", true),
        supabase.from("actividad_profesionales").select("actividad_id, profesional_id").in("actividad_id", idsActividades),
        supabase.from("disponibilidad").select("*").in("actividad_id", idsActividades)
      ]);

      const profesionales = (profesionalesData ?? []) as Profesional[];
      const rel = (relData ?? []) as { actividad_id: string; profesional_id: string }[];
      const disponibilidad = (disponibilidadData ?? []) as Disponibilidad[];

      const profesionalesPorActividad: Record<string, string[]> = {};
      for (const r of rel) {
        (profesionalesPorActividad[r.actividad_id] ??= []).push(r.profesional_id);
      }

      if (!cancelado) {
        setData({ centro, actividades, profesionales, profesionalesPorActividad, disponibilidad });
        setLoading(false);
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, [slug]);

  return { ...data, loading, error } as Partial<CentroCompleto> & { loading: boolean; error: string | null };
}
