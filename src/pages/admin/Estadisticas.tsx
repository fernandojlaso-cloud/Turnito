import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Actividad, Centro, Disponibilidad, Turno } from "@/lib/database.types";
import AdminLayout from "./AdminLayout";
import { tokens } from "@/styles/tokens";

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

export default function Estadisticas({ centro }: { centro: Centro }) {
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargar() {
      const [{ data: acts }, { data: disp }, { data: ts }] = await Promise.all([
        supabase.from("actividades").select("*").eq("centro_id", centro.id),
        supabase.from("disponibilidad").select("*"),
        supabase.from("turnos").select("*").eq("centro_id", centro.id)
      ]);
      setActividades((acts ?? []) as Actividad[]);
      setDisponibilidad((disp ?? []) as Disponibilidad[]);
      setTurnos((ts ?? []) as Turno[]);
      setCargando(false);
    }
    cargar();
  }, [centro.id]);

  const inicioSemana = useMemo(() => inicioDeSemana(new Date()), []);
  const finSemana = useMemo(() => new Date(inicioSemana.getTime() + 7 * 86400000), [inicioSemana]);

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
      const totalHistorico = turnosDeActividad.length;

      return {
        actividad: a,
        cupos,
        reservados,
        libres: Math.max(0, cupos - reservados),
        ocupacion: cupos > 0 ? Math.round((reservados / cupos) * 100) : 0,
        asistidos,
        cancelados,
        noAsistio,
        totalHistorico
      };
    });
  }, [actividades, disponibilidad, turnos, inicioSemana, finSemana]);

  const totales = useMemo(
    () =>
      filas.reduce(
        (acc, f) => ({
          cupos: acc.cupos + f.cupos,
          reservados: acc.reservados + f.reservados,
          asistidos: acc.asistidos + f.asistidos,
          cancelados: acc.cancelados + f.cancelados,
          noAsistio: acc.noAsistio + f.noAsistio
        }),
        { cupos: 0, reservados: 0, asistidos: 0, cancelados: 0, noAsistio: 0 }
      ),
    [filas]
  );

  return (
    <AdminLayout centro={centro}>
      <div style={{ height: 72, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
        <h1 style={{ margin: 0, fontFamily: font.display, fontWeight: 600, fontSize: 32 }}>Estadísticas</h1>
        <p style={{ margin: "6px 0 0", fontSize: 15, color: color.textSoft }}>
          Semana del {inicioSemana.toLocaleDateString("es-AR", { day: "numeric", month: "short" })} · asistencias y
          cancelaciones son de todo el histórico.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 12, margin: "24px 0" }}>
        <Stat value={totales.cupos} label="Cupos semanales" />
        <Stat value={totales.reservados} label="Reservados esta semana" />
        <Stat value={totales.asistidos} label="Asistencias (histórico)" />
        <Stat value={totales.cancelados} label="Cancelaciones (histórico)" />
        <Stat value={totales.noAsistio} label="Faltas sin aviso (histórico)" />
      </div>

      <section style={{ background: color.surface, border: `1px solid ${color.border}`, borderRadius: 20, overflow: "hidden" }}>
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
        {filas.map((f) => (
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
            <span>
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
            </span>
            <span style={{ fontFamily: font.mono, fontSize: 14 }}>{f.asistidos}</span>
            <span style={{ fontFamily: font.mono, fontSize: 14 }}>{f.cancelados}</span>
          </div>
        ))}
        {!cargando && !filas.length && (
          <div style={{ padding: 24, color: color.textMuted, fontSize: 14 }}>Todavía no hay actividades cargadas.</div>
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
