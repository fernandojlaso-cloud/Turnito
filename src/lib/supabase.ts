import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  // Falla temprano y con un mensaje claro en vez de un error críptico
  // de fetch más adelante.
  // eslint-disable-next-line no-console
  console.error(
    "Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copiá .env.example a .env y completalo."
  );
}

// Sin el tipo genérico Database: supabase-js exige un shape más estricto
// (Insert/Update por tabla) del que conviene mantener a mano en un MVP.
// Los tipos de fila siguen viviendo en database.types.ts y se usan para
// anotar manualmente los resultados de cada consulta.
export const supabase = createClient(url, anonKey);
