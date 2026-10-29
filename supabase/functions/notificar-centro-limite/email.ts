export interface DatosCentroLimiteEmail {
  centroNombre: string;
  panelUrl: string;
}

export function construirEmailCentroLimite(datos: DatosCentroLimiteEmail): { subject: string; html: string } {
  const subject = `${datos.centroNombre} llegó al límite de turnos y se bloqueó`;
  const html = `
    <div style="font-family: sans-serif; max-width: 420px; margin: 0 auto;">
      <h2>Un centro llegó al límite de la prueba</h2>
      <p><strong>${datos.centroNombre}</strong> alcanzó las 50 reservas y su panel de administración se bloqueó automáticamente hasta que lo revises.</p>
      <p><a href="${datos.panelUrl}" style="display: inline-block; padding: 12px 20px; background: #111; color: #fff; text-decoration: none; border-radius: 8px;">Revisar en el panel de Director</a></p>
    </div>
  `;
  return { subject, html };
}
