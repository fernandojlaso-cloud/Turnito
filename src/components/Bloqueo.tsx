import type { ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { tokens } from "@/styles/tokens";

const { color } = tokens;

export function cerrarSesion() {
  return supabase.auth.signOut();
}

/** Pantalla de mensaje a pantalla completa con salida: se usa cuando el
 *  usuario está logueado pero no puede entrar (centro pendiente, dado de
 *  baja, sin permisos). Sin el botón quedaría atrapado sin poder cambiar
 *  de usuario. */
export default function Bloqueo({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        color: color.textSoft,
        textAlign: "center",
        padding: 24
      }}
    >
      <p style={{ margin: 0, maxWidth: 480, lineHeight: 1.6 }}>{children}</p>
      <button
        onClick={() => cerrarSesion()}
        style={{ height: 48, padding: "0 22px", borderRadius: 14, border: `1px solid ${color.borderStrong}`, background: color.surface, color: color.ink, fontWeight: 700, fontSize: 15 }}
      >
        Cerrar sesión
      </button>
    </div>
  );
}
