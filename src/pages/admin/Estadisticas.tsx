import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { calcularSlots, formatearHora, linkWhatsapp } from "@/lib/slots";
import type { Actividad, Centro, Cliente, Disponibilidad, EstadoTurno, Turno } from "@/lib/database.types";
import AdminLayout from "./AdminLayout";
import { tokens } from "@/styles/tokens";
import { useModoVista } from "@/lib/useModoVista";

const { color, font } = tokens;

/** Capacidad semanal de una actividad: cuántos turnos posibles entran en
 *  una semana según su disponibilidad, duración y cupo. Es la misma
 *  cuenta que se usa para armar los horarios en la reserva pública, pero
 *  agregada por semana en vez de por día. */
function capacidadSemanal(actividad: Actividad, disponibilidad: Disponibilidad[]): number {
  let turnosPorSemana = 0;
  for (const franja of disponibilidad) {
    const [hIni, mIni] = franja.hora_inicio.split(":").map(Number);
    const [hFin, mFin] = franja.hora_fin.split(":").map(Number);
    const minutosFranja = hFin * 60 + mFin - (hIni * 60 + mIni);
    if (minutosFranja <= 0) continue;
    turnosPorSemana += Math.floor(minutosFranja / actividad.duracion_min);
  }
  const cuposPorTurno = actividad.tipo === "grupal" ? actividad.cupo : 1;
  return turnosPorSemana * cuposPorTurno;
}

function inicioDeSemana(d: Date): Date {
  const dia = new Date(d);
  const diff = (dia.getDay() + 6) % 7; // lunes = 0
  dia.setDate(dia.getDate() - diff);
  dia.setHours(0, 0, 0, 0);
  return dia;
}

const estadoLabel: Record<EstadoTurno, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  cancelado: "Cancelado",
  asistio: "Asistió",
  no_asistio: "No asistió"
};

