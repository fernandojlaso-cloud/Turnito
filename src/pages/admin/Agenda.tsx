import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatearHora, linkWhatsapp } from "@/lib/slots";
import type { Actividad, Centro, Cliente, EstadoTurno, Profesional, Turno } from "@/lib/database.types";
import AdminLayout from "./AdminLayout";
import { tokens } from "@/styles/tokens";

const { color, font } = tokens;

interface FilaAgenda {
  turno: Turno;
  actividad: Actividad;
  cliente: Cliente;
  profesional: Profesional | null;
}

export default function Agenda({ centro }: { centro: Centro }) {
  const [filas, setFilas] = useState<FilaAgenda[]>([]);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [filtro, setFiltro] = useState<string>("all");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    async function cargar() {
      setCargando(true);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const manana = new Date(hoy.getTime() + 86400000);

      const [{ data: turnos }, { data: acts }, { data: pros }, { data: clientes }] = await Promise.all([
        supabase
          .from("turnos")
          .select("*")
          .eq("centro_id", centro.id)
          .gte("inicio", hoy.toISOString())
          .lt("inicio", manana.toISOString())
          .order("inicio"),
        supabase.from("actividades").select("*").eq("centro_id", centro.id),
        supabase.from("profesionales").select("*").eq("centro_id", centro.id),
        supabase.from("clientes").select("*").eq("centro_id", centro.id)
      ]);

      if (!activo) return;
      const actsById = new Map((acts ?? []).map((a) => [a.id, a]));
      const prosById = new Map((pros ?? []).map((p) => [p.id, p]));
      const clientesById = new Map((clientes ?? []).map((c) => [c.id, c]));

      const filasArmadas: FilaAgenda[] = (turnos ?? [])
        .map((t) => {
          const actividad = actsById.get(t.actividad_id);
          const cliente = clientesById.get(t.cliente_id);
          if (!actividad || !cliente) return null;
          return { turno: t, actividad, cliente, profesional: t.profesional_id ? prosById.get(t.profesional_id) ?? null : null };
        })
        .filter((f): f is FilaAgenda => f !== null);

      setActividades(acts ?? []);
      setFilas(filasArmadas);
      setCargando(false);
    }
    cargar();
    return () => {
      activo = false;
    };
  }, [centro.id]);

  const visibles = useMemo(
    () => (filtro === "all" ? filas : filas.filter((f) => f.actividad.id === filtro)),
    [filas, filtro]
  );

  async function cambiarEstado(turnoId: string, estado: EstadoTurno) {
    setFilas((prev) => prev.map((f) => (f.turno.id === turnoId ? { ...f, turno: { ...f.turno, estado } } : f)));
    await supabase.from("turnos").update({ estado }).eq("id", turnoId);
  }

  return (
    <AdminLayout centro={centro}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: 72 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: font.display, fontWeight: 600, fontSize: 32 }}>Agenda</h1>
          <p style={{ margin: "6px 0 0", fontSize: 15, color: color.textSoft }}>
            {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })} ·{" "}
            {cargando ? "cargando…" : `${visibles.length} turnos`}
          </p>
        </div>
        <a
          href={`/r/${centro.slug}`}
          target="_blank"
          rel="noreferrer"
          style={{
            height: 48,
            boxSizing: "border-box",
            padding: "0 20px",
            display: "flex",
            alignItems: "center",
            borderRadius: 14,
            border: `1px solid ${color.borderStrong}`,
            background: color.surface,
            fontWeight: 700,
            fontSize: 15
          }}
        >
          Ver página pública
        </a>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "20px 0" }}>
        <Chip label="Todas" active={filtro === "all"} onClick={() => setFiltro("all")} accent={centro.color_acento} count={filas.length} />
        {actividades.map((a) => (
          <Chip
            key={a.id}
            label={a.nombre}
            active={filtro === a.id}
            onClick={() => setFiltro(a.id)}
            accent={centro.color_acento}
            count={filas.filter((f) => f.actividad.id === a.id).length}
          />
        ))}
      </div>

      <section style={{ background: color.surface, border: `1px solid ${color.border}`, borderRadius: 20, overflow: "hidden" }}>
        <div
          style={{
            height: 48,
            boxSizing: "border-box",
            padding: "0 24px",
            display: "grid",
            gridTemplateColumns: "80px 170px minmax(0,1fr) minmax(0,1fr) 130px 90px",
            gap: 16,
            alignItems: "center",
            borderBottom: `1px solid ${color.border}`,
            fontFamily: font.mono,
            fontSize: 12,
            letterSpacing: "0.08em",
            color: color.textMuted
          }}
        >
          <span>HORA</span>
          <span>ACTIVIDAD</span>
          <span>CLIENTE</span>
          <span>RESPONSABLE</span>
          <span>ESTADO</span>
          <span>AVISO</span>
        </div>
        {visibles.map((f) => (
          <FilaTurno key={f.turno.id} fila={f} accent={centro.color_acento} onEstado={cambiarEstado} />
        ))}
        {!cargando && !visibles.length && (
          <div style={{ padding: 24, color: color.textMuted, fontSize: 14 }}>No hay turnos para este filtro hoy.</div>
        )}
      </section>
    </AdminLayout>
  );
}

