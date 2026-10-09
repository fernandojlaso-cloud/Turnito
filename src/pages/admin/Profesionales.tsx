import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Actividad, Centro, Profesional } from "@/lib/database.types";
import AdminLayout from "./AdminLayout";
import { tokens } from "@/styles/tokens";
import { Field, PrimaryButton } from "@/components/UI";
import MaestroDetalle from "@/components/admin/MaestroDetalle";
import { useModoVista } from "@/lib/useModoVista";

const { color, font } = tokens;

export default function Profesionales({ centro }: { centro: Centro }) {
  const { modo } = useModoVista();
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [vinculos, setVinculos] = useState<{ actividad_id: string; profesional_id: string }[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [cargando, setCargando] = useState(true);

  async function recargar() {
    const [{ data: pros }, { data: acts }, { data: rel }] = await Promise.all([
      supabase.from("profesionales").select("*").eq("centro_id", centro.id).order("nombre"),
      supabase.from("actividades").select("*").eq("centro_id", centro.id).order("orden"),
      supabase.from("actividad_profesionales").select("actividad_id, profesional_id")
    ]);
    setProfesionales((pros ?? []) as Profesional[]);
    setActividades((acts ?? []) as Actividad[]);
    setVinculos((rel ?? []) as { actividad_id: string; profesional_id: string }[]);
    setCargando(false);
    return (pros ?? []) as Profesional[];
  }

  useEffect(() => {
    recargar().then((pros) => setSelId(pros[0]?.id ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centro.id]);

  const actividadesDeCentro = useMemo(
    () => actividades.filter((a) => vinculos.some((v) => v.profesional_id === selId && v.actividad_id === a.id)),
    [actividades, vinculos, selId]
  );

  async function crear(nombre: string, iniciales: string, esCancha: boolean) {
    const { data, error } = await supabase
      .from("profesionales")
      .insert({ centro_id: centro.id, nombre, iniciales, activo: true, es_cancha: esCancha })
      .select()
      .single();
    if (!error && data) {
      await recargar();
      setSelId((data as Profesional).id);
      setCreando(false);
    }
    return !error;
  }

  async function actualizar(id: string, cambios: Partial<Profesional>) {
    const nuevosProfesionales = profesionales.map((p) => (p.id === id ? { ...p, ...cambios } : p));
    setProfesionales(nuevosProfesionales);
    await supabase.from("profesionales").update(cambios).eq("id", id);

    if ("activo" in cambios) {
      const profesional = nuevosProfesionales.find((p) => p.id === id);
      if (profesional?.es_cancha) {
        const actividadesVinculadas = vinculos.filter((v) => v.profesional_id === id).map((v) => v.actividad_id);
        for (const actividadId of actividadesVinculadas) {
          await sincronizarCupoCancha(actividadId, nuevosProfesionales, vinculos);
        }
      }
    }
  }

  async function toggleActividad(actividadId: string) {
    if (!selId) return;
    const existe = vinculos.some((v) => v.profesional_id === selId && v.actividad_id === actividadId);
    const nuevosVinculos = existe
      ? vinculos.filter((v) => !(v.profesional_id === selId && v.actividad_id === actividadId))
      : [...vinculos, { profesional_id: selId, actividad_id: actividadId }];
    setVinculos(nuevosVinculos);

    if (existe) {
      await supabase.from("actividad_profesionales").delete().eq("profesional_id", selId).eq("actividad_id", actividadId);
    } else {
      await supabase.from("actividad_profesionales").insert({ profesional_id: selId, actividad_id: actividadId });
    }

    // Para canchas, el cupo no se escribe a mano: se recalcula solo, según
    // cuántas canchas activas quedaron vinculadas a esta actividad.
    await sincronizarCupoCancha(actividadId, profesionales, nuevosVinculos);
  }

  function contarCanchasActivas(
    actividadId: string,
    profesionalesActuales: Profesional[],
    vinculosActuales: { actividad_id: string; profesional_id: string }[]
  ) {
    return profesionalesActuales.filter(
      (p) => p.es_cancha && p.activo && vinculosActuales.some((v) => v.actividad_id === actividadId && v.profesional_id === p.id)
    ).length;
  }

  async function sincronizarCupoCancha(
    actividadId: string,
    profesionalesActuales: Profesional[],
    vinculosActuales: { actividad_id: string; profesional_id: string }[]
  ) {
    const actividad = actividades.find((a) => a.id === actividadId);
    if (!actividad || actividad.categoria !== "canchas_futbol_padel_tenis") return;
    const nuevoCupo = contarCanchasActivas(actividadId, profesionalesActuales, vinculosActuales);
    if (nuevoCupo === actividad.cupo) return;
    setActividades((prev) => prev.map((a) => (a.id === actividadId ? { ...a, cupo: nuevoCupo } : a)));
    await supabase.from("actividades").update({ cupo: nuevoCupo }).eq("id", actividadId);
  }

  const actual = profesionales.find((p) => p.id === selId) ?? null;

  // Una cancha solo puede vincularse a actividades de categoría "canchas";
  // un profesional humano, a cualquier otra. Esto evita vincular una cancha
  // por error a actividades que no le corresponden (o al revés).
  const actividadesParaVincular = useMemo(
    () =>
      actividades.filter((a) =>
        actual?.es_cancha ? a.categoria === "canchas_futbol_padel_tenis" : a.categoria !== "canchas_futbol_padel_tenis"
      ),
    [actividades, actual]
  );

  return (
    <AdminLayout centro={centro}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end", justifyContent: "space-between", minHeight: 72 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: font.display, fontWeight: 600, fontSize: 32 }}>Profesionales</h1>
          <p style={{ margin: "6px 0 0", fontSize: 15, color: color.textSoft }}>
            Los responsables que aparecen en cada actividad y en la agenda.
          </p>
        </div>
        <button
          onClick={() => {
            setCreando(true);
            setSelId(null);
          }}
          style={{ minHeight: 48, padding: "12px 20px", borderRadius: 14, border: 0, background: centro.color_acento, fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}
        >
          + Nuevo profesional
        </button>
      </div>

      <MaestroDetalle
        hayDetalle={creando || !!actual}
        onVolver={() => {
          setCreando(false);
          setSelId(null);
        }}
        lista={
          <section style={{ width: modo === "movil" ? "100%" : 340, flex: "none", background: color.surface, border: `1px solid ${color.border}`, borderRadius: 20, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {!cargando && !profesionales.length && (
              <p style={{ color: color.textMuted, fontSize: 14, padding: 8 }}>
                Usá "+ Nuevo profesional" para cargar el primero.
              </p>
            )}
            {profesionales.map((p) => {
              const selected = p.id === selId;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelId(p.id);
                    setCreando(false);
                  }}
                  aria-pressed={selected}
                  style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", height: 68, boxSizing: "border-box", padding: "0 14px", borderRadius: 14, textAlign: "left", background: selected ? centro.color_acento : color.surface, border: `1px solid ${selected ? color.ink : color.border}`, opacity: p.activo ? 1 : 0.55 }}
                >
                  <span style={{ width: 40, height: 40, flex: "none", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.mono, fontSize: 13, fontWeight: 600, background: selected ? color.ink : color.bg, color: selected ? centro.color_acento : color.ink }}>
                    {p.iniciales}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{p.nombre}{!p.activo && " (baja)"}</span>
                </button>
              );
            })}
          </section>
        }
        detalle={
          creando ? (
            <NuevoProfesionalForm onCancelar={() => setCreando(false)} onCrear={crear} accent={centro.color_acento} />
          ) : actual ? (
            <section style={{ flex: 1, minWidth: 0, maxWidth: 560, background: color.surface, border: `1px solid ${color.border}`, borderRadius: 20, padding: 32, display: "flex", flexDirection: "column", gap: 24 }}>
              <DetalleProfesional profesional={actual} accent={centro.color_acento} onActualizar={actualizar} />

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontFamily: font.mono, fontSize: 12, letterSpacing: "0.1em", color: color.textMuted }}>
                  {actual?.es_cancha ? "ACTIVIDAD DE ESTA CANCHA" : "ACTIVIDADES A CARGO"}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {actividadesParaVincular.map((a) => {
                    const asignado = vinculos.some((v) => v.profesional_id === selId && v.actividad_id === a.id);
                    return (
                      <button
                        key={a.id}
                        onClick={() => toggleActividad(a.id)}
                        aria-pressed={asignado}
                        style={{ height: 40, padding: "0 16px", borderRadius: 999, border: `1px solid ${asignado ? color.ink : color.borderStrong}`, background: asignado ? centro.color_acento : color.surface, fontWeight: 700, fontSize: 14 }}
                      >
                        {a.nombre}
                      </button>
                    );
                  })}
                  {!actividadesParaVincular.length && (
                    <p style={{ color: color.textMuted, fontSize: 14 }}>
                      {actual?.es_cancha
                        ? 'Todavía no hay ninguna actividad de categoría "Canchas de fútbol, pádel, tenis". Creala primero en Actividades.'
                        : "Todavía no hay actividades cargadas."}
                    </p>
                  )}
                </div>
                {!!actividadesDeCentro.length && (
                  <p style={{ fontSize: 13, color: color.textMuted, margin: 0 }}>
                    Va a aparecer como responsable en: {actividadesDeCentro.map((a) => a.nombre).join(", ")}.
                  </p>
                )}
              </div>
            </section>
          ) : (
            <section style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", color: color.textMuted, fontSize: 15 }}>
              Elegí un profesional de la lista, o creá el primero.
            </section>
          )
        }
      />
    </AdminLayout>
  );
}

function NuevoProfesionalForm({
  onCancelar,
  onCrear,
  accent
}: {
  onCancelar: () => void;
  onCrear: (nombre: string, iniciales: string, esCancha: boolean) => Promise<boolean>;
  accent: string;
}) {
  const [esCancha, setEsCancha] = useState(false);
  const [nombre, setNombre] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const iniciales = nombre
    .trim()
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const valido = nombre.trim().length > 1;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valido) return;
    setGuardando(true);
    setError(null);
    const ok = await onCrear(nombre.trim(), esCancha ? "⚽" : iniciales || "??", esCancha);
    setGuardando(false);
    if (!ok) setError("No se pudo crear. Probá de nuevo.");
  }

  return (
    <section style={{ flex: 1, minWidth: 0, maxWidth: 420, background: color.surface, border: `1px solid ${color.border}`, borderRadius: 20, padding: 32, display: "flex", flexDirection: "column", gap: 20 }}>
      <h2 style={{ margin: 0, fontFamily: font.display, fontWeight: 600, fontSize: 24 }}>Nuevo profesional</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600 }}>
          <input type="checkbox" checked={esCancha} onChange={(e) => setEsCancha(e.target.checked)} />
          Es una cancha (fútbol, pádel o tenis), no una persona
        </label>
        <Field
          id="np-nombre"
          label={esCancha ? "Nombre de la cancha" : "Nombre"}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder={esCancha ? "Ej. Cancha de pádel 1" : "Ej. Prof. Julieta D."}
        />
        {error && <p style={{ color: "#8A1418", fontSize: 14, margin: 0 }}>{error}</p>}
        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="button"
            onClick={onCancelar}
            style={{ flex: 1, height: 48, borderRadius: 14, border: `1px solid ${color.borderStrong}`, background: color.surface, fontWeight: 700, fontSize: 15 }}
          >
            Cancelar
          </button>
          <div style={{ flex: 1 }}>
            <PrimaryButton accent={accent} disabled={!valido || guardando} type="submit">
              {guardando ? "Creando…" : "Crear"}
            </PrimaryButton>
          </div>
        </div>
      </form>
    </section>
  );
}

