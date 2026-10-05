import { tokens } from "@/styles/tokens";
import { useModoVista } from "@/lib/useModoVista";

const { color } = tokens;

export default function SelectorVista() {
  const { modo, setVistaForzada } = useModoVista();

  return (
    <div
      style={{
        display: "flex",
        padding: 3,
        gap: 3,
        borderRadius: 10,
        background: color.bg,
        border: `1px solid ${color.border}`,
        flex: "none"
      }}
    >
      <button
        onClick={() => setVistaForzada("escritorio")}
        aria-pressed={modo === "escritorio"}
        aria-label="Ver como escritorio"
        title="Ver como escritorio"
        style={{
          width: 36,
          height: 32,
          borderRadius: 8,
          border: 0,
          fontSize: 16,
          background: modo === "escritorio" ? color.surface : "transparent"
        }}
      >
        🖥️
      </button>
      <button
        onClick={() => setVistaForzada("movil")}
        aria-pressed={modo === "movil"}
        aria-label="Ver como móvil"
        title="Ver como móvil"
        style={{
          width: 36,
          height: 32,
          borderRadius: 8,
          border: 0,
          fontSize: 16,
          background: modo === "movil" ? color.surface : "transparent"
        }}
      >
        📱
      </button>
    </div>
  );
}
