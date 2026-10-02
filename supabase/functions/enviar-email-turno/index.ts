import { createClient } from "npm:@supabase/supabase-js@2";
import QRCode from "npm:qrcode@1.5.3";
import { construirEmail } from "./email.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const turno = payload.record as {
      id: string;
      centro_id: string;
      actividad_id: string;
      cliente_id: string;
      inicio: string;
    };

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const [{ data: centro }, { data: actividad }, { data: cliente }] = await Promise.all([
      supabase.from("centros").select("nombre").eq("id", turno.centro_id).maybeSingle(),
      supabase.from("actividades").select("nombre").eq("id", turno.actividad_id).maybeSingle(),
      supabase.from("clientes").select("nombre, email").eq("id", turno.cliente_id).maybeSingle()
    ]);

    if (!centro || !actividad || !cliente) {
      console.error("enviar-email-turno: falta centro/actividad/cliente para el turno", turno.id);
      return new Response("ok", { status: 200 });
    }

    const inicio = new Date(turno.inicio);
    const diaLargo = inicio.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
    const hora = inicio.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

    const qrPngBase64 = await QRCode.toDataURL(turno.id, { margin: 1, width: 240 }).then((url: string) =>
      url.replace("data:image/png;base64,", "")
    );

    const { subject, html } = construirEmail({
      clienteNombre: cliente.nombre,
      centroNombre: centro.nombre,
      actividadNombre: actividad.nombre,
      diaLargo,
      hora
    });

    const respuesta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Turnito <turnos@RELLENAR-CON-EL-DOMINIO-VERIFICADO>",
        to: cliente.email,
        subject,
        html,
        attachments: [
          {
            filename: "mi-qr-turnito.png",
            content: qrPngBase64,
            content_id: "qr-turno"
          }
        ]
      })
    });

    if (!respuesta.ok) {
      console.error("enviar-email-turno: Resend respondió", respuesta.status, await respuesta.text());
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("enviar-email-turno: error inesperado", err);
    return new Response("ok", { status: 200 }); // no bloquear la reserva por esto
  }
});
