export interface DatosCentroEmail {
  centroNombre: string;
  telefonoWhatsapp: string | null;
  panelUrl: string;
}

export function construirEmailCentroNuevo(datos: DatosCentroEmail): { subject: string; html: string } {
  const subject = `Nuevo gimnasio activado: ${datos.centroNombre}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 420px; margin: 0 auto;">
      <h2>Se registró un gimnasio nuevo</h2>
      <p><strong>${datos.centroNombre}</strong> se registró solo en Turnito y ya está activo (aviso informativo).</p>
      ${datos.telefonoWhatsapp ? `<p>WhatsApp de contacto: <strong>${datos.telefonoWhatsapp}</strong></p>` : ""}
      <p><a href="${datos.panelUrl}" style="display: inline-block; padding: 12px 20px; background: #111; color: #fff; text-decoration: none; border-radius: 8px;">Revisar en el panel de Director</a></p>
    </div>
  `;
  return { subject, html };
}
