import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useCentro } from "@/lib/useCentro";
import { useReservar } from "@/lib/useReservar";
import { calcularSlots, formatearDiaLargo, formatearHora, linkWhatsapp } from "@/lib/slots";
import { supabase } from "@/lib/supabase";
import type { Turno } from "@/lib/database.types";
import { FondoApp, SelectCard, SlotButton, PrimaryButton, ProgressBar, Field } from "@/components/UI";
import { tokens } from "@/styles/tokens";
import { generarQrDataUrl } from "@/lib/qr";

const { color, font } = tokens;

function proximosDias(n: number): Date[] {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Array.from({ length: n }, (_, i) => new Date(hoy.getTime() + i * 86400000));
}

export default function Reservar() {
  const { slug } = useParams();
  const { centro, actividades, profesionalesPorActividad, disponibilidad, loading, error } = useCentro(slug);
  const { reservar, reservando, error: errorReserva } = useReservar();

  const [step, setStep] = useState(1);
  const [actividadId, setActividadId] = useState<string | null>(null);
  const dias = useMemo(() => proximosDias(6), []);
  const [diaIdx, setDiaIdx] = useState(0);
  const [slotIdx, setSlotIdx] = useState<number | null>(null);
  const [turnosDelDia, setTurnosDelDia] = useState<Turno[]>([]);
  const [nombre, setNombre] = useState("");
  const [dni, setDni] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [turnoIdCreado, setTurnoIdCreado] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const accent = centro?.color_acento ?? color.accentDefault;
  const actividad = actividades?.find((a) => a.id === actividadId) ?? null;
  const dia = dias[diaIdx];

  // Al cambiar de actividad o de día, traemos los turnos existentes de ese
  // día para saber qué horarios ya están ocupados / sin cupo.
  useEffect(() => {
    if (!actividad || !centro) return;
    setSlotIdx(null);
    const inicio = new Date(dia);
    const fin = new Date(dia.getTime() + 86400000);
    supabase
      .from("turnos")
      .select("*")
      .eq("centro_id", centro.id)
      .gte("inicio", inicio.toISOString())
      .lt("inicio", fin.toISOString())
      .then(({ data }) => setTurnosDelDia((data as Turno[]) ?? []));
  }, [actividad, dia, centro]);

  const slots = useMemo(() => {
    if (!actividad || !disponibilidad) return [];
    return calcularSlots(actividad, disponibilidad, dia, turnosDelDia);
  }, [actividad, disponibilidad, dia, turnosDelDia]);

  const slotElegido = slotIdx !== null ? slots[slotIdx] : null;

  async function confirmar() {
    if (!centro || !actividad || !slotElegido) return;
    const profesionalId = profesionalesPorActividad?.[actividad.id]?.[0] ?? null;
    const id = await reservar({
      centroId: centro.id,
      actividadId: actividad.id,
      profesionalId,
      inicio: slotElegido.inicio,
      nombre,
      email,
      telefono,
      dni
    });
    if (id) {
      setTurnoIdCreado(id);
      generarQrDataUrl(id).then(setQrDataUrl);
      setStep(4);
    }
  }

  if (loading) return <Centered>Cargando…</Centered>;
  if (error || !centro) return <Centered>{error ?? "Centro no encontrado."}</Centered>;
  if (!centro.aprobado) return <Centered>Este centro todavía no está disponible.</Centered>;
  if (!centro.plan_activo) return <Centered>Este centro no está disponible en este momento.</Centered>;

  const puedeAvanzarPaso2 = !!slotElegido && slotElegido.disponible;
  const puedeConfirmar = nombre.trim().length > 1 && /\S+@\S+\.\S+/.test(email) && telefono.trim().length > 5 && dni.trim().length > 5;

  return (
    <div style={{ minHeight: "100vh", position: "relative", fontFamily: font.body }}>
      <FondoApp />

      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Header centro={centro} accent={accent} />

        {step < 4 && (
          <div style={{ padding: "16px 20px 0", maxWidth: 480, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
            <ProgressBar step={step} of={3} />
            <div style={{ marginTop: 10, fontFamily: font.mono, fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", color: "#FFFFFF" }}>
              PASO {step} DE 3
            </div>
          </div>
        )}

        <main style={{ flex: 1, padding: 20, maxWidth: 480, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
          <div style={{ background: "rgba(255,255,255,0.96)", backdropFilter: "blur(6px)", borderRadius: 24, padding: 20, boxShadow: "0 8px 30px rgba(0,0,0,0.25)" }}>
            {step === 1 && (
              <>
                <h1 style={{ margin: 0, fontFamily: font.display, fontWeight: 600, fontSize: 26 }}>Elegí la actividad</h1>
                <p style={{ margin: "6px 0 20px", fontSize: 14, color: color.textSoft }}>Reservá tu turno en menos de un minuto.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {actividades?.map((a) => (
                    <SelectCard
                      key={a.id}
                      selected={a.id === actividadId}
                      onClick={() => setActividadId(a.id)}
                      accent={accent}
                      code={a.codigo}
                      title={a.nombre}
                      subtitle={`${a.tipo === "grupal" ? "Grupal" : "Individual"} · ${a.duracion_min} min`}
                    />
                  ))}
                  {!actividades?.length && <p style={{ color: color.textMuted }}>Este centro todavía no activó actividades.</p>}
                </div>
              </>
            )}

            {step === 2 && actividad && (
              <>
                <h1 style={{ margin: 0, fontFamily: font.display, fontWeight: 600, fontSize: 26 }}>Día y horario</h1>
                <p style={{ margin: "6px 0 4px", fontSize: 14, color: color.textSoft }}>{actividad.nombre}</p>
                {actividad.direccion && (
                  <p style={{ margin: "0 0 20px", fontSize: 13, color: color.textMuted, display: "flex", alignItems: "center", gap: 6 }}>
                    📍 {actividad.direccion}
                  </p>
                )}
                {!actividad.direccion && <div style={{ marginBottom: 20 }} />}

                <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                  {dias.map((d, i) => {
                    const selected = i === diaIdx;
                    return (
                      <button
                        key={i}
                        onClick={() => setDiaIdx(i)}
                        aria-pressed={selected}
                        style={{
                          flex: "none",
                          width: 64,
                          height: 72,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                          borderRadius: 14,
                          background: selected ? accent : color.surface,
                          border: `1px solid ${selected ? color.ink : color.border}`
                        }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 700 }}>
                          {d.toLocaleDateString("es-AR", { weekday: "short" }).toUpperCase()}
                        </span>
                        <span style={{ fontFamily: font.mono, fontSize: 18, fontWeight: 600 }}>{d.getDate()}</span>
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginTop: 20 }}>
                  {slots.map((s, i) => (
                    <SlotButton
                      key={i}
                      time={formatearHora(s.inicio)}
                      sub={
                        actividad.tipo === "grupal"
                          ? s.disponible
                            ? `${s.cuposLibres} ${s.cuposLibres === 1 ? "cupo" : "cupos"}`
                            : "Completo"
                          : s.disponible
                          ? "Disponible"
                          : "Ocupado"
                      }
                      disabled={!s.disponible}
                      selected={slotIdx === i}
                      accent={accent}
                      soloSocios={s.soloSocios}
                      onClick={() => setSlotIdx(i)}
                    />
                  ))}
                  {!slots.length && <p style={{ color: color.textMuted }}>Sin horarios disponibles ese día.</p>}
                </div>

                {slotElegido?.soloSocios && (
                  <p style={{ marginTop: 14, fontSize: 14, color: "#8A1418", lineHeight: 1.5, fontWeight: 600 }}>
                    ⭐ Este horario es solo para socios activos. Si no sos socio, elegí otro horario o date de alta primero con el centro.
                  </p>
                )}

                <p style={{ marginTop: 16, fontSize: 14, color: color.textSoft, lineHeight: 1.5 }}>
                  {actividad.tipo === "grupal"
                    ? `Clase grupal · máximo ${actividad.cupo} personas por turno.`
                    : `Turno individual · ${actividad.duracion_min} min.`}
                </p>
              </>
            )}

            {step === 3 && actividad && slotElegido && (
              <>
                <h1 style={{ margin: 0, fontFamily: font.display, fontWeight: 600, fontSize: 26 }}>Tus datos</h1>
                <p style={{ margin: "6px 0 20px", fontSize: 14, color: color.textSoft }}>No necesitás crear una cuenta.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <Field id="nombre" label="Nombre y apellido" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Camila Sosa" />
                  <Field id="email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@correo.com" />
                  <Field id="telefono" label="Teléfono (WhatsApp)" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Ej. 11 2345 6789" />
                  <Field id="dni" label="DNI" value={dni} onChange={(e) => setDni(e.target.value)} placeholder="Ej. 30123456" />
                </div>
                <div style={{ marginTop: 20, background: color.ink, color: "#FFFFFF", borderRadius: 16, padding: "18px 20px" }}>
                  <div style={{ fontFamily: font.mono, fontSize: 12, letterSpacing: "0.1em", color: "#9AA0A6" }}>TU TURNO</div>
                  <div style={{ fontFamily: font.display, fontWeight: 600, fontSize: 19 }}>{actividad.nombre}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: accent }}>{formatearDiaLargo(dia)}</div>
                  <div style={{ fontFamily: font.mono, fontSize: 14 }}>{formatearHora(slotElegido.inicio)} · {actividad.duracion_min} min</div>
                  {actividad.direccion && <div style={{ marginTop: 6, fontSize: 13, color: "#D9DBDC" }}>📍 {actividad.direccion}</div>}
                  <div style={{ marginTop: 4, fontSize: 13, color: "#D9DBDC" }}>
                    Cancelación gratuita hasta {actividad.cancelacion_horas} h antes.
                  </div>
                </div>
                {errorReserva && <p style={{ color: "#8A1418", marginTop: 12 }}>{errorReserva}</p>}
              </>
            )}

            {step === 4 && actividad && slotElegido && (
              <Confirmacion
                centroTelefonoWhatsapp={centro.telefono_whatsapp}
                accent={accent}
                actividadNombre={actividad.nombre}
                direccion={actividad.direccion}
                diaLargo={formatearDiaLargo(dia)}
                hora={`${formatearHora(slotElegido.inicio)} · ${actividad.duracion_min} min`}
                politica={`Gratis hasta ${actividad.cancelacion_horas} h antes`}
                turnoId={turnoIdCreado}
                qrDataUrl={qrDataUrl}
              />
            )}
          </div>
        </main>

        {step < 4 && (
          <div
            style={{
              boxSizing: "border-box",
              padding: "14px 20px calc(14px + env(safe-area-inset-bottom, 0px))",
              background: color.surface,
              borderTop: `1px solid ${color.border}`,
              display: "flex",
              gap: 12,
              maxWidth: 480,
              margin: "0 auto",
              width: "100%"
            }}
          >
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                aria-label="Volver al paso anterior"
                style={{
                  width: 56,
                  height: 56,
                  flex: "none",
                  borderRadius: 14,
                  border: `1px solid ${color.borderStrong}`,
                  background: color.surface
                }}
              >
                ←
              </button>
            )}
            <PrimaryButton
              accent={accent}
              disabled={
                (step === 1 && !actividadId) ||
                (step === 2 && !puedeAvanzarPaso2) ||
                (step === 3 && (!puedeConfirmar || reservando))
              }
              onClick={() => {
                if (step === 3) confirmar();
                else setStep(step + 1);
              }}
            >
              {step === 3 ? (reservando ? "Confirmando…" : "Confirmar turno") : "Continuar"}
            </PrimaryButton>
          </div>
        )}
      </div>
    </div>
  );
}

function Header({ centro, accent }: { centro: { nombre: string; logo_url: string | null }; accent: string }) {
  return (
    <div
      style={{
        height: 64,
        flex: "none",
        boxSizing: "border-box",
        padding: "0 20px",
        background: "rgba(255,255,255,0.96)",
        backdropFilter: "blur(6px)",
        borderBottom: `1px solid ${color.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {centro.logo_url && (
          <img src={centro.logo_url} alt="" style={{ width: 32, height: 32, borderRadius: 8, objectFit: "cover" }} />
        )}
        <div style={{ fontFamily: font.display, fontWeight: 600, fontSize: 17 }}>{centro.nombre}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: accent }} />
        <span style={{ fontFamily: font.display, fontWeight: 700, fontSize: 14 }}>turnito</span>
      </div>
    </div>
  );
}

function Confirmacion({
  centroTelefonoWhatsapp,
  accent,
  actividadNombre,
  direccion,
  diaLargo,
  hora,
  politica,
  turnoId,
  qrDataUrl
}: {
  centroTelefonoWhatsapp: string | null;
  accent: string;
  actividadNombre: string;
  direccion: string | null;
  diaLargo: string;
  hora: string;
  politica: string;
  turnoId: string | null;
  qrDataUrl: string | null;
}) {
  const wa = centroTelefonoWhatsapp
    ? linkWhatsapp(centroTelefonoWhatsapp, `¡Hola! Quiero avisar sobre mi turno de ${actividadNombre} (${diaLargo}, ${hora}).`)
    : null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 16, paddingTop: 12 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 32
          }}
        >
          ✓
        </div>
        <div>
          <h1 style={{ margin: 0, fontFamily: font.display, fontWeight: 600, fontSize: 28 }}>Turno confirmado</h1>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: color.textSoft }}>Te enviamos los detalles por email.</p>
        </div>
      </div>

      <div style={{ background: color.surface, border: `1px solid ${color.border}`, borderRadius: 16, padding: "4px 20px" }}>
        <Row label="ACTIVIDAD" value={actividadNombre} />
        {direccion && <Row label="DIRECCIÓN" value={direccion} />}
        <Row label="DÍA" value={diaLargo} />
        <Row label="HORARIO" value={hora} mono />
        <Row label="CANCELACIÓN" value={politica} last />
      </div>

     {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            height: 56,
            borderRadius: 14,
            background: color.ink,
            color: "#FFFFFF",
            fontWeight: 700,
            fontSize: 16
          }}
        >
          Avisar por WhatsApp
        </a>
      )}
      {qrDataUrl && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <img src={qrDataUrl} alt="QR de presentismo" width={160} height={160} style={{ borderRadius: 12 }} />
          <p style={{ margin: 0, fontSize: 13, color: color.textSoft, textAlign: "center" }}>
            Mostrá este código al llegar a tu turno
          </p>
        </div>
      )}
      {turnoId && <p style={{ fontSize: 12, color: color.textMuted, textAlign: "center" }}>Código de turno: {turnoId.slice(0, 8)}</p>}
    </div>
  );
}

function Row({ label, value, mono, last }: { label: string; value: string; mono?: boolean; last?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 12,
        padding: "14px 0",
        borderBottom: last ? "none" : `1px solid ${color.border}`
      }}
    >
      <span style={{ fontFamily: font.mono, fontSize: 11, letterSpacing: "0.1em", color: color.textMuted }}>{label}</span>
      <span style={{ fontFamily: mono ? font.mono : font.body, fontWeight: 700, fontSize: 15, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: color.textSoft }}>
      {children}
    </div>
  );
}
