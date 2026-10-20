export interface DatosCentroAprobadoEmail {
  centroNombre: string;
  panelUrl: string;
}

export function construirEmailCentroAprobado(datos: DatosCentroAprobadoEmail): { subject: string; html: string } {
  const subject = `¡${datos.centroNombre} ya está activo en Turnito!`;
  const html = `
    <div style="font-family: sans-serif; max-width: 420px; margin: 0 auto;">
      <h2>¡Tu centro ya está aprobado!</h2>
      <p><strong>${datos.centroNombre}</strong> ya está activo en Turnito.</p>
      <p>Entrá a tu panel con el mismo email y contraseña que usaste al registrarte:</p>
      <p><a href="${datos.panelUrl}" style="display: inline-block; padding: 12px 20px; background: #111; color: #fff; text-decoration: none; border-radius: 8px;">Entrar a mi panel</a></p>
    </div>
  `;
  return { subject, html };
}
