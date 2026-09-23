import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatearHora, linkWhatsapp } from "@/lib/slots";
import type { Actividad, Centro, Cliente, EstadoTurno, Profesional, Turno } from "@/lib/database.types";
import AdminLayout from "./AdminLayout";
import { tokens } from "@/styles/tokens";

const { color, font } = tokens;

export default function Clientes({ centro }: { centro: Centro }) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    async function cargar() {
      const [{ data: cs }, { data: ts }, { data: acts }, { data: pros }] = await Promise.all([
        supabase.from("clientes").select("*").eq("centro_id", centro.id).order("nombre"),
        supabase.from("turnos").select("*").eq("centro_id", centro.id).order("inicio", { ascending: false }),
        supabase.from("actividades").select("*").eq("centro_id", centro.id),
        supabase.from("profesionales").select("*").eq("centro_id", centro.id)
      ]);
      setClientes(cs ?? []);
      setTurnos(ts ?? []);
      setActividades(acts ?? []);
      setProfesionales(pros ?? []);
      setSelId((cs ?? [])[0]?.id ?? null);
    }
    cargar();
  }, [centro.id]);

  const actsById = useMemo(() => new Map(actividades.map((a) => [a.id, a])), [actividades]);
  const prosById = useMemo(() => new Map(profesionales.map((p) => [p.id, p])), [profesionales]);

  const filtrados = clientes.filter((c) => {
    const q = busqueda.toLowerCase();
    return !q || c.nombre.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.telefono.includes(q);
  });

  const actual = clientes.find((c) => c.id === selId) ?? null;
  const historial = actual ? turnos.filter((t) => t.cliente_id === actual.id) : [];

  const contar = (estado: EstadoTurno) => historial.filter((t) => t.estado === estado).length;
  const proximos = historial.filter((t) => new Date(t.inicio) >= new Date() && t.estado !== "cancelado").length;

  return (
    <AdminLayout centro={centro}>
      <div style={{ height: 72, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
        <h1 style={{ margin: 0, fontFamily: font.display, fontWeight: 600, fontSize: 32 }}>Clientes</h1>
        <p style={{ margin: "6px 0 0", fontSize: 15, color: color.textSoft }}>
          Cada cliente queda identificado por su email y teléfono, con el historial de todos sus turnos.
        </p>
      </div>

      <div style={{ display: "flex", gap: 24, marginTop: 24, minHeight: 0 }}>
        <section style={{ width: 360, flex: "none", background: color.surface, border: `1px solid ${color.border}`, borderRadius: 20, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="search"
            placeholder="Buscar por nombre, email o teléfono"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ height: 48, boxSizing: "border-box", padding: "0 14px", borderRadius: 12, border: `1px solid ${color.borderStrong}`, fontSize: 14 }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filtrados.map((c) => {
              const selected = c.id === selId;
              const iniciales = c.nombre.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
              const cant = turnos.filter((t) => t.cliente_id === c.id).length;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelId(c.id)}
                  aria-pressed={selected}
                  style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", height: 72, boxSizing: "border-box", padding: "0 14px", borderRadius: 14, textAlign: "left", background: selected ? centro.color_acento : color.surface, border: `1px solid ${selected ? color.ink : color.border}` }}
                >
                  <span style={{ width: 42, height: 42, flex: "none", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.mono, fontSize: 13, fontWeight: 600, background: selected ? color.ink : color.bg, color: selected ? centro.color_acento : color.ink }}>
                    {iniciales}
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{c.nombre}</span>
                    <span style={{ fontSize: 13, color: color.textSoft }}>{cant} {cant === 1 ? "turno" : "turnos"}</span>
                  </span>
                </button>
              );
            })}
            {!filtrados.length && <p style={{ color: color.textMuted, fontSize: 14, padding: 8 }}>Sin clientes todavía.</p>}
          </div>
        </section>

        {actual && (
          <section style={{ flex: 1, minWidth: 0, background: color.surface, border: `1px solid ${color.border}`, borderRadius: 20, padding: 32, display: "flex", flexDirection: "column", gap: 28 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ width: 72, height: 72, flex: "none", borderRadius: "50%", background: color.ink, color: centro.color_acento, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.mono, fontSize: 22, fontWeight: 600 }}>
                  {actual.nombre.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontFamily: font.display, fontWeight: 600, fontSize: 28 }}>{actual.nombre}</h2>
                  <div style={{ marginTop: 6, display: "flex", gap: 16, fontSize: 14, color: color.textSoft }}>
                    <span>{actual.email}</span>
                    <span style={{ fontFamily: font.mono }}>{actual.telefono}</span>
                  </div>
                </div>
              </div>
              <a
                href={linkWhatsapp(actual.telefono, `¡Hola ${actual.nombre.split(" ")[0]}!`)}
                target="_blank"
                rel="noreferrer"
                style={{ height: 48, boxSizing: "border-box", padding: "0 20px", display: "flex", alignItems: "center", gap: 10, borderRadius: 14, background: centro.color_acento, fontWeight: 700, fontSize: 15 }}
              >
                WhatsApp
              </a>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12 }}>
              <Stat value={contar("asistio")} label="Asistencias" />
              <Stat value={contar("cancelado")} label="Cancelaciones" />
              <Stat value={contar("no_asistio")} label="Faltas sin aviso" />
              <Stat value={proximos} label="Próximos turnos" />
            </div>

            <div>
              <div style={{ fontFamily: font.mono, fontSize: 12, letterSpacing: "0.1em", color: color.textMuted, paddingBottom: 12 }}>HISTORIAL DE TURNOS</div>
              <div style={{ height: 40, display: "grid", gridTemplateColumns: "90px minmax(0,1fr) minmax(0,1fr) 130px", gap: 16, alignItems: "center", borderBottom: `1px solid ${color.border}`, fontFamily: font.mono, fontSize: 12, letterSpacing: "0.08em", color: color.textMuted }}>
                <span>FECHA</span>
                <span>ACTIVIDAD</span>
                <span>RESPONSABLE</span>
                <span>ESTADO</span>
              </div>
              {historial.map((t) => {
                const act = actsById.get(t.actividad_id);
                const pro = t.profesional_id ? prosById.get(t.profesional_id) : null;
                let bg = color.bg;
                let fg = color.ink;
                if (t.estado === "confirmado" || t.estado === "pendiente") bg = centro.color_acento;
                if (t.estado === "no_asistio") {
                  bg = color.ink;
                  fg = "#FFFFFF";
                }
                return (
                  <div key={t.id} style={{ height: 56, display: "grid", gridTemplateColumns: "90px minmax(0,1fr) minmax(0,1fr) 130px", gap: 16, alignItems: "center", borderBottom: `1px solid ${color.border}` }}>
                    <span style={{ fontFamily: font.mono, fontSize: 14, fontWeight: 600 }}>
                      {new Date(t.inicio).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{act?.nombre ?? "—"}</span>
                    <span style={{ fontSize: 15 }}>{pro?.nombre ?? "—"}</span>
                    <span>
                      <span style={{ display: "inline-flex", alignItems: "center", height: 28, padding: "0 12px", borderRadius: 999, fontSize: 13, fontWeight: 700, background: bg, color: fg }}>
                        {t.estado === "asistio" ? "Asistió" : t.estado === "no_asistio" ? "No asistió" : t.estado === "cancelado" ? "Cancelado" : formatearHora(new Date(t.inicio))}
                      </span>
                    </span>
                  </div>
                );
              })}
              {!historial.length && <p style={{ color: color.textMuted, fontSize: 14, padding: "16px 0" }}>Todavía no tiene turnos.</p>}
            </div>
          </section>
        )}
      </div>
    </AdminLayout>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ background: color.bg, borderRadius: 14, padding: "16px 18px" }}>
      <div style={{ fontFamily: font.display, fontWeight: 600, fontSize: 28 }}>{value}</div>
      <div style={{ marginTop: 2, fontSize: 13, fontWeight: 600, color: color.textSoft }}>{label}</div>
    </div>
  );
}
