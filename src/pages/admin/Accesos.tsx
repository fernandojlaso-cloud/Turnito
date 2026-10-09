import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useAccesos, type EscaneoUI } from "@/lib/useAccesos";
import type { Centro } from "@/lib/database.types";
import AdminLayout from "./AdminLayout";
import { tokens } from "@/styles/tokens";

const { color, font } = tokens;
const ID_LECTOR = "lector-qr";

export default function Accesos({ centro }: { centro: Centro }) {
  const { procesarQr, procesando } = useAccesos(centro);
  const [ultimoResultado, setUltimoResultado] = useState<EscaneoUI | null>(null);
  const lectorRef = useRef<Html5Qrcode | null>(null);
  const procesandoRef = useRef(false);

  useEffect(() => {
    const lector = new Html5Qrcode(ID_LECTOR);
    lectorRef.current = lector;

    lector
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 260 },
        async (turnoId) => {
          if (procesandoRef.current) return;
          procesandoRef.current = true;
          const resultado = await procesarQr(turnoId);
          setUltimoResultado(resultado);
          setTimeout(() => {
            procesandoRef.current = false;
          }, 2000);
        },
        () => {
          /* frame sin QR legible: no hacer nada, se sigue escaneando */
        }
      )
      .catch(() => {
        setUltimoResultado({ resultado: { tipo: "no_encontrado" } });
      });

    return () => {
      try {
        lector.stop().catch(() => {});
      } catch {
        // El escáner todavía no había terminado de arrancar cuando se
        // desmontó la pantalla: no hay nada que detener, lo ignoramos.
      }
    };
  }, [procesarQr]);

  return (
    <AdminLayout centro={centro}>
      <h1 style={{ margin: 0, fontFamily: font.display, fontWeight: 600, fontSize: 32 }}>Accesos</h1>
      <p style={{ margin: "6px 0 24px", fontSize: 15, color: color.textSoft }}>
        Apuntá la cámara al QR que el cliente recibió al reservar.
      </p>

      <div
        id={ID_LECTOR}
        style={{ width: "100%", maxWidth: 420, aspectRatio: "1 / 1", borderRadius: 20, overflow: "hidden", background: "#000" }}
      />

      {procesando && <p style={{ marginTop: 16, color: color.textSoft }}>Verificando…</p>}

      {ultimoResultado && <ResultadoEscaneoCard resultado={ultimoResultado} />}
    </AdminLayout>
  );
}

function ResultadoEscaneoCard({ resultado }: { resultado: EscaneoUI }) {
  const { tipo } = resultado.resultado;

  const estilos: Record<string, { bg: string; texto: string }> = {
    ok: { bg: "#DFF3E6", texto: "#1E7A46" },
    ya_registrado: { bg: "#FCEBD5", texto: "#8A5A00" },
    no_corresponde_hoy: { bg: "#F6DADA", texto: "#8A1418" },
    cancelado: { bg: "#F6DADA", texto: "#8A1418" },
    no_encontrado: { bg: "#F6DADA", texto: "#8A1418" }
  };
  const { bg, texto } = estilos[tipo];

  const mensajes: Record<string, string> = {
    ok: "Acceso registrado",
    ya_registrado: "Este turno ya tenía el acceso registrado",
    no_corresponde_hoy: "Este QR no corresponde a un turno de hoy",
    cancelado: "Este turno fue cancelado",
    no_encontrado: "No pudimos encontrar este turno"
  };

  return (
    <div style={{ marginTop: 20, maxWidth: 420, background: bg, borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ fontWeight: 700, fontSize: 17, color: texto }}>{mensajes[tipo]}</span>
      {tipo === "ok" && (
        <>
          <span style={{ fontSize: 15, color: texto }}>
            {resultado.clienteNombre} — {resultado.actividadNombre} · {resultado.hora}
          </span>
          {resultado.alertaMedica && (
            <span style={{ fontWeight: 700, fontSize: 14, color: "#8A5A00" }}>
              ⚠️ Este cliente tiene datos médicos cargados — consultar ficha
            </span>
          )}
          {resultado.sinClasesDisponibles && (
            <span style={{ fontWeight: 700, fontSize: 14, color: "#8A5A00" }}>
              ⚠️ Sin clases disponibles — avisale que se quedó sin clases compradas
            </span>
          )}
        </>
      )}
      {resultado.resultado.tipo === "ya_registrado" && (
        <span style={{ fontSize: 14, color: texto }}>
          Hora del registro: {new Date(resultado.resultado.checkinEn).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      )}
    </div>
  );
}
