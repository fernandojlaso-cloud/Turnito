import { createClient } from "npm:@supabase/supabase-js@2";
import { construirEmailCentroAprobado } from "./email.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const PANEL_ADMIN_URL = "https://turnito-rouge.vercel.app/admin";

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const centro = payload.record as { id: string; nombre: string; aprobado: boolean };
    const anterior = payload.old_record as { aprobado: boolean } | null;

    // Solo nos interesa el momento exacto en que pasa de pendiente a aprobado,
    // no cualquier otro update de la fila (ej. cambiar el logo o el nombre).
    if (!centro || !centro.aprobado || !anterior || anterior.aprobado) {
      return new Response("ok", { status: 200 });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: vinculos, error: errorVinculos } = await supabase
      .from("centro_usuarios")
      .select("user_id")
      .eq("centro_id", centro.id)
      .eq("rol", "admin");

    if (errorVinculos || !vinculos || !vinculos.length) {
      console.error("notificar-centro-aprobado: no hay admin vinculado al centro", centro.id, errorVinculos);
      return new Response("ok", { status: 200 });
    }

    const { subject, html } = construirEmailCentroAprobado({
      centroNombre: centro.nombre,
      panelUrl: PANEL_ADMIN_URL
    });

    for (const vinculo of vinculos) {
      const { data: usuario, error: errorUsuario } = await supabase.auth.admin.getUserById(vinculo.user_id);
      const destinatario = usuario?.user?.email;

      if (errorUsuario || !destinatario) {
        console.error("notificar-centro-aprobado: no se pudo obtener el email del usuario", vinculo.user_id, errorUsuario);
        continue;
      }

      const respuesta = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "Turnito <turnos@turnitoapp.com.ar>",
          to: destinatario,
          subject,
          html
        })
      });

      if (!respuesta.ok) {
        console.error("notificar-centro-aprobado: Resend respondió", respuesta.status, await respuesta.text());
      }
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("notificar-centro-aprobado: error inesperado", err);
    return new Response("ok", { status: 200 }); // no bloquear la aprobación por esto
  }
});
