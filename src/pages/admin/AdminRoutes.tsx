import { Route, Routes } from "react-router-dom";
import { useSesionAdmin } from "@/lib/useSesionAdmin";
import { tokens } from "@/styles/tokens";
import Login from "./Login";
import Bloqueo from "@/components/Bloqueo";
import Accesos from "./Accesos";
import Agenda from "./Agenda"; 
import Actividades from "./Actividades";
import Clientes from "./Clientes";
import Estadisticas from "./Estadisticas";
import Profesionales from "./Profesionales";

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
    return <Bloqueo>Tu usuario todavía no está vinculado a ningún centro. Pedile al administrador que te agregue en la tabla centro_usuarios.</Bloqueo>;
  }

  if (!centro.aprobado) {
    return <Bloqueo>Tu centro todavía está pendiente de aprobación. Te vamos a avisar en cuanto quede activo.</Bloqueo>;
  }

  if (!centro.plan_activo) {
    return <Bloqueo>Este centro está dado de baja. Contactá al administrador de Turnito para reactivarlo.</Bloqueo>;
  }

  return (
    <Routes>
  <Route index element={<Agenda centro={centro} />} />
  <Route path="actividades" element={<Actividades centro={centro} />} />
  <Route path="clientes" element={<Clientes centro={centro} />} />
  <Route path="accesos" element={<Accesos centro={centro} />} />
  <Route path="estadisticas" element={<Estadisticas centro={centro} />} />
  <Route path="profesionales" element={<Profesionales centro={centro} />} />
</Routes>
  );
}
