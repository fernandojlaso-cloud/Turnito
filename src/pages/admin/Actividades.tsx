import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Actividad, CategoriaActividad, Centro, Disponibilidad } from "@/lib/database.types";
import AdminLayout from "./AdminLayout";
import { tokens } from "@/styles/tokens";
import { Field, PrimaryButton } from "@/components/UI";
import MaestroDetalle from "@/components/admin/MaestroDetalle";
import { useModoVista } from "@/lib/useModoVista";
import { CATEGORIAS_ACTIVIDAD, DEPORTES_CANCHA, nombreDesdeCategoria } from "@/lib/categoriasActividad";

const { color, font } = tokens;
const dias = ["D", "L", "M", "X", "J", "V", "S"]; // índice = getDay()
const diasLargos = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function Actividades({ centro }: { centro: Centro }) {
  const { modo } = useModoVista();
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    async function cargar() {
      const [{ data: acts }, { data: disp }] = await Promise.all([
        supabase.from("actividades").select("*").eq("centro_id", centro.id).order("orden"),
        supabase.from("disponibilidad").select("*")
      ]);
      setActividades(acts ?? []);
      setDisponibilidad(disp ?? []);
      setSelId((acts ?? [])[0]?.id ?? null);
      setCreando(!(acts ?? []).length);
    }
    cargar();
  }, [centro.id]);

  async function crearActividad(datos: {
    nombre: string;
    codigo: string;
    categoria: CategoriaActividad;
    tipo: "individual" | "grupal";
    duracion_min: number;
    tipo_actividad: string | null;
  }) {
    const { data, error } = await supabase
      .from("actividades")
      .insert({
        centro_id: centro.id,
        nombre: datos.nombre,
        codigo: datos.codigo,
        categoria: datos.categoria,
        tipo: datos.tipo,
        duracion_min: datos.duracion_min,
        tipo_actividad: datos.tipo_actividad,
        cupo: datos.categoria === "canchas_futbol_padel_tenis" ? 0 : datos.tipo === "grupal" ? 8 : 1,
        cancelacion_horas: 2,
        activa: true,
        orden: actividades.length
      })
      .select()
      .single();
    if (!error && data) {
      setActividades((prev) => [...prev, data as Actividad]);
      setSelId((data as Actividad).id);
      setCreando(false);
    }
    return !error;
  }

  const actual = actividades.find((a) => a.id === selId) ?? null;

  async function patch(id: string, cambios: Partial<Actividad>) {
    setActividades((prev) => prev.map((a) => (a.id === id ? { ...a, ...cambios } : a)));
    await supabase.from("actividades").update(cambios).eq("id", id);
  }

  async function agregarFranja(actividadId: string, diaSemana: number) {
    const { data } = await supabase
      .from("disponibilidad")
      .insert({ actividad_id: actividadId, dia_semana: diaSemana, hora_inicio: "09:00", hora_fin: "18:00", solo_socios_activos: false })
      .select()
      .single();
    if (data) setDisponibilidad((prev) => [...prev, data]);
  }

  async function toggleDia(actividadId: string, diaSemana: number) {
    const franjasDelDia = disponibilidad.filter(
      (d) => d.actividad_id === actividadId && d.dia_semana === diaSemana
    );
    if (franjasDelDia.length > 0) {
      setDisponibilidad((prev) => prev.filter((d) => !(d.actividad_id === actividadId && d.dia_semana === diaSemana)));
      await supabase.from("disponibilidad").delete().eq("actividad_id", actividadId).eq("dia_semana", diaSemana);
    } else {
      await agregarFranja(actividadId, diaSemana);
    }
  }

  async function quitarFranja(id: string) {
    setDisponibilidad((prev) => prev.filter((d) => d.id !== id));
    await supabase.from("disponibilidad").delete().eq("id", id);
  }

  async function editarFranja(id: string, cambios: Partial<Disponibilidad>) {
    setDisponibilidad((prev) => prev.map((d) => (d.id === id ? { ...d, ...cambios } : d)));
    await supabase.from("disponibilidad").update(cambios).eq("id", id);
  }

  const franjasDeActual = actual ? disponibilidad.filter((d) => d.actividad_id === actual.id) : [];

  return (
    <AdminLayout centro={centro}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end", justifyContent: "space-between", minHeight: 72 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: font.display, fontWeight: 600, fontSize: 32 }}>Actividades</h1>
          <p style={{ margin: "6px 0 0", fontSize: 15, color: color.textSoft }}>
            {actividades.length
              ? `${actividades.filter((a) => a.activa).length} de ${actividades.length} activas · activá las que ofrece tu centro y configurá cada una.`
              : "Todavía no cargaste ninguna actividad."}
          </p>
        </div>
        <button
          onClick={() => {
            setCreando(true);
            setSelId(null);
          }}
          style={{ minHeight: 48, padding: "12px 20px", borderRadius: 14, border: 0, background: centro.color_acento, fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}
        >
          + Nueva actividad
        </button>
      </div>

      <MaestroDetalle
        hayDetalle={creando || !!actual}
        onVolver={() => {
          setCreando(!!actividades.length);
          setSelId(null);
        }}
        lista={
          <section style={{ width: modo === "movil" ? "100%" : 380, flex: "none", background: color.surface, border: `1px solid ${color.border}`, borderRadius: 20, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {!actividades.length && (
              <p style={{ color: color.textMuted, fontSize: 14, padding: 8 }}>
                Usá "+ Nueva actividad" para cargar la primera (ej. Kinesiología, Pilates, Personal trainer).
              </p>
            )}
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
        }
        detalle={
          creando ? (
            <NuevaActividadForm onCancelar={() => setCreando(!!actividades.length)} onCrear={crearActividad} accent={centro.color_acento} />
          ) : actual ? (
            <section style={{ flex: 1, minWidth: 0, background: color.surface, border: `1px solid ${color.border}`, borderRadius: 20, padding: 32, display: "flex", flexDirection: "column", gap: 28, opacity: actual.activa ? 1 : 0.5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: color.ink, color: centro.color_acento, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.mono, fontSize: 16, fontWeight: 600 }}>
                  {actual.codigo}
                </div>
                <h2 style={{ margin: 0, fontFamily: font.display, fontWeight: 600, fontSize: 26 }}>{actual.nombre}</h2>
              </div>

              <Row label="CATEGORÍA">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {CATEGORIAS_ACTIVIDAD.map((c) => (
                    <Chip
                      key={c.valor}
                      label={c.etiqueta}
                      selected={actual.categoria === c.valor}
                      accent={centro.color_acento}
                      onClick={() => patch(actual.id, { categoria: c.valor })}
                    />
                  ))}
                </div>
                {!actual.categoria && (
                  <p style={{ margin: 0, fontSize: 12, color: color.textMuted }}>
                    Esta actividad se creó antes de este cambio — elegí a qué categoría corresponde.
                  </p>
                )}
              </Row>

              {actual.categoria === "clases_grupales" && (
                <Row label="TIPO DE ACTIVIDAD">
                  <TipoActividadEditable key={actual.id} actividad={actual} onPatch={patch} />
                  <p style={{ margin: "6px 0 0", fontSize: 12, color: color.textMuted }}>
                    Ej. Localizada, Elongación, Zumba, Spinning. Se usa para mostrar qué clase es exactamente dentro de "Clases grupales".
                  </p>
                </Row>
              )}

              <FotoYDireccion key={actual.id} actividad={actual} onPatch={patch} />

              {actual.categoria === "canchas_futbol_padel_tenis" ? (
                <Row label="TIPO DE TURNO">
                  <p style={{ margin: 0, fontSize: 14, color: color.textSoft }}>
                    Grupal (fijo para canchas: no se puede cambiar).
                  </p>
                </Row>
              ) : (
                <Row label="TIPO DE TURNO">
                  <Segmented
                    options={["individual", "grupal"]}
                    labels={["Individual", "Grupal"]}
                    value={actual.tipo}
                    accent={centro.color_acento}
                    onChange={(v) => patch(actual.id, { tipo: v as Actividad["tipo"], cupo: v === "grupal" ? Math.max(actual.cupo, 8) : 1 })}
                  />
                </Row>
              )}

              <Row label="DURACIÓN (MIN)">
                <div style={{ display: "flex", gap: 8 }}>
                  {[30, 45, 50, 60].map((v) => (
                    <Chip key={v} label={String(v)} selected={actual.duracion_min === v} accent={centro.color_acento} onClick={() => patch(actual.id, { duracion_min: v })} />
                  ))}
                </div>
              </Row>

              {actual.tipo === "grupal" && actual.categoria !== "canchas_futbol_padel_tenis" && (
                <Row label="CUPO POR TURNO">
                  <Stepper value={actual.cupo} min={2} max={40} onChange={(v) => patch(actual.id, { cupo: v })} suffix="personas" />
                </Row>
              )}

              {actual.categoria === "canchas_futbol_padel_tenis" && (
                <Row label="CANCHAS DISPONIBLES POR TURNO">
                  <p style={{ margin: 0, fontSize: 14, color: color.textSoft }}>
                    {actual.cupo} {actual.cupo === 1 ? "cancha vinculada y activa" : "canchas vinculadas y activas"}. Se calcula solo: para sumar o quitar canchas, entrá a "Profesionales".
                  </p>
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
                      const hay = franjasDeActual.some((f) => f.dia_semana === i);
                      return (
                        <button
                          key={i}
                          onClick={() => toggleDia(actual.id, i)}
                          aria-label={hay ? `Borrar todos los bloques de horario del ${diasLargos[i]}` : `Agregar un bloque de horario el ${diasLargos[i]}`}
                          style={{ width: 48, height: 48, borderRadius: 12, border: `1px solid ${hay ? color.ink : color.borderStrong}`, background: hay ? centro.color_acento : color.surface, fontSize: 15, fontWeight: 700 }}
                        >
                          {letra}
                        </button>
                      );
                    })}
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: color.textMuted }}>
                    Tocá un día para agregar un bloque de horario de 09:00 a 18:00. Volvé a tocar esa misma letra para borrar TODOS los bloques de ese día y dejarlo en blanco. Para agregar otro bloque más al mismo día sin borrar el que ya tiene (por ejemplo, uno libre y otro "Solo socios activos"), usá el botón "+" de ese bloque. Para borrar un solo bloque, usá la ✕.
                  </p>
                  {franjasDeActual
                    .slice()
                    .sort((a, b) => a.dia_semana - b.dia_semana || a.hora_inicio.localeCompare(b.hora_inicio))
                    .map((f) => (
                      <div key={f.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, fontSize: 14 }}>
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
                        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600 }}>
                          <input
                            type="checkbox"
                            checked={f.solo_socios_activos}
                            onChange={(e) => editarFranja(f.id, { solo_socios_activos: e.target.checked })}
                          />
                          Solo socios activos
                        </label>
                        <button
                          onClick={() => agregarFranja(actual.id, f.dia_semana)}
                          aria-label={`Agregar otro bloque de horario el ${diasLargos[f.dia_semana]}`}
                          style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${color.borderStrong}`, background: color.surface, fontSize: 16, fontWeight: 700 }}
                        >
                          +
                        </button>
                        <button
                          onClick={() => quitarFranja(f.id)}
                          aria-label={`Quitar este bloque de horario del ${diasLargos[f.dia_semana]}`}
                          style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${color.borderStrong}`, background: color.surface, fontSize: 14 }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                </div>
              </Row>
            </section>
          ) : (
            <section style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", color: color.textMuted, fontSize: 15 }}>
              Elegí una actividad de la lista, o creá la primera.
            </section>
          )
        }
      />
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