function DetalleProfesional({
  profesional,
  accent,
  onActualizar
}: {
  profesional: Profesional;
  accent: string;
  onActualizar: (id: string, cambios: Partial<Profesional>) => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(profesional.nombre);
  const [especialidad, setEspecialidad] = useState(profesional.especialidad ?? "");
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    setGuardando(true);
    const iniciales = profesional.es_cancha
      ? profesional.iniciales
      : nombre.trim().split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "??";
    await onActualizar(profesional.id, { nombre, iniciales, especialidad: especialidad.trim() || null });
    setGuardando(false);
    setEditando(false);
  }

  if (editando) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 360 }}>
        <Field id="ep-nombre" label={profesional.es_cancha ? "Nombre de la cancha" : "Nombre"} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        {!profesional.es_cancha && (
          <Field
            id="ep-especialidad"
            label="Especialidad (opcional)"
            value={especialidad}
            onChange={(e) => setEspecialidad(e.target.value)}
            placeholder="Ej. Dermatología, Oculista"
          />
        )}
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => {
              setEditando(false);
              setNombre(profesional.nombre);
              setEspecialidad(profesional.especialidad ?? "");
            }}
            style={{ flex: 1, height: 44, borderRadius: 12, border: `1px solid ${color.borderStrong}`, background: color.surface, fontWeight: 700, fontSize: 14 }}
          >
            Cancelar
          </button>
          <div style={{ flex: 1 }}>
            <PrimaryButton accent={accent} onClick={guardar} disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar"}
            </PrimaryButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: color.ink, color: accent, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.mono, fontSize: 16, fontWeight: 600 }}>
          {profesional.iniciales}
        </div>
        <div>
          <h2 style={{ margin: 0, fontFamily: font.display, fontWeight: 600, fontSize: 24 }}>{profesional.nombre}</h2>
          {profesional.especialidad && (
            <p style={{ margin: "2px 0 0", fontSize: 14, color: color.textSoft }}>{profesional.especialidad}</p>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={() => setEditando(true)}
          style={{ height: 40, padding: "0 14px", borderRadius: 10, border: `1px solid ${color.borderStrong}`, background: color.surface, fontWeight: 700, fontSize: 13 }}
        >
          Editar
        </button>
        <button
          onClick={() => onActualizar(profesional.id, { activo: !profesional.activo })}
          style={{
            height: 40,
            padding: "0 14px",
            borderRadius: 10,
            border: profesional.activo ? "1px solid #8A1418" : "none",
            background: profesional.activo ? color.surface : "#2E9E5B",
            color: profesional.activo ? "#8A1418" : "#FFFFFF",
            fontWeight: 700,
            fontSize: 13
          }}
        >
          {profesional.activo ? "Dar de baja" : "Reactivar"}
        </button>
      </div>
    </div>
  );
}