export default function Estadisticas({ centro }: { centro: Centro }) {
  const { modo } = useModoVista();
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroActividad, setFiltroActividad] = useState<string>("all");
  const [actividadOcupacionId, setActividadOcupacionId] = useState<string | null>(null);
  const [diaOcupacionIdx, setDiaOcupacionIdx] = useState(() => (new Date().getDay() + 6) % 7);

  useEffect(() => {
    async function cargar() {
      const [{ data: acts }, { data: disp }, { data: ts }, { data: cs }] = await Promise.all([
        supabase.from("actividades").select("*").eq("centro_id", centro.id),
        supabase.from("disponibilidad").select("*"),
        supabase.from("turnos").select("*").eq("centro_id", centro.id).order("inicio", { ascending: false }),
        supabase.from("clientes").select("*").eq("centro_id", centro.id)
      ]);
      setActividades((acts ?? []) as Actividad[]);
      setDisponibilidad((disp ?? []) as Disponibilidad[]);
      setTurnos((ts ?? []) as Turno[]);
      setClientes((cs ?? []) as Cliente[]);
      setActividadOcupacionId((prev) => prev ?? (acts ?? [])[0]?.id ?? null);
      setCargando(false);
    }
    cargar();
  }, [centro.id]);

  const inicioSemana = useMemo(() => inicioDeSemana(new Date()), []);
  const finSemana = useMemo(() => new Date(inicioSemana.getTime() + 7 * 86400000), [inicioSemana]);

  const diasSemana = useMemo(
    () => Array.from({ length: 7 }, (_, i) => new Date(inicioSemana.getTime() + i * 86400000)),
    [inicioSemana]
  );

  const actividadOcupacion = actividades.find((a) => a.id === actividadOcupacionId) ?? null;
  const diaOcupacion = diasSemana[diaOcupacionIdx];

  const slotsOcupacion = useMemo(() => {
    if (!actividadOcupacion) return [];
    const disp = disponibilidad.filter((d) => d.actividad_id === actividadOcupacion.id);
    const turnosDelDia = turnos.filter((t) => {
      const inicio = new Date(t.inicio);
      return (
        t.actividad_id === actividadOcupacion.id &&
        inicio.getFullYear() === diaOcupacion.getFullYear() &&
        inicio.getMonth() === diaOcupacion.getMonth() &&
        inicio.getDate() === diaOcupacion.getDate()
      );
    });
    return calcularSlots(actividadOcupacion, disp, diaOcupacion, turnosDelDia);
  }, [actividadOcupacion, disponibilidad, turnos, diaOcupacion]);

  const actsById = useMemo(() => new Map(actividades.map((a) => [a.id, a])), [actividades]);
  const clientesById = useMemo(() => new Map(clientes.map((c) => [c.id, c])), [clientes]);

  const filas = useMemo(() => {
    return actividades.map((a) => {
      const disp = disponibilidad.filter((d) => d.actividad_id === a.id);
      const turnosDeActividad = turnos.filter((t) => t.actividad_id === a.id);
      const turnosSemana = turnosDeActividad.filter((t) => {
        const inicio = new Date(t.inicio);
        return inicio >= inicioSemana && inicio < finSemana;
      });

      const cupos = capacidadSemanal(a, disp);
      const reservados = turnosSemana.filter((t) => t.estado === "pendiente" || t.estado === "confirmado").length;
      const asistidos = turnosDeActividad.filter((t) => t.estado === "asistio").length;
      const cancelados = turnosDeActividad.filter((t) => t.estado === "cancelado").length;
      const noAsistio = turnosDeActividad.filter((t) => t.estado === "no_asistio").length;

      return {
        actividad: a,
        cupos,
        reservados,
        libres: Math.max(0, cupos - reservados),
        ocupacion: cupos > 0 ? Math.round((reservados / cupos) * 100) : 0,
        asistidos,
        cancelados,
        noAsistio
      };
    });
  }, [actividades, disponibilidad, turnos, inicioSemana, finSemana]);

  const totales = useMemo(
    () =>
      filas.reduce(
        (acc, f) => ({
          cupos: acc.cupos + f.cupos,
          reservados: acc.reservados + f.reservados,
          libres: acc.libres + f.libres,
          asistidos: acc.asistidos + f.asistidos,
          cancelados: acc.cancelados + f.cancelados,
          noAsistio: acc.noAsistio + f.noAsistio
        }),
        { cupos: 0, reservados: 0, libres: 0, asistidos: 0, cancelados: 0, noAsistio: 0 }
      ),
    [filas]
  );

  // Reservas tomadas: todos los turnos que no están cancelados, más
  // recientes primero, con los datos del cliente al lado. Es la misma
  // idea que la grilla de la Agenda, pero sin limitarse a un solo día.
  const reservas = useMemo(() => {
    return turnos
      .filter((t) => t.estado !== "cancelado")
      .filter((t) => filtroActividad === "all" || t.actividad_id === filtroActividad)
      .filter((t) => {
        const inicio = new Date(t.inicio);
        return (
          inicio.getFullYear() === diaOcupacion.getFullYear() &&
          inicio.getMonth() === diaOcupacion.getMonth() &&
          inicio.getDate() === diaOcupacion.getDate()
        );
      })
      .map((t) => ({ turno: t, actividad: actsById.get(t.actividad_id), cliente: clientesById.get(t.cliente_id) }))
      .filter((r): r is { turno: Turno; actividad: Actividad; cliente: Cliente } => !!r.actividad && !!r.cliente)
      .slice(0, 100);
  }, [turnos, actsById, clientesById, filtroActividad, diaOcupacion]);

  return (
    <AdminLayout centro={centro}>
      <div style={{ height: 72, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
        <h1 style={{ margin: 0, fontFamily: font.display, fontWeight: 600, fontSize: 32 }}>Estadísticas</h1>
        <p style={{ margin: "6px 0 0", fontSize: 15, color: color.textSoft }}>
          Semana del {inicioSemana.toLocaleDateString("es-AR", { day: "numeric", month: "short" })} · asistencias y
          cancelaciones son de todo el histórico.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: modo === "movil" ? "repeat(2, minmax(0,1fr))" : "repeat(6, minmax(0,1fr))", gap: 12, margin: "24px 0" }}>
        <Stat value={totales.cupos} label="Cupos semanales" />
        <Stat value={totales.reservados} label="Reservados esta semana" />
        <Stat value={totales.libres} label="Disponibles esta semana" />
        <Stat value={totales.asistidos} label="Asistencias (histórico)" />
        <Stat value={totales.cancelados} label="Cancelaciones (histórico)" />
        <Stat value={totales.noAsistio} label="Faltas sin aviso (histórico)" />
      </div>

      <section style={{ background: color.surface, border: `1px solid ${color.border}`, borderRadius: 20, overflow: "hidden" }}>
        {modo === "escritorio" && (
          <div
            style={{
              height: 48,
              boxSizing: "border-box",
              padding: "0 24px",
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) 110px 110px 110px 110px 110px 110px",
              gap: 16,
              alignItems: "center",
              borderBottom: `1px solid ${color.border}`,
              fontFamily: font.mono,
              fontSize: 12,
              letterSpacing: "0.08em",
              color: color.textMuted
            }}
          >
            <span>ACTIVIDAD</span>
            <span>CUPOS/SEM</span>
            <span>RESERV.</span>
            <span>LIBRES</span>
            <span>OCUPACIÓN</span>
            <span>ASISTIÓ</span>
            <span>CANCELÓ</span>
          </div>
        )}
        {filas.map((f) => {
          const chipOcupacion = (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 26,
                padding: "0 10px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                background: f.ocupacion >= 80 ? centro.color_acento : color.bg
              }}
            >
              {f.ocupacion}%
            </span>
          );

          if (modo === "movil") {
            return (
              <div key={f.actividad.id} style={{ padding: "12px 24px", display: "flex", flexDirection: "column", gap: 6, borderBottom: `1px solid ${color.border}`, opacity: f.actividad.activa ? 1 : 0.5 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{f.actividad.nombre}</span>
                  {chipOcupacion}
                </div>
                <div style={{ fontFamily: font.mono, fontSize: 13, color: color.textMuted }}>
                  {f.reservados}/{f.cupos} reservados · {f.libres} libres · {f.asistidos} asistió · {f.cancelados} canceló
                </div>
              </div>
            );
          }

          return (
            <div
              key={f.actividad.id}
              style={{
                height: 60,
                boxSizing: "border-box",
                padding: "0 24px",
                display: "grid",
                gridTemplateColumns: "minmax(0,1fr) 110px 110px 110px 110px 110px 110px",
                gap: 16,
                alignItems: "center",
                borderBottom: `1px solid ${color.border}`,
                opacity: f.actividad.activa ? 1 : 0.5
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 15 }}>{f.actividad.nombre}</span>
              <span style={{ fontFamily: font.mono, fontSize: 14 }}>{f.cupos}</span>
              <span style={{ fontFamily: font.mono, fontSize: 14 }}>{f.reservados}</span>
              <span style={{ fontFamily: font.mono, fontSize: 14 }}>{f.libres}</span>
              <span>{chipOcupacion}</span>
              <span style={{ fontFamily: font.mono, fontSize: 14 }}>{f.asistidos}</span>
              <span style={{ fontFamily: font.mono, fontSize: 14 }}>{f.cancelados}</span>
            </div>
          );
        })}
        {!cargando && !filas.length && (
          <div style={{ padding: 24, color: color.textMuted, fontSize: 14 }}>Todavía no hay actividades cargadas.</div>
        )}
      </section>

      <div style={{ marginTop: 32, marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: font.mono, fontSize: 12, letterSpacing: "0.1em", color: color.textMuted }}>
          OCUPACIÓN POR DÍA · horas libres vs. reservadas
        </div>
        <select
          value={actividadOcupacionId ?? ""}
          onChange={(e) => setActividadOcupacionId(e.target.value)}
          style={{ height: 36, borderRadius: 10, border: `1px solid ${color.borderStrong}`, padding: "0 10px", fontSize: 13, background: color.surface }}
        >
          {actividades.map((a) => (
            <option key={a.id} value={a.id}>{a.nombre}</option>
          ))}
        </select>
      </div>

      <section style={{ background: color.surface, border: `1px solid ${color.border}`, borderRadius: 20, padding: 24 }}>
        {!actividadOcupacion ? (
          <p style={{ margin: 0, color: color.textMuted, fontSize: 14 }}>Todavía no hay actividades cargadas.</p>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
              {diasSemana.map((d, i) => {
                const selected = i === diaOcupacionIdx;
                const esHoy = d.toDateString() === new Date().toDateString();
                return (
                  <button
                    key={i}
                    onClick={() => setDiaOcupacionIdx(i)}
                    aria-pressed={selected}
                    style={{
                      flex: "none",
                      width: 64,
                      height: 68,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      borderRadius: 14,
                      background: selected ? centro.color_acento : color.bg,
                      border: `1px solid ${selected ? color.ink : esHoy ? color.textMuted : color.border}`
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700 }}>{d.toLocaleDateString("es-AR", { weekday: "short" }).toUpperCase()}</span>
                    <span style={{ fontFamily: font.mono, fontSize: 18, fontWeight: 600 }}>{d.getDate()}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10, marginTop: 20 }}>
              {slotsOcupacion.map((s, i) => (
                <div
                  key={i}
                  style={{
                    height: 60,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 3,
                    borderRadius: 14,
                    background: s.disponible ? color.bg : centro.color_acento,
                    border: `1px solid ${s.disponible ? color.border : color.ink}`
                  }}
                >
                  <span style={{ fontFamily: font.mono, fontSize: 15, fontWeight: 600 }}>{formatearHora(s.inicio)}</span>
                  <span style={{ fontSize: 11, fontWeight: 700 }}>
                    {actividadOcupacion.tipo === "grupal"
                      ? s.disponible
                        ? `${s.cuposLibres} libres`
                        : "Completo"
                      : s.disponible
                      ? "Libre"
                      : "Ocupado"}
                  </span>
                </div>
              ))}
              {!slotsOcupacion.length && (
                <p style={{ margin: 0, color: color.textMuted, fontSize: 14, gridColumn: "1 / -1" }}>
                  Sin horarios configurados para este día.
                </p>
              )}
            </div>
          </>
        )}
      </section>

      <div style={{ marginTop: 32, marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: font.mono, fontSize: 12, letterSpacing: "0.1em", color: color.textMuted }}>
          RESERVAS TOMADAS · {diaOcupacion.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "short" })}
        </div>
        <select
          value={filtroActividad}
          onChange={(e) => setFiltroActividad(e.target.value)}
          style={{ height: 36, borderRadius: 10, border: `1px solid ${color.borderStrong}`, padding: "0 10px", fontSize: 13, background: color.surface }}
        >
          <option value="all">Todas las actividades</option>
          {actividades.map((a) => (
            <option key={a.id} value={a.id}>{a.nombre}</option>
          ))}
        </select>
      </div>

      <section style={{ background: color.surface, border: `1px solid ${color.border}`, borderRadius: 20, overflow: "hidden" }}>
        {modo === "escritorio" && (
          <div
            style={{
              height: 48,
              boxSizing: "border-box",
              padding: "0 24px",
              display: "grid",
              gridTemplateColumns: "110px minmax(0,1fr) minmax(0,1fr) 140px 130px 120px 84px",
              gap: 16,
              alignItems: "center",
              borderBottom: `1px solid ${color.border}`,
              fontFamily: font.mono,
              fontSize: 12,
              letterSpacing: "0.08em",
              color: color.textMuted
            }}
          >
            <span>FECHA</span>
            <span>ACTIVIDAD</span>
            <span>CLIENTE</span>
            <span>TELÉFONO</span>
            <span>DNI</span>
            <span>ESTADO</span>
            <span>AVISO</span>
          </div>
        )}
        {reservas.map(({ turno, actividad, cliente }) => {
          let bg = color.bg;
          let fg = color.ink;
          if (turno.estado === "pendiente" || turno.estado === "confirmado") bg = centro.color_acento;
          if (turno.estado === "no_asistio") {
            bg = color.ink;
            fg = "#FFFFFF";
          }
          const chipEstado = (
            <span style={{ display: "inline-flex", alignItems: "center", height: 26, padding: "0 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: bg, color: fg }}>
              {estadoLabel[turno.estado]}
            </span>
          );
          const botonesAviso = (
            <span style={{ display: "flex", gap: 6, flex: "none" }}>
              <a
                href={linkWhatsapp(cliente.telefono, `Hola ${cliente.nombre.split(" ")[0]}, te escribimos por tu turno de ${actividad.nombre}.`)}
                target="_blank"
                rel="noreferrer"
                aria-label={`Enviar WhatsApp a ${cliente.nombre}`}
                title="Avisar"
                style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10, border: `1px solid ${color.borderStrong}`, background: color.surface, fontSize: 11, fontWeight: 700 }}
              >
                WA
              </a>
              <a
                href={linkWhatsapp(
                  cliente.telefono,
                  `Hola ${cliente.nombre.split(" ")[0]}, necesitamos reprogramar o cancelar tu turno de ${actividad.nombre} del ${new Date(turno.inicio).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })} a las ${formatearHora(new Date(turno.inicio))}. ¿Nos escribís para coordinar?`
                )}
                target="_blank"
                rel="noreferrer"
                aria-label={`Reprogramar o cancelar el turno de ${cliente.nombre}`}
                title="Reprogramar / cancelar"
                style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10, border: `1px solid ${color.borderStrong}`, background: "#FCEBD5", fontSize: 14 }}
              >
                ↻
              </a>
            </span>
          );

          if (modo === "movil") {
            return (
              <div key={turno.id} style={{ padding: "12px 24px", display: "flex", flexDirection: "column", gap: 8, borderBottom: `1px solid ${color.border}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{cliente.nombre}</span>
                  {chipEstado}
                </div>
                <div style={{ fontSize: 13, color: color.textMuted }}>
                  {actividad.nombre} · {new Date(turno.inicio).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })} · {formatearHora(new Date(turno.inicio))}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: font.mono, fontSize: 13, color: color.textMuted }}>{cliente.telefono}</span>
                  {botonesAviso}
                </div>
              </div>
            );
          }

          return (
            <div
              key={turno.id}
              style={{
                height: 60,
                boxSizing: "border-box",
                padding: "0 24px",
                display: "grid",
                gridTemplateColumns: "110px minmax(0,1fr) minmax(0,1fr) 140px 130px 120px 84px",
                gap: 16,
                alignItems: "center",
                borderBottom: `1px solid ${color.border}`
              }}
            >
              <span style={{ fontFamily: font.mono, fontSize: 13, fontWeight: 600 }}>
                {new Date(turno.inicio).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })} · {formatearHora(new Date(turno.inicio))}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{actividad.nombre}</span>
              <span style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cliente.nombre}</span>
              <span style={{ fontFamily: font.mono, fontSize: 13 }}>{cliente.telefono}</span>
              <span style={{ fontFamily: font.mono, fontSize: 13 }}>{cliente.dni || "—"}</span>
              <span>{chipEstado}</span>
              {botonesAviso}
            </div>
          );
        })}
        {!cargando && !reservas.length && (
          <div style={{ padding: 24, color: color.textMuted, fontSize: 14 }}>No hay reservas para este filtro.</div>
        )}
      </section>
    </AdminLayout>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ background: color.surface, border: `1px solid ${color.border}`, borderRadius: 14, padding: "16px 18px" }}>
      <div style={{ fontFamily: font.display, fontWeight: 600, fontSize: 26 }}>{value}</div>
      <div style={{ marginTop: 2, fontSize: 13, fontWeight: 600, color: color.textSoft }}>{label}</div>
    </div>
  );
}
