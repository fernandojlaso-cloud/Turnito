import QRCode from "qrcode";

export function generarQrDataUrl(valor: string): Promise<string> {
  return QRCode.toDataURL(valor, { margin: 1, width: 240 });
}
