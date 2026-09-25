import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatearHora, linkWhatsapp } from "@/lib/slots";
import type { Actividad, Centro, Cliente, EstadoTurno, Profesional, Turno } from "@/lib/database.types";
import AdminLayout from "./AdminLayout";
import { tokens } from "@/styles/tokens";
import { Field, PrimaryButton } from "@/components/UI";

const { color, font } = tokens;

export default function Clientes({ centro }: { centro: Centro }) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [mostrarBaja, setMostrarBaja] = useState(false);
  const [creando, setCreando] = useState(false);

  async function recargarClientes() {
    const { data: cs } = await supabase.from("clientes").select("*").eq("centro_id", centro.id).order("nombre");
    setClientes((cs ?? []) as Cliente[]);
    return (cs ?? []) as Cliente[];
  }

  useEffect(() => {
    async function cargar() {
      const [cs, { data: ts }, { data: acts }, { data: pros }] = await Promise.all([
        recargarClientes(),
        supabase.from("turnos").select("*").eq("centro_id", centro.id).order("inicio", { ascending: false }),
        supabase.from("actividades").select("*").eq("centro_id", centro.id),
        supabase.from("profesionales").select("*").eq("centro_id", centro.id)
      ]);
      setTurnos((ts ?? []) as Turno[]);
      setActividades((acts ?? []) as Actividad[]);
      setProfesionales((pros ?? []) as Profesional[]);
      setSelId(cs[0]?.id ?? null);
    }
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centro.id]);

  const actsById = useMemo(() => new Map(actividades.map((a) => [a.id, a])), [actividades]);
  const prosById = useMemo(() => new Map(profesionales.map((p) => [p.id, p])), [profesionales]);

  const filtrados = clientes.filter((c) => {
    if (!mostrarBaja && !c.activo) return false;
    const q = busqueda.toLowerCase();
    return !q || c.nombre.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.telefono.includes(q);
  });

  const actual = clientes.find((c) => c.id === selId) ?? null;
  const historial = actual ? turnos.filter((t) => t.cliente_id === actual.id) : [];

  const contar = (estado: EstadoTurno) => historial.filter((t) => t.estado === estado).length;
  const proximos = historial.filter((t) => new Date(t.inicio) >= new Date() && t.estado !== "cancelado").length;

  async function crearCliente(datos: { nombre: string; email: string; telefono: string }) {
    const { data, error } = await supabase
      .from("clientes")
      .insert({ centro_id: centro.id, ...datos, activo: true })
      .select()
      .single();
    if (!error && data) {
      await recargarClientes();
      setSelId((data as Cliente).id);
      setCreando(false);
    }
    return !error;
  }

  async function actualizarCliente(id: string, cambios: Partial<Cliente>) {
    setClientes((prev) => prev.map((c) => (c.id === id ? { ...c, ...cambios } : c)));
    await supabase.from("clientes").update(cambios).eq("id", id);
  }

  return (
    <AdminLayout centro={centro}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: 72 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: font.display, fontWeight: 600, fontSize: 32 }}>Clientes</h1>
          <p style={{ margin: "6px 0 0", fontSize: 15, color: color.textSoft }}>
            Cada cliente queda identificado por su email y teléfono, con el historial de todos sus turnos.
          </p>
        </div>
        <button
          onClick={() => {
            setCreando(true);
            setSelId(null);
          }}
          style={{ height: 48, padding: "0 20px", borderRadius: 14, border: 0, background: centro.color_acento, fontWeight: 700, fontSize: 15 }}
        >
          + Nuevo cliente
        </button>
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
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: color.textSoft }}>
            <input type="checkbox" checked={mostrarBaja} onChange={(e) => setMostrarBaja(e.target.checked)} />
            Mostrar dados de baja
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filtrados.map((c) => {
              const selected = c.id === selId;
              const iniciales = c.nombre.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
              const cant = turnos.filter((t) => t.cliente_id === c.id).length;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelId(c.id);
                    setCreando(false);
                  }}
                  aria-pressed={selected}
                  style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", height: 72, boxSizing: "border-box", padding: "0 14px", borderRadius: 14, textAlign: "left", background: selected ? centro.color_acento : color.surface, border: `1px solid ${selected ? color.ink : color.border}`, opacity: c.activo ? 1 : 0.55 }}
                >
                  <span style={{ width: 42, height: 42, flex: "none", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.mono, fontSize: 13, fontWeight: 600, background: selected ? color.ink : color.bg, color: selected ? centro.color_acento : color.ink }}>
                    {iniciales}
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{c.nombre}{!c.activo && " (baja)"}</span>
                    <span style={{ fontSize: 13, color: color.textSoft }}>{cant} {cant === 1 ? "turno" : "turnos"}</span>
                  </span>
                </button>
              );
            })}
            {!filtrados.length && <p style={{ color: color.textMuted, fontSize: 14, padding: 8 }}>Sin clientes todavía.</p>}
          </div>
        </section>

        {creando && (
          <NuevoClienteForm onCancelar={() => setCreando(false)} onCrear={crearCliente} accent={centro.color_acento} />
        )}

        {!creando && actual && (
          <section style={{ flex: 1, minWidth: 0, background: color.surface, border: `1px solid ${color.border}`, borderRadius: 20, padding: 32, display: "flex", flexDirection: "column", gap: 28 }}>
            <DetalleCliente
              key={actual.id}
              cliente={actual}
              accent={centro.color_acento}
              onActualizar={actualizarCliente}
            />

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

        {!creando && !actual && (
          <section style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", color: color.textMuted, fontSize: 15 }}>
            Elegí un cliente de la lista, o creá uno nuevo.
          </section>
        )}
      </div>
    </AdminLayout>
  );
}

