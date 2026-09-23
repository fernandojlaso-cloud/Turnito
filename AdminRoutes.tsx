import { Route, Routes } from "react-router-dom";
import { useSesionAdmin } from "@/lib/useSesionAdmin";
import { tokens } from "@/styles/tokens";
import Login from "./Login";
import Agenda from "./Agenda";
import Actividades from "./Actividades";
import Clientes from "./Clientes";

const { color } = tokens;

export default function AdminRoutes() {
  const { centro, cargando, autenticado } = useSesionAdmin();

  if (cargando) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: color.textSoft }}>
        Cargando…
      </div>
    );
  }

  if (!autenticado) return <Login />;

  if (!centro) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: color.textSoft, textAlign: "center", padding: 24 }}>
        Tu usuario todavía no está vinculado a ningún centro. Pedile al administrador que te agregue en la tabla
        centro_usuarios.
      </div>
    );
  }

  return (
    <Routes>
      <Route index element={<Agenda centro={centro} />} />
      <Route path="actividades" element={<Actividades centro={centro} />} />
      <Route path="clientes" element={<Clientes centro={centro} />} />
    </Routes>
  );
}
