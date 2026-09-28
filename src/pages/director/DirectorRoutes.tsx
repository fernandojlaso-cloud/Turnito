import { useSesionDirector } from "@/lib/useDirector";
import { tokens } from "@/styles/tokens";
import Login from "@/pages/admin/Login";
import Bloqueo from "@/components/Bloqueo";
import Centros from "./Centros";

const { color } = tokens;

export default function DirectorRoutes() {
  const { esDirector, cargando, autenticado } = useSesionDirector();

  if (cargando) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: color.textSoft }}>
        Cargando…
      </div>
    );
  }

  if (!autenticado) return <Login />;

  if (!esDirector) {
    return <Bloqueo>Tu usuario no tiene permisos de director. Si te corresponde, pedí que te agreguen en la tabla super_admins.</Bloqueo>;
  }

  return <Centros />;
}
