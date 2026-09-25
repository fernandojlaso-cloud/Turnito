import { useState } from "react";
import { useCentrosDirector } from "@/lib/useDirector";
import type { Centro } from "@/lib/database.types";
import { tokens } from "@/styles/tokens";
import { Field, PrimaryButton } from "@/components/UI";

const { color, font } = tokens;

export default function Centros() {
  const { centros, cargando, crear, actualizar, alternarPlan } = useCentrosDirector();
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [creando, setCreando] = useState(false);
  const [selId, setSelId] = useState<string | null>(null);

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    if (!nombreNuevo.trim()) return;
    setCreando(true);
    const id = await crear(nombreNuevo.trim());
    setCreando(false);
    setNombreNuevo("");
    if (id) setSelId(id);
  }

  const actual = centros.find((c) => c.id === selId) ?? null;

  return (
    <div style={{ minHeight: "100vh", background: color.bg, display: "flex" }}>
      <aside
        style={{
          width: 260,
          flex: "none",
          boxSizing: "border-box",
          background: color.ink,
          color: "#FFFFFF",
          padding: "32px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 32
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px" }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: color.accentDefault }} />
          <span style={{ fontFamily: font.display, fontWeight: 700, fontSize: 22 }}>turnito</span>
        </div>
        <div style={{ padding: "0 8px" }}>
          <div style={{ fontFamily: font.mono, fontSize: 12, letterSpacing: "0.1em", color: "#9AA0A6" }}>DIRECTOR</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginTop: 4 }}>Gestión de centros</div>
        </div>

        <form onSubmit={handleCrear} style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 8px" }}>
          <label htmlFor="nuevo-centro" style={{ fontSize: 13, fontWeight: 700, color: "#E4E5E7" }}>
            Nuevo centro
          </label>
          <input
            id="nuevo-centro"
            value={nombreNuevo}
            onChange={(e) => setNombreNuevo(e.target.value)}
            placeholder="Ej. Megatlon Palermo"
            style={{ height: 44, boxSizing: "border-box", padding: "0 12px", borderRadius: 10, border: "1px solid #3A3D42", background: "#1A1B1E", color: "#FFFFFF", fontSize: 14 }}
          />
          <button
            type="submit"
            disabled={!nombreNuevo.trim() || creando}
            style={{ height: 44, borderRadius: 10, border: 0, background: nombreNuevo.trim() ? color.accentDefault : "#3A3D42", color: color.ink, fontWeight: 700, fontSize: 14 }}
          >
            {creando ? "Creando…" : "+ Agregar centro"}
          </button>
        </form>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, overflowY: "auto" }}>
          {centros.map((c) => {
            const selected = c.id === selId;
            return (
              <button
                key={c.id}
                onClick={() => setSelId(c.id)}
                aria-pressed={selected}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  height: 52,
                  boxSizing: "border-box",
                  padding: "0 14px",
                  borderRadius: 12,
                  textAlign: "left",
                  background: selected ? color.accentDefault : "transparent",
                  border: "none",
                  color: selected ? color.ink : "#E4E5E7"
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nombre}</span>
                <span
                  style={{
                    flex: "none",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: c.plan_activo ? "#2E9E5B" : "#8A1418"
                  }}
                  title={c.plan_activo ? "Activo" : "Dado de baja"}
                />
              </button>
            );
          })}
          {!cargando && !centros.length && <p style={{ color: "#9AA0A6", fontSize: 13, padding: "0 8px" }}>Todavía no hay centros cargados.</p>}
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, boxSizing: "border-box", padding: 40 }}>
        {!actual ? (
          <div style={{ color: color.textMuted, fontSize: 15 }}>Elegí un centro de la lista, o creá uno nuevo.</div>
        ) : (
          <DetalleCentro key={actual.id} centro={actual} onActualizar={actualizar} onAlternarPlan={alternarPlan} />
        )}
      </main>
    </div>
  );
}

function DetalleCentro({
  centro,
  onActualizar,
  onAlternarPlan
}: {
  centro: Centro;
  onActualizar: (id: string, cambios: Partial<Centro>) => Promise<void>;
  onAlternarPlan: (id: string, activo: boolean) => Promise<void>;
}) {
  const [nombre, setNombre] = useState(centro.nombre);
  const [colorAcento, setColorAcento] = useState(centro.color_acento);
  const [guardando, setGuardando] = useState(false);

  const huboCambios = nombre !== centro.nombre || colorAcento !== centro.color_acento;

  async function guardar() {
    setGuardando(true);
    await onActualizar(centro.id, { nombre, color_acento: colorAcento });
    setGuardando(false);
  }

  return (
    <div style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 28 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: font.display, fontWeight: 600, fontSize: 30 }}>{centro.nombre}</h1>
          <div style={{ marginTop: 6, fontSize: 14, color: color.textSoft }}>
            Página pública:{" "}
            <a href={`/r/${centro.slug}`} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
              /r/{centro.slug}
            </a>
          </div>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            height: 32,
            padding: "0 14px",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 700,
            background: centro.plan_activo ? "#DFF3E6" : "#F6DADA",
            color: centro.plan_activo ? "#1E7A46" : "#8A1418"
          }}
        >
          {centro.plan_activo ? "Activo" : "Dado de baja"}
        </span>
      </div>

      <section style={{ background: color.surface, border: `1px solid ${color.border}`, borderRadius: 20, padding: 28, display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontFamily: font.mono, fontSize: 12, letterSpacing: "0.1em", color: color.textMuted }}>DATOS DEL CENTRO</div>
        <Field id="nombre-centro" label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="color-centro" style={{ fontSize: 13, fontWeight: 700 }}>
            Color de acento
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input
              id="color-centro"
              type="color"
              value={colorAcento}
              onChange={(e) => setColorAcento(e.target.value)}
              style={{ width: 52, height: 44, borderRadius: 10, border: `1px solid ${color.borderStrong}`, padding: 2 }}
            />
            <span style={{ fontFamily: font.mono, fontSize: 14 }}>{colorAcento}</span>
          </div>
        </div>
        <div style={{ opacity: huboCambios ? 1 : 0.5, pointerEvents: huboCambios ? "auto" : "none" }}>
          <PrimaryButton accent={color.accentDefault} onClick={guardar} disabled={!huboCambios || guardando}>
            {guardando ? "Guardando…" : "Guardar cambios"}
          </PrimaryButton>
        </div>
      </section>

      <section style={{ background: color.surface, border: `1px solid ${color.border}`, borderRadius: 20, padding: 28, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontFamily: font.mono, fontSize: 12, letterSpacing: "0.1em", color: color.textMuted }}>ACCESO AL SISTEMA</div>
        <p style={{ margin: 0, fontSize: 14, color: color.textSoft, lineHeight: 1.6 }}>
          Un centro dado de baja deja de poder usar el panel de administración y la página de reservas queda fuera de
          servicio, sin borrar ningún dato. Es reversible: podés reactivarlo cuando quieras.
        </p>
        <button
          onClick={() => onAlternarPlan(centro.id, !centro.plan_activo)}
          style={{
            alignSelf: "flex-start",
            height: 48,
            padding: "0 22px",
            borderRadius: 14,
            border: centro.plan_activo ? "1px solid #8A1418" : "none",
            background: centro.plan_activo ? "#FFFFFF" : "#2E9E5B",
            color: centro.plan_activo ? "#8A1418" : "#FFFFFF",
            fontWeight: 700,
            fontSize: 15
          }}
        >
          {centro.plan_activo ? "Dar de baja este centro" : "Reactivar este centro"}
        </button>
      </section>
    </div>
  );
}
