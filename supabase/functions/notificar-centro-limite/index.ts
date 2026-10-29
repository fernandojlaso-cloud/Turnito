import { construirEmailCentroLimite } from "./email.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const MAIL_DIRECTOR = "director.gymdata@gmail.com";
const PANEL_URL = "https://turnito-rouge.vercel.app/director";

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const centro = payload.record as { id: string; nombre: string; aprobado: boolean };
    const anterior = payload.old_record as { aprobado: boolean } | null;

    // Solo nos interesa el momento exacto en que pasa de aprobado a
    // bloqueado (el trigger del límite de 50 turnos), no cualquier otro
    // update de la fila.
    if (!centro || centro.aprobado || !anterior || !anterior.aprobado) {
      return new Response("ok", { status: 200 });
    }

    const { subject, html } = construirEmailCentroLimite({
      centroNombre: centro.nombre,
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
      console.error("notificar-centro-limite: Resend respondió", respuesta.status, await respuesta.text());
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("notificar-centro-limite: error inesperado", err);
    return new Response("ok", { status: 200 }); // no bloquear nada por esto
  }
});
