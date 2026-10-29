export interface DatosCentroAprobadoEmail {
  centroNombre: string;
  panelUrl: string;
}

export function construirEmailCentroAprobado(datos: DatosCentroAprobadoEmail): { subject: string; html: string } {
  const subject = `¡${datos.centroNombre} ya puede seguir usando Turnito!`;
  const html = `
    <div style="font-family: sans-serif; max-width: 420px; margin: 0 auto;">
      <h2>¡Ya podés seguir reservando turnos!</h2>
      <p>Revisamos tu cuenta: <strong>${datos.centroNombre}</strong> superó el límite de turnos de la prueba y ya quedó habilitado para seguir funcionando con normalidad.</p>
      <p>Entrá a tu panel con el mismo email y contraseña de siempre:</p>
      <p><a href="${datos.panelUrl}" style="display: inline-block; padding: 12px 20px; background: #111; color: #fff; text-decoration: none; border-radius: 8px;">Entrar a mi panel</a></p>
    </div>
  `;
  return { subject, html };
}