function Chip({
  label,
  count,
  active,
  onClick,
  accent
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  accent: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      style={{
        height: 44,
        boxSizing: "border-box",
        padding: "0 18px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        borderRadius: 999,
        border: `1px solid ${active ? color.ink : color.borderStrong}`,
        background: active ? accent : color.surface,
        fontSize: 14,
        fontWeight: 700
      }}
    >
      {label}
      <span style={{ fontFamily: font.mono, fontSize: 12, color: color.textSoft }}>{count}</span>
    </button>
  );
}

const estadoLabel: Record<EstadoTurno, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  cancelado: "Cancelado",
  asistio: "Asistió",
  no_asistio: "No asistió"
};

function FilaTurno({
  fila,
  accent,
  onEstado
}: {
  fila: FilaAgenda;
  accent: string;
  onEstado: (id: string, estado: EstadoTurno) => void;
}) {
  const { turno, actividad, cliente, profesional } = fila;
  const grupal = actividad.tipo === "grupal";
  let bg = color.bg;
  let fg = color.ink;
  if (turno.estado === "pendiente") bg = accent;
  if (turno.estado === "no_asistio") {
    bg = color.ink;
    fg = "#FFFFFF";
  }

  return (
    <div
      style={{
        height: 64,
        boxSizing: "border-box",
        padding: "0 24px",
        display: "grid",
        gridTemplateColumns: "80px 170px minmax(0,1fr) minmax(0,1fr) 130px 90px",
        gap: 16,
        alignItems: "center",
        borderBottom: `1px solid ${color.border}`
      }}
    >
      <span style={{ fontFamily: font.mono, fontSize: 15, fontWeight: 600 }}>{formatearHora(new Date(turno.inicio))}</span>
      <span>
        <span style={{ display: "inline-flex", alignItems: "center", height: 30, padding: "0 12px", borderRadius: 999, background: color.bg, fontSize: 13, fontWeight: 700 }}>
          {actividad.nombre}
        </span>
      </span>
      <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>{cliente.nombre}</span>
        <span style={{ fontSize: 13, color: color.textMuted }}>{grupal ? "Grupal" : "Individual"}</span>
      </span>
      <span style={{ fontSize: 15 }}>{profesional?.nombre ?? "—"}</span>
      <select
        value={turno.estado}
        onChange={(e) => onEstado(turno.id, e.target.value as EstadoTurno)}
        style={{
          height: 28,
          borderRadius: 999,
          padding: "0 10px",
          fontSize: 13,
          fontWeight: 700,
          background: bg,
          color: fg,
          border: "none"
        }}
      >
        {Object.entries(estadoLabel).map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      <a
        href={linkWhatsapp(cliente.telefono, `Hola ${cliente.nombre.split(" ")[0]}, te escribimos por tu turno de ${actividad.nombre} de hoy a las ${formatearHora(new Date(turno.inicio))}.`)}
        target="_blank"
        rel="noreferrer"
        aria-label={`Enviar recordatorio por WhatsApp a ${cliente.nombre}`}
        style={{
          width: 40,
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 12,
          border: `1px solid ${color.borderStrong}`,
          background: color.surface
        }}
      >
        WA
      </a>
    </div>
  );
}
