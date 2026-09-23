import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Actividad, Centro, Disponibilidad } from "@/lib/database.types";
import AdminLayout from "./AdminLayout";
import { tokens } from "@/styles/tokens";

const { color, font } = tokens;
const dias = ["D", "L", "M", "X", "J", "V", "S"]; // índice = getDay()
const diasLargos = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function Actividades({ centro }: { centro: Centro }) {
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad[]>([]);
  const [selId, setSelId] = useState<string | null>(null);

  useEffect(() => {
    async function cargar() {
      const [{ data: acts }, { data: disp }] = await Promise.all([
        supabase.from("actividades").select("*").eq("centro_id", centro.id).order("orden"),
        supabase.from("disponibilidad").select("*")
      ]);
      setActividades(acts ?? []);
      setDisponibilidad(disp ?? []);
      setSelId((acts ?? [])[0]?.id ?? null);
    }
    cargar();
  }, [centro.id]);

  const actual = actividades.find((a) => a.id === selId) ?? null;

  async function patch(id: string, cambios: Partial<Actividad>) {
    setActividades((prev) => prev.map((a) => (a.id === id ? { ...a, ...cambios } : a)));
    await supabase.from("actividades").update(cambios).eq("id", id);
  }

  async function toggleDia(actividadId: string, diaSemana: number) {
    const existente = disponibilidad.find((d) => d.actividad_id === actividadId && d.dia_semana === diaSemana);
    if (existente) {
      setDisponibilidad((prev) => prev.filter((d) => d.id !== existente.id));
      await supabase.from("disponibilidad").delete().eq("id", existente.id);
    } else {
      const { data } = await supabase
        .from("disponibilidad")
        .insert({ actividad_id: actividadId, dia_semana: diaSemana, hora_inicio: "09:00", hora_fin: "18:00" })
        .select()
        .single();
      if (data) setDisponibilidad((prev) => [...prev, data]);
    }
  }

  async function editarFranja(id: string, cambios: Partial<Disponibilidad>) {
    setDisponibilidad((prev) => prev.map((d) => (d.id === id ? { ...d, ...cambios } : d)));
    await supabase.from("disponibilidad").update(cambios).eq("id", id);
  }

  const franjasDeActual = actual ? disponibilidad.filter((d) => d.actividad_id === actual.id) : [];

  return (
    <AdminLayout centro={centro}>
      <div style={{ height: 72, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
        <h1 style={{ margin: 0, fontFamily: font.display, fontWeight: 600, fontSize: 32 }}>Actividades</h1>
        <p style={{ margin: "6px 0 0", fontSize: 15, color: color.textSoft }}>
          {actividades.filter((a) => a.activa).length} de {actividades.length} activas · activá las que ofrece tu centro y configurá cada una.
        </p>
      </div>

      <div style={{ display: "flex", gap: 24, marginTop: 24, alignItems: "flex-start" }}>
        <section style={{ width: 380, flex: "none", background: color.surface, border: `1px solid ${color.border}`, borderRadius: 20, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {actividades.map((a) => {
            const selected = a.id === selId;
            return (
              <div
                key={a.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  height: 76,
                  padding: "0 16px 0 0",
                  borderRadius: 16,
                  background: selected ? centro.color_acento : color.surface,
                  border: `1px solid ${selected ? color.ink : color.border}`
                }}
              >
                <button
                  onClick={() => setSelId(a.id)}
                  style={{ flex: 1, minWidth: 0, height: "100%", display: "flex", alignItems: "center", gap: 14, padding: "0 0 0 14px", background: "transparent", border: 0, textAlign: "left" }}
                >
                  <span
                    style={{
                      width: 44,
                      height: 44,
                      flex: "none",
                      borderRadius: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: font.mono,
                      fontSize: 13,
                      fontWeight: 600,
                      background: selected ? color.ink : color.bg,
                      color: selected ? centro.color_acento : color.ink
                    }}
                  >
                    {a.codigo}
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>{a.nombre}</span>
                    <span style={{ fontSize: 13, color: color.textSoft }}>{a.activa ? `${a.tipo === "grupal" ? "Grupal" : "Individual"} · ${a.duracion_min} min` : "Desactivada"}</span>
                  </span>
                </button>
                <button
                  role="switch"
                  aria-checked={a.activa}
                  aria-label={(a.activa ? "Desactivar " : "Activar ") + a.nombre}
                  onClick={() => patch(a.id, { activa: !a.activa })}
                  style={{
                    width: 52,
                    height: 30,
                    flex: "none",
                    boxSizing: "border-box",
                    padding: 3,
                    borderRadius: 15,
                    border: `1px solid ${color.ink}`,
                    background: a.activa ? color.ink : color.borderStrong,
                    display: "flex",
                    justifyContent: a.activa ? "flex-end" : "flex-start"
                  }}
                >
                  <span style={{ width: 22, height: 22, borderRadius: "50%", background: a.activa ? centro.color_acento : "#FFFFFF" }} />
                </button>
              </div>
            );
          })}
        </section>

        {actual && (
          <section style={{ flex: 1, minWidth: 0, background: color.surface, border: `1px solid ${color.border}`, borderRadius: 20, padding: 32, display: "flex", flexDirection: "column", gap: 28, opacity: actual.activa ? 1 : 0.5 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: color.ink, color: centro.color_acento, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.mono, fontSize: 16, fontWeight: 600 }}>
                {actual.codigo}
              </div>
              <h2 style={{ margin: 0, fontFamily: font.display, fontWeight: 600, fontSize: 26 }}>{actual.nombre}</h2>
            </div>

            <Row label="TIPO DE TURNO">
              <Segmented
                options={["individual", "grupal"]}
                labels={["Individual", "Grupal"]}
                value={actual.tipo}
                accent={centro.color_acento}
                onChange={(v) => patch(actual.id, { tipo: v as Actividad["tipo"], cupo: v === "grupal" ? Math.max(actual.cupo, 8) : 1 })}
              />
            </Row>

            <Row label="DURACIÓN (MIN)">
              <div style={{ display: "flex", gap: 8 }}>
                {[30, 45, 50, 60].map((v) => (
                  <Chip key={v} label={String(v)} selected={actual.duracion_min === v} accent={centro.color_acento} onClick={() => patch(actual.id, { duracion_min: v })} />
                ))}
              </div>
            </Row>

            {actual.tipo === "grupal" && (
              <Row label="CUPO POR TURNO">
                <Stepper value={actual.cupo} min={2} max={40} onChange={(v) => patch(actual.id, { cupo: v })} suffix="personas" />
              </Row>
            )}

            <Row label="CANCELACIÓN GRATIS HASTA">
              <div style={{ display: "flex", gap: 8 }}>
                {[1, 2, 4, 12, 24].map((v) => (
                  <Chip key={v} label={`${v} h`} selected={actual.cancelacion_horas === v} accent={centro.color_acento} onClick={() => patch(actual.id, { cancelacion_horas: v })} />
                ))}
              </div>
            </Row>

            <Row label="DÍAS Y HORARIOS DISPONIBLES">
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  {dias.map((letra, i) => {
                    const on = franjasDeActual.some((f) => f.dia_semana === i);
                    return (
                      <button
                        key={i}
                        onClick={() => toggleDia(actual.id, i)}
                        aria-pressed={on}
                        aria-label={diasLargos[i]}
                        style={{ width: 48, height: 48, borderRadius: 12, border: `1px solid ${on ? color.ink : color.borderStrong}`, background: on ? centro.color_acento : color.surface, fontSize: 15, fontWeight: 700 }}
                      >
                        {letra}
                      </button>
                    );
                  })}
                </div>
                {franjasDeActual
                  .slice()
                  .sort((a, b) => a.dia_semana - b.dia_semana)
                  .map((f) => (
                    <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
                      <span style={{ width: 90, fontWeight: 700 }}>{diasLargos[f.dia_semana]}</span>
                      <input
                        type="time"
                        value={f.hora_inicio.slice(0, 5)}
                        onChange={(e) => editarFranja(f.id, { hora_inicio: e.target.value })}
                        style={{ height: 40, borderRadius: 10, border: `1px solid ${color.borderStrong}`, padding: "0 10px" }}
                      />
                      <span>a</span>
                      <input
                        type="time"
                        value={f.hora_fin.slice(0, 5)}
                        onChange={(e) => editarFranja(f.id, { hora_fin: e.target.value })}
                        style={{ height: 40, borderRadius: 10, border: `1px solid ${color.borderStrong}`, padding: "0 10px" }}
                      />
                    </div>
                  ))}
              </div>
            </Row>
          </section>
        )}
      </div>
    </AdminLayout>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontFamily: font.mono, fontSize: 12, letterSpacing: "0.1em", color: color.textMuted }}>{label}</div>
      {children}
    </div>
  );
}

function Segmented({
  options,
  labels,
  value,
  onChange,
  accent
}: {
  options: string[];
  labels: string[];
  value: string;
  onChange: (v: string) => void;
  accent: string;
}) {
  return (
    <div style={{ display: "flex", padding: 4, gap: 4, borderRadius: 14, background: color.bg, width: 280 }}>
      {options.map((opt, i) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          aria-pressed={value === opt}
          style={{ flex: 1, height: 40, borderRadius: 10, border: 0, fontSize: 14, fontWeight: 700, background: value === opt ? accent : "transparent" }}
        >
          {labels[i]}
        </button>
      ))}
    </div>
  );
}

