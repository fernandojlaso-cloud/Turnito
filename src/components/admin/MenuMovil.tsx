import { NavLink } from "react-router-dom";
import { tokens } from "@/styles/tokens";
import type { Centro } from "@/lib/database.types";
import { cerrarSesion } from "@/components/Bloqueo";

const { color, font } = tokens;

interface LinkNav {
  to: string;
  label: string;
  end?: boolean;
}

export default function MenuMovil({
  centro,
  links,
  onCerrar
}: {
  centro: Centro;
  links: LinkNav[];
  onCerrar: () => void;
}) {
  return (
    <div
      onClick={onCerrar}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: color.ink,
        color: "#FFFFFF",
        boxSizing: "border-box",
        padding: "20px 20px calc(20px + env(safe-area-inset-bottom, 0px))",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto"
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: centro.color_acento }} />
            <span style={{ fontFamily: font.display, fontWeight: 700, fontSize: 22 }}>turnito</span>
          </div>
          <button
            onClick={onCerrar}
            aria-label="Cerrar menú"
            style={{ width: 40, height: 40, borderRadius: 12, border: "1px solid #3A3D42", background: "transparent", color: "#FFFFFF", fontSize: 18 }}
          >
            ✕
          </button>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              onClick={onCerrar}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                height: 52,
                padding: "0 14px",
                borderRadius: 12,
                background: isActive ? centro.color_acento : "transparent",
                color: isActive ? color.ink : "#E4E5E7",
                fontWeight: isActive ? 700 : 600,
                fontSize: 16
              })}
            >
              {l.label}
            </NavLink>
          ))}
          <a
            href={`/r/${centro.slug}`}
            target="_blank"
            rel="noreferrer"
            onClick={onCerrar}
            style={{ display: "flex", alignItems: "center", height: 52, padding: "0 14px", borderRadius: 12, color: "#E4E5E7", fontWeight: 600, fontSize: 16 }}
          >
            Página de reservas
          </a>
        </nav>

        <button
          onClick={() => cerrarSesion()}
          style={{ height: 48, borderRadius: 12, border: "1px solid #3A3D42", background: "transparent", color: "#E4E5E7", fontWeight: 600, fontSize: 15 }}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