function NuevoClienteForm({
  onCancelar,
  onCrear,
  accent
}: {
  onCancelar: () => void;
  onCrear: (datos: { nombre: string; email: string; telefono: string }) => Promise<boolean>;
  accent: string;
}) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valido = nombre.trim().length > 1 && /\S+@\S+\.\S+/.test(email) && telefono.trim().length > 5;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valido) return;
    setGuardando(true);
    setError(null);
    const ok = await onCrear({ nombre: nombre.trim(), email: email.trim().toLowerCase(), telefono: telefono.trim() });
    setGuardando(false);
    if (!ok) setError("Ya existe un cliente con ese email en este centro.");
  }

  return (
    <section style={{ flex: 1, minWidth: 0, maxWidth: 480, background: color.surface, border: `1px solid ${color.border}`, borderRadius: 20, padding: 32, display: "flex", flexDirection: "column", gap: 20 }}>
      <h2 style={{ margin: 0, fontFamily: font.display, fontWeight: 600, fontSize: 24 }}>Nuevo cliente</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Field id="nc-nombre" label="Nombre y apellido" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Camila Sosa" />
        <Field id="nc-email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@correo.com" />
        <Field id="nc-telefono" label="Teléfono (WhatsApp)" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Ej. 11 2345 6789" />
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
              {guardando ? "Creando…" : "Crear cliente"}
            </PrimaryButton>
          </div>
        </div>
      </form>
    </section>
  );
}

function DetalleCliente({
  cliente,
  accent,
  onActualizar
}: {
  cliente: Cliente;
  accent: string;
  onActualizar: (id: string, cambios: Partial<Cliente>) => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(cliente.nombre);
  const [email, setEmail] = useState(cliente.email);
  const [telefono, setTelefono] = useState(cliente.telefono);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    setGuardando(true);
    await onActualizar(cliente.id, { nombre, email, telefono });
    setGuardando(false);
    setEditando(false);
  }

  if (editando) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 420 }}>
        <Field id="ed-nombre" label="Nombre y apellido" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <Field id="ed-email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field id="ed-telefono" label="Teléfono" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => {
              setEditando(false);
              setNombre(cliente.nombre);
              setEmail(cliente.email);
              setTelefono(cliente.telefono);
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
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ width: 72, height: 72, flex: "none", borderRadius: "50%", background: color.ink, color: accent, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.mono, fontSize: 22, fontWeight: 600 }}>
          {cliente.nombre.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ margin: 0, fontFamily: font.display, fontWeight: 600, fontSize: 28 }}>{cliente.nombre}</h2>
            {!cliente.activo && (
              <span style={{ display: "inline-flex", alignItems: "center", height: 26, padding: "0 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: "#F6DADA", color: "#8A1418" }}>
                Dado de baja
              </span>
            )}
          </div>
          <div style={{ marginTop: 6, display: "flex", gap: 16, fontSize: 14, color: color.textSoft }}>
            <span>{cliente.email}</span>
            <span style={{ fontFamily: font.mono }}>{cliente.telefono}</span>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, flex: "none" }}>
        <button
          onClick={() => setEditando(true)}
          style={{ height: 44, padding: "0 16px", borderRadius: 12, border: `1px solid ${color.borderStrong}`, background: color.surface, fontWeight: 700, fontSize: 14 }}
        >
          Editar
        </button>
        <button
          onClick={() => onActualizar(cliente.id, { activo: !cliente.activo })}
          style={{
            height: 44,
            padding: "0 16px",
            borderRadius: 12,
            border: cliente.activo ? "1px solid #8A1418" : "none",
            background: cliente.activo ? color.surface : "#2E9E5B",
            color: cliente.activo ? "#8A1418" : "#FFFFFF",
            fontWeight: 700,
            fontSize: 14
          }}
        >
          {cliente.activo ? "Dar de baja" : "Reactivar"}
        </button>
        <a
          href={linkWhatsapp(cliente.telefono, `¡Hola ${cliente.nombre.split(" ")[0]}!`)}
          target="_blank"
          rel="noreferrer"
          style={{ height: 44, boxSizing: "border-box", padding: "0 16px", display: "flex", alignItems: "center", gap: 10, borderRadius: 12, background: accent, fontWeight: 700, fontSize: 14 }}
        >
          WhatsApp
        </a>
      </div>
    </div>
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
