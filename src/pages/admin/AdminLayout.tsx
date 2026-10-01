import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { tokens } from "@/styles/tokens";
import type { Centro } from "@/lib/database.types";
import { cerrarSesion } from "@/components/Bloqueo";

const { color, font } = tokens;

const links = [
  { to: "/admin", label: "Agenda", end: true },
  { to: "/admin/actividades", label: "Actividades" },
  { to: "/admin/profesionales", label: "Profesionales" },
  { to: "/admin/clientes", label: "Clientes" },
  { to: "/admin/accesos", label: "Accesos" },
  { to: "/admin/estadisticas", label: "Estadísticas" }
];

export default function AdminLayout({ centro, children }: { centro: Centro; children: ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: color.bg }}>
      <aside
        style={{
          width: 248,
          flex: "none",
          boxSizing: "border-box",
          background: color.ink,
          color: "#FFFFFF",
          padding: "32px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 32
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px" }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: centro.color_acento }} />
          <span style={{ fontFamily: font.display, fontWeight: 700, fontSize: 22 }}>turnito</span>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                height: 48,
                padding: "0 14px",
                borderRadius: 12,
                background: isActive ? centro.color_acento : "transparent",
                color: isActive ? color.ink : "#E4E5E7",
                fontWeight: isActive ? 700 : 600,
                fontSize: 15
              })}
            >
              {l.label}
            </NavLink>
          ))}
          <a
            href={`/r/${centro.slug}`}
            target="_blank"
            rel="noreferrer"
            style={{ display: "flex", alignItems: "center", height: 48, padding: "0 14px", borderRadius: 12, color: "#E4E5E7", fontWeight: 600, fontSize: 15 }}
          >
            Página de reservas
          </a>
        </nav>
        <div style={{ marginTop: "auto", padding: "0 8px", display: "flex", alignItems: "center", gap: 10 }}>
          {centro.logo_url ? (
            <img src={centro.logo_url} alt="" style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover", flex: "none" }} />
          ) : (
            <div style={{ width: 36, height: 36, flex: "none", borderRadius: 10, background: "#26272B" }} />
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{centro.nombre}</div>
            <div style={{ fontSize: 13, color: "#9AA0A6" }}>Panel del centro</div>
          </div>
        </div>
        <div>
          <button
            onClick={() => cerrarSesion()}
            style={{ marginTop: 16, width: "100%", height: 44, borderRadius: 12, border: "1px solid #3A3D42", background: "transparent", color: "#E4E5E7", fontWeight: 600, fontSize: 14 }}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, minWidth: 0, boxSizing: "border-box", padding: 40 }}>{children}</main>
    </div>
  );
}