function Chip({ label, selected, onClick, accent }: { label: string; selected: boolean; onClick: () => void; accent: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      style={{ minWidth: 56, height: 48, borderRadius: 12, border: `1px solid ${selected ? color.ink : color.borderStrong}`, background: selected ? accent : color.surface, fontFamily: font.mono, fontSize: 14, fontWeight: 600 }}
    >
      {label}
    </button>
  );
}

function Stepper({ value, min, max, onChange, suffix }: { value: number; min: number; max: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, height: 48 }}>
      <button onClick={() => onChange(Math.max(min, value - 1))} aria-label="Menos" style={{ width: 44, height: 44, borderRadius: 12, border: `1px solid ${color.borderStrong}`, background: color.surface, fontSize: 22 }}>
        −
      </button>
      <span style={{ minWidth: 40, textAlign: "center", fontFamily: font.mono, fontSize: 22, fontWeight: 600 }}>{value}</span>
      <button onClick={() => onChange(Math.min(max, value + 1))} aria-label="Más" style={{ width: 44, height: 44, borderRadius: 12, border: `1px solid ${color.borderStrong}`, background: color.surface, fontSize: 22 }}>
        +
      </button>
      {suffix && <span style={{ fontSize: 14, color: color.textSoft }}>{suffix}</span>}
    </div>
  );
}
