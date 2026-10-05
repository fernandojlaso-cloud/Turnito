import { useEffect, useState } from "react";

export const BREAKPOINT_MOVIL = 768;
const CLAVE_VISTA_FORZADA = "turnito_vista_forzada";

export type ModoVista = "movil" | "escritorio";
export type VistaForzada = ModoVista | null;

function leerVistaForzadaGuardada(): VistaForzada {
  try {
    const valor = window.localStorage.getItem(CLAVE_VISTA_FORZADA);
    if (valor === "movil" || valor === "escritorio") return valor;
    return null;
  } catch {
    // localStorage no disponible (navegador en modo privado muy restrictivo):
    // seguimos en modo automático.
    return null;
  }
}

/** Lógica pura: dado el ancho real de la ventana y una preferencia forzada
 *  (si existe), decide qué modo de vista mostrar. La preferencia forzada
 *  siempre gana. */
export function calcularModoVista(anchoVentana: number, vistaForzada: VistaForzada): ModoVista {
  if (vistaForzada) return vistaForzada;
  return anchoVentana < BREAKPOINT_MOVIL ? "movil" : "escritorio";
}

export function useModoVista() {
  const [anchoVentana, setAnchoVentana] = useState(() => (typeof window === "undefined" ? 1024 : window.innerWidth));
  const [vistaForzada, setVistaForzadaState] = useState<VistaForzada>(() => leerVistaForzadaGuardada());

  useEffect(() => {
    function onResize() {
      setAnchoVentana(window.innerWidth);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function setVistaForzada(vista: VistaForzada) {
    setVistaForzadaState(vista);
    try {
      if (vista) window.localStorage.setItem(CLAVE_VISTA_FORZADA, vista);
      else window.localStorage.removeItem(CLAVE_VISTA_FORZADA);
    } catch {
      // No se pudo guardar la preferencia: la app sigue funcionando igual,
      // solo que no se va a acordar la próxima vez.
    }
  }

  return {
    modo: calcularModoVista(anchoVentana, vistaForzada),
    vistaForzada,
    setVistaForzada
  };
}
