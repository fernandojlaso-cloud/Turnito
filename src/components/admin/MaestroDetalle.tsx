import type { ReactNode } from "react";
import { tokens } from "@/styles/tokens";
import { useModoVista } from "@/lib/useModoVista";

const { color } = tokens;

export default function MaestroDetalle({
  lista,
  detalle,
  hayDetalle,
  onVolver
}: {
  lista: ReactNode;
  detalle: ReactNode;
  hayDetalle: boolean;
  onVolver: () => void;
}) {
  const { modo } = useModoVista();

  if (modo === "movil") {
    if (hayDetalle) {
      return (
        <div>
          <button
            onClick={onVolver}
            style={{
              height: 40,
              padding: "0 14px",
              marginBottom: 16,
              borderRadius: 10,
              border: `1px solid ${color.borderStrong}`,
              background: color.surface,
              fontWeight: 700,
              fontSize: 14
            }}
          >
            ← Volver
          </button>
          {detalle}
        </div>
      );
    }
    return <div>{lista}</div>;
  }

  return (
    <div style={{ display: "flex", gap: 24, marginTop: 24, alignItems: "flex-start" }}>
      {lista}
      {detalle}
    </div>
  );
}
