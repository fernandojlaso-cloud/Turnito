import { construirEmailCentroNuevo } from "./email.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const MAIL_DIRECTOR = "director.gymdata@gmail.com";
const PANEL_URL = "https://turnito-rouge.vercel.app/director";

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const centro = payload.record as {
      id: string;
      nombre: string;
      telefono_whatsapp: string | null;
      creado_por: string | null;
    };

    if (!centro || !centro.creado_por) {
      // Lo creó el director a mano desde /director => no hay nada que avisar.
      return new Response("ok", { status: 200 });
    }

    const { subject, html } = construirEmailCentroNuevo({
      centroNombre: centro.nombre,
      telefonoWhatsapp: centro.telefono_whatsapp,
      panelUrl: PANEL_URL
    });

    const respuesta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Turnito <turnos@turnitoapp.com.ar>",
        to: MAIL_DIRECTOR,
        subject,
        html
      })
    });

    if (!respuesta.ok) {
      console.error("notificar-centro-nuevo: Resend respondió", respuesta.status, await respuesta.text());
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("notificar-centro-nuevo: error inesperado", err);
    return new Response("ok", { status: 200 }); // no bloquear el registro por esto
  }
});