function NuevaActividadForm({
  onCancelar,
  onCrear,
  accent
}: {
  onCancelar: () => void;
  onCrear: (datos: {
    nombre: string;
    codigo: string;
    categoria: CategoriaActividad;
    tipo: "individual" | "grupal";
    duracion_min: number;
    tipo_actividad: string | null;
  }) => Promise<boolean>;
  accent: string;
}) {
  const [categoria, setCategoria] = useState<CategoriaActividad | null>(null);
  const [subNombre, setSubNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [tipo, setTipo] = useState<"individual" | "grupal">("individual");
  const [duracion, setDuracion] = useState(50);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function elegirCategoria(c: CategoriaActividad) {
    setCategoria(c);
    setSubNombre("");
    setTipo(c === "pilates" || c === "clases_grupales" ? "grupal" : "individual");
  }

  const esClasesGrupales = categoria === "clases_grupales";
  const esCanchas = categoria === "canchas_futbol_padel_tenis";

  const valido =
    !!categoria &&
    codigo.trim().length >= 2 &&
    (!esClasesGrupales || subNombre.trim().length > 1) &&
    (!esCanchas || !!subNombre);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valido || !categoria) return;
    setGuardando(true);
    setError(null);
    const ok = await onCrear({
      nombre: nombreDesdeCategoria(categoria, subNombre),
      codigo: codigo.trim().toUpperCase(),
      categoria,
      tipo: esCanchas ? "grupal" : tipo,
      duracion_min: duracion,
      tipo_actividad: esClasesGrupales ? subNombre.trim() || null : null
    });
    setGuardando(false);
    if (!ok) setError("No se pudo crear la actividad. Probá de nuevo.");
  }

  return (
    <section style={{ flex: 1, minWidth: 0, maxWidth: 480, background: color.surface, border: `1px solid ${color.border}`, borderRadius: 20, padding: 32, display: "flex", flexDirection: "column", gap: 20 }}>
      <h2 style={{ margin: 0, fontFamily: font.display, fontWeight: 600, fontSize: 24 }}>Nueva actividad</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Categoría</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {CATEGORIAS_ACTIVIDAD.map((c) => (
              <button
                type="button"
                key={c.valor}
                onClick={() => elegirCategoria(c.valor)}
                aria-pressed={categoria === c.valor}
                style={{ height: 40, padding: "0 14px", borderRadius: 999, border: `1px solid ${categoria === c.valor ? color.ink : color.borderStrong}`, background: categoria === c.valor ? accent : color.surface, fontWeight: 700, fontSize: 13 }}
              >
                {c.etiqueta}
              </button>
            ))}
          </div>
        </div>

        {esClasesGrupales && (
          <Field
            id="na-sub"
            label="Tipo de actividad"
            value={subNombre}
            onChange={(e) => setSubNombre(e.target.value)}
            placeholder="Ej. Localizada, Elongación, Zumba"
          />
        )}

        {esCanchas && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Deporte</div>
            <div style={{ display: "flex", gap: 8 }}>
              {DEPORTES_CANCHA.map((d) => (
                <button
                  type="button"
                  key={d}
                  onClick={() => setSubNombre(d)}
                  aria-pressed={subNombre === d}
                  style={{ flex: 1, height: 44, borderRadius: 12, border: `1px solid ${subNombre === d ? color.ink : color.borderStrong}`, background: subNombre === d ? accent : color.surface, fontWeight: 700, fontSize: 14 }}
                >
                  {d}
                </button>
              ))}
            </div>
            <p style={{ margin: 0, fontSize: 13, color: color.textMuted }}>
              Las canchas se reservan de una por vez. Después vas a cargar cada cancha de este deporte desde "Profesionales".
            </p>
          </div>
        )}

        <Field
          id="na-codigo"
          label="Código corto (2-3 letras, para identificarla)"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.slice(0, 3))}
          placeholder="Ej. KI"
        />
        {!esCanchas && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Tipo de turno</div>
            <div style={{ display: "flex", padding: 4, gap: 4, borderRadius: 14, background: color.bg, width: 280 }}>
              {(["individual", "grupal"] as const).map((opt) => (
                <button
                  type="button"
                  key={opt}
                  onClick={() => setTipo(opt)}
                  aria-pressed={tipo === opt}
                  style={{ flex: 1, height: 40, borderRadius: 10, border: 0, fontSize: 14, fontWeight: 700, background: tipo === opt ? accent : "transparent" }}
                >
                  {opt === "individual" ? "Individual" : "Grupal"}
                </button>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Duración (min)</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[30, 45, 50, 60].map((v) => (
              <button
                type="button"
                key={v}
                onClick={() => setDuracion(v)}
                aria-pressed={duracion === v}
                style={{ flex: 1, height: 44, borderRadius: 12, border: `1px solid ${duracion === v ? color.ink : color.borderStrong}`, background: duracion === v ? accent : color.surface, fontFamily: font.mono, fontSize: 14, fontWeight: 600 }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: color.textMuted }}>
          Después podés ajustar cupo, política de cancelación, días y horarios disponibles desde el detalle.
        </p>
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
              {guardando ? "Creando…" : "Crear actividad"}
            </PrimaryButton>
          </div>
        </div>
      </form>
    </section>
  );
}

function FotoYDireccion({
  actividad,
  onPatch
}: {
  actividad: Actividad;
  onPatch: (id: string, cambios: Partial<Actividad>) => Promise<void>;
}) {
  const [direccion, setDireccion] = useState(actividad.direccion ?? "");

  return (
    <Field
      id="direccion-actividad"
      label="Dirección (dónde se realiza)"
      value={direccion}
      onChange={(e) => setDireccion(e.target.value)}
      onBlur={() => {
        if (direccion !== (actividad.direccion ?? "")) onPatch(actividad.id, { direccion: direccion.trim() || null });
      }}
      placeholder="Ej. Av. Cabildo 2450, Sala 2"
    />
  );
}

function TipoActividadEditable({
  actividad,
  onPatch
}: {
  actividad: Actividad;
  onPatch: (id: string, cambios: Partial<Actividad>) => Promise<void>;
}) {
  const [valor, setValor] = useState(actividad.tipo_actividad ?? "");

  return (
    <Field
      id="tipo-actividad"
      label=""
      value={valor}
      onChange={(e) => setValor(e.target.value)}
      onBlur={() => {
        const limpio = valor.trim();
        if (limpio !== (actividad.tipo_actividad ?? "")) {
          onPatch(actividad.id, { tipo_actividad: limpio || null, nombre: nombreDesdeCategoria("clases_grupales", limpio) });
        }
      }}
      placeholder="Ej. Localizada, Elongación, Zumba"
    />
  );
}
