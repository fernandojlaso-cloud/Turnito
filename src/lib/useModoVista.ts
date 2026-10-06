import { useEffect, useState, useSyncExternalStore } from "react";

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

// Estado compartido entre TODOS los componentes que usan este hook (antes
// cada uno tenía su propia copia separada, por eso el selector no cambiaba
// la vista real del panel).
let vistaForzadaActual: VistaForzada = typeof window === "undefined" ? null : leerVistaForzadaGuardada();
const listeners = new Set<() => void>();

function notificar() {
  listeners.forEach((l) => l());
}

function suscribirse(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function obtenerVistaForzada() {
  return vistaForzadaActual;
}

function cambiarVistaForzada(vista: VistaForzada) {
  vistaForzadaActual = vista;
  try {
    if (vista) window.localStorage.setItem(CLAVE_VISTA_FORZADA, vista);
    else window.localStorage.removeItem(CLAVE_VISTA_FORZADA);
  } catch {
    // No se pudo guardar la preferencia: la app sigue funcionando igual,
    // solo que no se va a acordar la próxima vez.
  }
  notificar();
}

export function useModoVista() {
  const vistaForzada = useSyncExternalStore(suscribirse, obtenerVistaForzada, () => null);
  const [anchoVentana, setAnchoVentana] = useState(() => (typeof window === "undefined" ? 1024 : window.innerWidth));

  useEffect(() => {
    function onResize() {
      setAnchoVentana(window.innerWidth);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return {
    modo: calcularModoVista(anchoVentana, vistaForzada),
    vistaForzada,
    setVistaForzada: cambiarVistaForzada
  };
}
