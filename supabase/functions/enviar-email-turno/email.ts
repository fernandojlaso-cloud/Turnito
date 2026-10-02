export interface DatosTurnoEmail {
  clienteNombre: string;
  centroNombre: string;
  actividadNombre: string;
  diaLargo: string;
  hora: string;
}

export function construirEmail(datos: DatosTurnoEmail): { subject: string; html: string } {
  const subject = `Tu turno de ${datos.actividadNombre} en ${datos.centroNombre}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 420px; margin: 0 auto;">
      <h2>¡Hola ${datos.clienteNombre}!</h2>
      <p>Tu turno de <strong>${datos.actividadNombre}</strong> en ${datos.centroNombre} quedó confirmado:</p>
      <p><strong>${datos.diaLargo}</strong> a las <strong>${datos.hora}</strong></p>
      <p>Mostrá este código QR al llegar:</p>
      <img src="cid:qr-turno" width="200" height="200" alt="QR de presentismo" />
      <p style="font-size: 12px; color: #666;">
        Si no ves la imagen, también te lo mostramos al confirmar la reserva.
      </p>
    </div>
  `;
  return { subject, html };
}
