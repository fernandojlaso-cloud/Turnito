# Vista móvil del panel de administración — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use the executing-plans skill from this plugin to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que las 6 pantallas del panel de admin (Agenda, Actividades, Profesionales, Clientes, Accesos, Estadísticas) se vean y usen bien desde un celular, con un selector manual arriba a la derecha para forzar vista escritorio/móvil.

**Architecture:** Un hook compartido (`useModoVista`) decide "movil" | "escritorio" combinando el ancho real de pantalla (breakpoint 768px) con una preferencia guardada en `localStorage`. `AdminLayout` usa ese hook para elegir entre el sidebar fijo de siempre o un header+menú-overlay en móvil. Dos piezas de layout reutilizables (`MaestroDetalle` para pantallas de lista+detalle, y tarjetas apiladas por fila para las tablas) se aplican a cada pantalla existente sin tocar su lógica de datos.

**Tech Stack:** React 18 + TypeScript + Vite (frontend existente), Vitest (tests de `useModoVista`).

**Spec:** `docs/specs/2026-10-05-vista-movil-admin-design.md`

## Global Constraints

- No se toca el contenido, los datos ni la lógica de ninguna pantalla — solo cómo se acomoda visualmente según el modo de vista.
- El modo "escritorio" debe verse exactamente igual que hoy, pixel por pixel, en todas las pantallas.
- No se toca la página pública de reservas (`/r/:slug`).
- No se toca `src/pages/admin/Accesos.tsx` (ya es mobile-first).
- Breakpoint: 768px (`BREAKPOINT_MOVIL`, definido en `src/lib/useModoVista.ts`).
- Preferencia forzada: clave `turnito_vista_forzada` en `localStorage`, valores `"movil"` / `"escritorio"` / ausente = automático.

---

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/lib/useModoVista.ts` | Crear | Hook + función pura `calcularModoVista`: decide el modo de vista |
| `src/lib/__tests__/useModoVista.test.ts` | Crear | Tests de `calcularModoVista` |
| `src/components/admin/SelectorVista.tsx` | Crear | Control 🖥️/📱 |
| `src/components/admin/MenuMovil.tsx` | Crear | Overlay de navegación a pantalla completa en móvil |
| `src/components/admin/MaestroDetalle.tsx` | Crear | Layout lista+detalle, responsive |
| `src/pages/admin/AdminLayout.tsx` | Modificar | Sidebar (escritorio) o header+menú (móvil) + `SelectorVista` |
| `src/pages/admin/Profesionales.tsx` | Modificar | Envolver con `MaestroDetalle` |
| `src/pages/admin/Actividades.tsx` | Modificar | Envolver con `MaestroDetalle` |
| `src/pages/admin/Clientes.tsx` | Modificar | Envolver con `MaestroDetalle` + historial en tarjetas + grillas a 1-2 columnas en móvil |
| `src/pages/admin/Agenda.tsx` | Modificar | Filas de turno en tarjetas en móvil |
| `src/pages/admin/Estadisticas.tsx` | Modificar | Las dos tablas en tarjetas + grilla de stats a 2 columnas en móvil |

---

## Tarea 1: Hook `useModoVista`

**Files:**
- Create: `src/lib/useModoVista.ts`
- Create: `src/lib/__tests__/useModoVista.test.ts`

**Interfaces:**
- Produces: `BREAKPOINT_MOVIL: number`, `ModoVista = "movil" | "escritorio"`, `VistaForzada = ModoVista | null`, `calcularModoVista(anchoVentana: number, vistaForzada: VistaForzada): ModoVista`, `useModoVista(): { modo: ModoVista; vistaForzada: VistaForzada; setVistaForzada: (v: VistaForzada) => void }`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/lib/__tests__/useModoVista.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { calcularModoVista, BREAKPOINT_MOVIL } from "../useModoVista";

describe("calcularModoVista", () => {
  it("sin preferencia forzada y pantalla angosta, devuelve movil", () => {
    expect(calcularModoVista(BREAKPOINT_MOVIL - 1, null)).toBe("movil");
  });

  it("sin preferencia forzada y pantalla ancha, devuelve escritorio", () => {
    expect(calcularModoVista(BREAKPOINT_MOVIL, null)).toBe("escritorio");
  });

  it("preferencia forzada a movil gana aunque la pantalla sea ancha", () => {
    expect(calcularModoVista(1920, "movil")).toBe("movil");
  });

  it("preferencia forzada a escritorio gana aunque la pantalla sea angosta", () => {
    expect(calcularModoVista(320, "escritorio")).toBe("escritorio");
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/lib/__tests__/useModoVista.test.ts`
Expected: FAIL — no se puede resolver `../useModoVista`.

- [ ] **Step 3: Implementar `useModoVista.ts`**

Crear `src/lib/useModoVista.ts`:

```ts
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
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run src/lib/__tests__/useModoVista.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/useModoVista.ts src/lib/__tests__/useModoVista.test.ts
git commit -m "feat: agrega useModoVista (decide vista movil/escritorio)"
```

---

## Tarea 2: `SelectorVista`

**Files:**
- Create: `src/components/admin/SelectorVista.tsx`

**Interfaces:**
- Consumes: `useModoVista()` de la Tarea 1.
- Produces: `export default function SelectorVista()` — sin props.

- [ ] **Step 1: Crear el componente**

Crear `src/components/admin/SelectorVista.tsx`:

```tsx
import { tokens } from "@/styles/tokens";
import { useModoVista } from "@/lib/useModoVista";

const { color } = tokens;

export default function SelectorVista() {
  const { modo, setVistaForzada } = useModoVista();

  return (
    <div
      style={{
        display: "flex",
        padding: 3,
        gap: 3,
        borderRadius: 10,
        background: color.bg,
        border: `1px solid ${color.border}`,
        flex: "none"
      }}
    >
      <button
        onClick={() => setVistaForzada("escritorio")}
        aria-pressed={modo === "escritorio"}
        aria-label="Ver como escritorio"
        title="Ver como escritorio"
        style={{
          width: 36,
          height: 32,
          borderRadius: 8,
          border: 0,
          fontSize: 16,
          background: modo === "escritorio" ? color.surface : "transparent"
        }}
      >
        🖥️
      </button>
      <button
        onClick={() => setVistaForzada("movil")}
        aria-pressed={modo === "movil"}
        aria-label="Ver como móvil"
        title="Ver como móvil"
        style={{
          width: 36,
          height: 32,
          borderRadius: 8,
          border: 0,
          fontSize: 16,
          background: modo === "movil" ? color.surface : "transparent"
        }}
      >
        📱
      </button>
    </div>
  );
}
```

No lleva test automático — es un control puramente visual que usa un hook ya testeado. Se verifica a mano en la Tarea 3, una vez que está montado dentro de `AdminLayout`.

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/SelectorVista.tsx
git commit -m "feat: agrega SelectorVista (control escritorio/movil)"
```

---

## Tarea 3: `MenuMovil` + `AdminLayout` responsive

**Files:**
- Create: `src/components/admin/MenuMovil.tsx`
- Modify: `src/pages/admin/AdminLayout.tsx` (reemplazo completo)

**Interfaces:**
- Consumes: `useModoVista()` (Tarea 1), `SelectorVista` (Tarea 2).
- Produces: `MenuMovil({ centro, links, onCerrar })`, usado solo por `AdminLayout`.

- [ ] **Step 1: Crear `MenuMovil.tsx`**

Crear `src/components/admin/MenuMovil.tsx`:

```tsx
import { NavLink } from "react-router-dom";
import { tokens } from "@/styles/tokens";
import type { Centro } from "@/lib/database.types";
import { cerrarSesion } from "@/components/Bloqueo";

const { color, font } = tokens;

interface LinkNav {
  to: string;
  label: string;
  end?: boolean;
}

export default function MenuMovil({
  centro,
  links,
  onCerrar
}: {
  centro: Centro;
  links: LinkNav[];
  onCerrar: () => void;
}) {
  return (
    <div
      onClick={onCerrar}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: color.ink,
        color: "#FFFFFF",
        boxSizing: "border-box",
        padding: "20px 20px calc(20px + env(safe-area-inset-bottom, 0px))",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto"
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: centro.color_acento }} />
            <span style={{ fontFamily: font.display, fontWeight: 700, fontSize: 22 }}>turnito</span>
          </div>
          <button
            onClick={onCerrar}
            aria-label="Cerrar menú"
            style={{ width: 40, height: 40, borderRadius: 12, border: "1px solid #3A3D42", background: "transparent", color: "#FFFFFF", fontSize: 18 }}
          >
            ✕
          </button>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              onClick={onCerrar}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                height: 52,
                padding: "0 14px",
                borderRadius: 12,
                background: isActive ? centro.color_acento : "transparent",
                color: isActive ? color.ink : "#E4E5E7",
                fontWeight: isActive ? 700 : 600,
                fontSize: 16
              })}
            >
              {l.label}
            </NavLink>
          ))}
          <a
            href={`/r/${centro.slug}`}
            target="_blank"
            rel="noreferrer"
            onClick={onCerrar}
            style={{ display: "flex", alignItems: "center", height: 52, padding: "0 14px", borderRadius: 12, color: "#E4E5E7", fontWeight: 600, fontSize: 16 }}
          >
            Página de reservas
          </a>
        </nav>

        <button
          onClick={() => cerrarSesion()}
          style={{ height: 48, borderRadius: 12, border: "1px solid #3A3D42", background: "transparent", color: "#E4E5E7", fontWeight: 600, fontSize: 15 }}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Reemplazar `AdminLayout.tsx` entero**

Contenido actual de referencia (155 líneas: sidebar fijo con `links`, logo, nombre del centro, botón cerrar sesión). Reemplazar el archivo completo por:

```tsx
import { useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { tokens } from "@/styles/tokens";
import type { Centro } from "@/lib/database.types";
import { cerrarSesion } from "@/components/Bloqueo";
import { useModoVista } from "@/lib/useModoVista";
import SelectorVista from "@/components/admin/SelectorVista";
import MenuMovil from "@/components/admin/MenuMovil";

const { color, font } = tokens;

const links = [
  { to: "/admin", label: "Agenda", end: true },
  { to: "/admin/actividades", label: "Actividades" },
  { to: "/admin/profesionales", label: "Profesionales" },
  { to: "/admin/clientes", label: "Clientes" },
  { to: "/admin/accesos", label: "Accesos" },
  { to: "/admin/estadisticas", label: "Estadísticas" }
];

export default function AdminLayout({ centro, children }: { centro: Centro; children: ReactNode }) {
  const { modo } = useModoVista();
  const [menuAbierto, setMenuAbierto] = useState(false);

  if (modo === "movil") {
    return (
      <div style={{ minHeight: "100vh", background: color.bg }}>
        <header
          style={{
            height: 56,
            boxSizing: "border-box",
            padding: "0 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: color.ink,
            color: "#FFFFFF"
          }}
        >
          <button
            onClick={() => setMenuAbierto(true)}
            aria-label="Abrir menú"
            style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid #3A3D42", background: "transparent", color: "#FFFFFF", fontSize: 18 }}
          >
            ☰
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: centro.color_acento }} />
            <span style={{ fontFamily: font.display, fontWeight: 700, fontSize: 18 }}>turnito</span>
          </div>
          <SelectorVista />
        </header>

        {menuAbierto && <MenuMovil centro={centro} links={links} onCerrar={() => setMenuAbierto(false)} />}

        <main style={{ boxSizing: "border-box", padding: 16 }}>{children}</main>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: color.bg }}>
      <aside
        style={{
          width: 248,
          flex: "none",
          boxSizing: "border-box",
          background: color.ink,
          color: "#FFFFFF",
          padding: "32px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 32
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px" }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: centro.color_acento }} />
          <span style={{ fontFamily: font.display, fontWeight: 700, fontSize: 22 }}>turnito</span>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                height: 48,
                padding: "0 14px",
                borderRadius: 12,
                background: isActive ? centro.color_acento : "transparent",
                color: isActive ? color.ink : "#E4E5E7",
                fontWeight: isActive ? 700 : 600,
                fontSize: 15
              })}
            >
              {l.label}
            </NavLink>
          ))}
          <a
            href={`/r/${centro.slug}`}
            target="_blank"
            rel="noreferrer"
            style={{ display: "flex", alignItems: "center", height: 48, padding: "0 14px", borderRadius: 12, color: "#E4E5E7", fontWeight: 600, fontSize: 15 }}
          >
            Página de reservas
          </a>
        </nav>
        <div style={{ marginTop: "auto", padding: "0 8px", display: "flex", alignItems: "center", gap: 10 }}>
          {centro.logo_url ? (
            <img src={centro.logo_url} alt="" style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover", flex: "none" }} />
          ) : (
            <div style={{ width: 36, height: 36, flex: "none", borderRadius: 10, background: "#26272B" }} />
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{centro.nombre}</div>
            <div style={{ fontSize: 13, color: "#9AA0A6" }}>Panel del centro</div>
          </div>
        </div>
        <div>
          <button
            onClick={() => cerrarSesion()}
            style={{ marginTop: 16, width: "100%", height: 44, borderRadius: 12, border: "1px solid #3A3D42", background: "transparent", color: "#E4E5E7", fontWeight: 600, fontSize: 14 }}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, minWidth: 0, boxSizing: "border-box", padding: 40 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <SelectorVista />
        </div>
        {children}
      </main>
    </div>
  );
}
```

Nota: el único cambio dentro del `<aside>` de escritorio respecto al original es que ahora incluye el link "Accesos" (ya estaba así desde el proyecto de Accesos) — todo lo demás del sidebar queda exactamente igual. Lo nuevo es el bloque `if (modo === "movil")` completo, y el `<div>` con `<SelectorVista />` arriba del `{children}` en el `<main>` de escritorio.

- [ ] **Step 3: Verificar que compila**

Run: `npx tsc -b --noEmit`
Expected: sin errores.

- [ ] **Step 4: Verificación visual manual**

1. `npm run dev`, abrir el panel de admin en el navegador de la compu. Confirmar que se ve exactamente igual que antes (sidebar a la izquierda, ahora con un selector 🖥️/📱 chiquito arriba a la derecha del contenido).
2. Tocar el ícono 📱 del selector. Confirmar que cambia a la vista con header arriba y botón ☰, sin sidebar.
3. Tocar ☰. Confirmar que se abre el menú a pantalla completa con todas las secciones. Tocar una sección y confirmar que navega y cierra el menú. Volver a abrirlo y tocar afuera del panel (en el fondo oscuro) para confirmar que también cierra.
4. Tocar 🖥️ para volver a escritorio. Recargar la página (F5) y confirmar que se acuerda del modo escritorio.
5. Abrir el sitio real desde el celular y confirmar que por defecto (sin haber tocado el selector ahí) se ve en modo móvil.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/MenuMovil.tsx src/pages/admin/AdminLayout.tsx
git commit -m "feat: panel de admin responsive (menu movil + selector de vista)"
```

---

## Tarea 4: `MaestroDetalle` + aplicarlo a Profesionales

**Files:**
- Create: `src/components/admin/MaestroDetalle.tsx`
- Modify: `src/pages/admin/Profesionales.tsx`

**Interfaces:**
- Consumes: `useModoVista()` (Tarea 1).
- Produces: `MaestroDetalle({ lista, detalle, hayDetalle, onVolver })`. `hayDetalle: boolean` indica si hay algo elegido (determina si en móvil se ve la lista o el detalle). `onVolver` limpia la selección.

- [ ] **Step 1: Crear `MaestroDetalle.tsx`**

Crear `src/components/admin/MaestroDetalle.tsx`:

```tsx
import type { ReactNode } from "react";
import { tokens } from "@/styles/tokens";
import { useModoVista } from "@/lib/useModoVista";

const { color } = tokens;

export default function MaestroDetalle({
  lista,
  detalle,
  hayDetalle,
  onVolver
}: {
  lista: ReactNode;
  /** El detalle (formulario de alta, ficha del elemento elegido, o el
   *  mensaje de "elegí uno de la lista") — el mismo contenido para
   *  escritorio y móvil. */
  detalle: ReactNode;
  /** true si hay un elemento elegido o se está creando uno nuevo. En
   *  móvil decide si se muestra la lista o el detalle a pantalla completa. */
  hayDetalle: boolean;
  onVolver: () => void;
}) {
  const { modo } = useModoVista();

  if (modo === "movil") {
    if (hayDetalle) {
      return (
        <div>
          <button
            onClick={onVolver}
            style={{
              height: 40,
              padding: "0 14px",
              marginBottom: 16,
              borderRadius: 10,
              border: `1px solid ${color.borderStrong}`,
              background: color.surface,
              fontWeight: 700,
              fontSize: 14
            }}
          >
            ← Volver
          </button>
          {detalle}
        </div>
      );
    }
    return <div>{lista}</div>;
  }

  return (
    <div style={{ display: "flex", gap: 24, marginTop: 24, alignItems: "flex-start" }}>
      {lista}
      {detalle}
    </div>
  );
}
```

- [ ] **Step 2: Aplicar a `Profesionales.tsx`**

En `src/pages/admin/Profesionales.tsx`, agregar el import:

```tsx
import MaestroDetalle from "@/components/admin/MaestroDetalle";
```

Reemplazar este bloque (el `<div style={{ display: "flex", gap: 24, marginTop: 24, alignItems: "flex-start" }}>` con la lista + detalle + formulario + estado vacío):

```tsx
      <div style={{ display: "flex", gap: 24, marginTop: 24, alignItems: "flex-start" }}>
        <section style={{ width: 340, flex: "none", background: color.surface, border: `1px solid ${color.border}`, borderRadius: 20, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {!cargando && !profesionales.length && (
            <p style={{ color: color.textMuted, fontSize: 14, padding: 8 }}>
              Usá "+ Nuevo profesional" para cargar el primero.
            </p>
          )}
          {profesionales.map((p) => {
            const selected = p.id === selId;
            return (
              <button
                key={p.id}
                onClick={() => {
                  setSelId(p.id);
                  setCreando(false);
                }}
                aria-pressed={selected}
                style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", height: 68, boxSizing: "border-box", padding: "0 14px", borderRadius: 14, textAlign: "left", background: selected ? centro.color_acento : color.surface, border: `1px solid ${selected ? color.ink : color.border}`, opacity: p.activo ? 1 : 0.55 }}
              >
                <span style={{ width: 40, height: 40, flex: "none", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.mono, fontSize: 13, fontWeight: 600, background: selected ? color.ink : color.bg, color: selected ? centro.color_acento : color.ink }}>
                  {p.iniciales}
                </span>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{p.nombre}{!p.activo && " (baja)"}</span>
              </button>
            );
          })}
        </section>

        {creando && <NuevoProfesionalForm onCancelar={() => setCreando(false)} onCrear={crear} accent={centro.color_acento} />}

        {!creando && actual && (
          <section style={{ flex: 1, minWidth: 0, maxWidth: 560, background: color.surface, border: `1px solid ${color.border}`, borderRadius: 20, padding: 32, display: "flex", flexDirection: "column", gap: 24 }}>
            <DetalleProfesional profesional={actual} accent={centro.color_acento} onActualizar={actualizar} />

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontFamily: font.mono, fontSize: 12, letterSpacing: "0.1em", color: color.textMuted }}>ACTIVIDADES A CARGO</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {actividades.map((a) => {
                  const asignado = vinculos.some((v) => v.profesional_id === selId && v.actividad_id === a.id);
                  return (
                    <button
                      key={a.id}
                      onClick={() => toggleActividad(a.id)}
                      aria-pressed={asignado}
                      style={{ height: 40, padding: "0 16px", borderRadius: 999, border: `1px solid ${asignado ? color.ink : color.borderStrong}`, background: asignado ? centro.color_acento : color.surface, fontWeight: 700, fontSize: 14 }}
                    >
                      {a.nombre}
                    </button>
                  );
                })}
                {!actividades.length && <p style={{ color: color.textMuted, fontSize: 14 }}>Todavía no hay actividades cargadas.</p>}
              </div>
              {!!actividadesDeCentro.length && (
                <p style={{ fontSize: 13, color: color.textMuted, margin: 0 }}>
                  Va a aparecer como responsable en: {actividadesDeCentro.map((a) => a.nombre).join(", ")}.
                </p>
              )}
            </div>
          </section>
        )}

        {!creando && !actual && (
          <section style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", color: color.textMuted, fontSize: 15 }}>
            Elegí un profesional de la lista, o creá el primero.
          </section>
        )}
      </div>
```

Por este otro, con exactamente el mismo contenido pero envuelto en `MaestroDetalle`:

```tsx
      <MaestroDetalle
        hayDetalle={creando || !!actual}
        onVolver={() => {
          setCreando(false);
          setSelId(null);
        }}
        lista={
          <section style={{ width: 340, flex: "none", background: color.surface, border: `1px solid ${color.border}`, borderRadius: 20, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {!cargando && !profesionales.length && (
              <p style={{ color: color.textMuted, fontSize: 14, padding: 8 }}>
                Usá "+ Nuevo profesional" para cargar el primero.
              </p>
            )}
            {profesionales.map((p) => {
              const selected = p.id === selId;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelId(p.id);
                    setCreando(false);
                  }}
                  aria-pressed={selected}
                  style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", height: 68, boxSizing: "border-box", padding: "0 14px", borderRadius: 14, textAlign: "left", background: selected ? centro.color_acento : color.surface, border: `1px solid ${selected ? color.ink : color.border}`, opacity: p.activo ? 1 : 0.55 }}
                >
                  <span style={{ width: 40, height: 40, flex: "none", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.mono, fontSize: 13, fontWeight: 600, background: selected ? color.ink : color.bg, color: selected ? centro.color_acento : color.ink }}>
                    {p.iniciales}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{p.nombre}{!p.activo && " (baja)"}</span>
                </button>
              );
            })}
          </section>
        }
        detalle={
          creando ? (
            <NuevoProfesionalForm onCancelar={() => setCreando(false)} onCrear={crear} accent={centro.color_acento} />
          ) : actual ? (
            <section style={{ flex: 1, minWidth: 0, maxWidth: 560, background: color.surface, border: `1px solid ${color.border}`, borderRadius: 20, padding: 32, display: "flex", flexDirection: "column", gap: 24 }}>
              <DetalleProfesional profesional={actual} accent={centro.color_acento} onActualizar={actualizar} />

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontFamily: font.mono, fontSize: 12, letterSpacing: "0.1em", color: color.textMuted }}>ACTIVIDADES A CARGO</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {actividades.map((a) => {
                    const asignado = vinculos.some((v) => v.profesional_id === selId && v.actividad_id === a.id);
                    return (
                      <button
                        key={a.id}
                        onClick={() => toggleActividad(a.id)}
                        aria-pressed={asignado}
                        style={{ height: 40, padding: "0 16px", borderRadius: 999, border: `1px solid ${asignado ? color.ink : color.borderStrong}`, background: asignado ? centro.color_acento : color.surface, fontWeight: 700, fontSize: 14 }}
                      >
                        {a.nombre}
                      </button>
                    );
                  })}
                  {!actividades.length && <p style={{ color: color.textMuted, fontSize: 14 }}>Todavía no hay actividades cargadas.</p>}
                </div>
                {!!actividadesDeCentro.length && (
                  <p style={{ fontSize: 13, color: color.textMuted, margin: 0 }}>
                    Va a aparecer como responsable en: {actividadesDeCentro.map((a) => a.nombre).join(", ")}.
                  </p>
                )}
              </div>
            </section>
          ) : (
            <section style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", color: color.textMuted, fontSize: 15 }}>
              Elegí un profesional de la lista, o creá el primero.
            </section>
          )
        }
      />
```

- [ ] **Step 3: Verificar que compila**

Run: `npx tsc -b --noEmit`
Expected: sin errores.

- [ ] **Step 4: Verificación visual manual**

1. Escritorio: confirmar que Profesionales se ve exactamente igual que antes.
2. Con el selector en 📱: confirmar que se ve solo la lista. Tocar un profesional → se ve solo su detalle a pantalla completa, con "← Volver" arriba. Tocar "← Volver" → vuelve a la lista. Tocar "+ Nuevo profesional" → se ve el formulario con "← Volver" también.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/MaestroDetalle.tsx src/pages/admin/Profesionales.tsx
git commit -m "feat: agrega MaestroDetalle y lo aplica a Profesionales"
```

---

## Tarea 5: Aplicar `MaestroDetalle` a Actividades

**Files:**
- Modify: `src/pages/admin/Actividades.tsx`

**Interfaces:**
- Consumes: `MaestroDetalle` (Tarea 4).

- [ ] **Step 1: Agregar el import**

```tsx
import MaestroDetalle from "@/components/admin/MaestroDetalle";
```

- [ ] **Step 2: Envolver la lista y el detalle con `MaestroDetalle`**

Reemplazar el bloque `<div style={{ display: "flex", gap: 24, marginTop: 24, alignItems: "flex-start" }}>` (lista de actividades a la izquierda + formulario nuevo / detalle de la actividad elegida / estado vacío a la derecha) por la misma estructura envuelta en:

```tsx
      <MaestroDetalle
        hayDetalle={creando || !!actual}
        onVolver={() => {
          setCreando(!!actividades.length);
          setSelId(null);
        }}
        lista={
          <section style={{ width: 380, flex: "none", background: color.surface, border: `1px solid ${color.border}`, borderRadius: 20, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {/* ... mismo contenido que hoy (el !actividades.length y el .map de actividades) ... */}
          </section>
        }
        detalle={
          creando ? (
            <NuevaActividadForm onCancelar={() => setCreando(!!actividades.length)} onCrear={crearActividad} accent={centro.color_acento} />
          ) : actual ? (
            <section style={{ flex: 1, minWidth: 0, background: color.surface, border: `1px solid ${color.border}`, borderRadius: 20, padding: 32, display: "flex", flexDirection: "column", gap: 28, opacity: actual.activa ? 1 : 0.5 }}>
              {/* ... mismo contenido que hoy (encabezado + FotoYDireccion + los Row de tipo/duración/cupo/cancelación/días) ... */}
            </section>
          ) : (
            <section style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", color: color.textMuted, fontSize: 15 }}>
              Elegí una actividad de la lista, o creá la primera.
            </section>
          )
        }
      />
```

Nota importante para quien ejecute este paso: el contenido interno de `lista` y de cada rama de `detalle` es **exactamente** el JSX que ya existe hoy en el archivo entre ese `<div>` y su `</div>` de cierre (líneas 108-277 en la versión actual) — no hay que inventar ni resumir nada, se corta y pega tal cual cada sección dentro de la llave que le corresponde. Antes de aplicar este paso, releer el archivo real (`src/pages/admin/Actividades.tsx`) para confirmar que las líneas no se movieron desde que se escribió este plan.

- [ ] **Step 3: Verificar que compila**

Run: `npx tsc -b --noEmit`
Expected: sin errores.

- [ ] **Step 4: Verificación visual manual**

Igual que en la Tarea 4 pero sobre Actividades: escritorio sin cambios; en móvil, lista → detalle a pantalla completa con "← Volver" → vuelve a la lista; "+ Nueva actividad" también funciona igual.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/Actividades.tsx
git commit -m "feat: aplica MaestroDetalle a Actividades"
```

---

## Tarea 6: Aplicar `MaestroDetalle` a Clientes + historial en tarjetas

**Files:**
- Modify: `src/pages/admin/Clientes.tsx`

**Interfaces:**
- Consumes: `MaestroDetalle` (Tarea 4), `useModoVista` (Tarea 1).

Clientes tiene, además del mismo patrón lista+detalle que Actividades/Profesionales, dos grillas de ancho fijo adentro del detalle: la tabla de "historial de servicios" y la grilla de 4 columnas de estadísticas. Esta tarea cubre las tres cosas.

- [ ] **Step 1: Agregar los imports**

```tsx
import MaestroDetalle from "@/components/admin/MaestroDetalle";
import { useModoVista } from "@/lib/useModoVista";
```

Y dentro de `export default function Clientes({ centro }: { centro: Centro }) {`, agregar junto a los demás `useState`:

```tsx
  const { modo } = useModoVista();
```

- [ ] **Step 2: Envolver lista + detalle con `MaestroDetalle`**

Igual que en la Tarea 5: el `<div style={{ display: "flex", gap: 24, marginTop: 24, minHeight: 0 }}>` que hoy contiene la sección de búsqueda/lista (ancho 360) + `NuevoClienteForm` / `DetalleCliente` / estado vacío, se reemplaza por:

```tsx
      <MaestroDetalle
        hayDetalle={creando || !!actual}
        onVolver={() => {
          setCreando(false);
          setSelId(null);
        }}
        lista={
          <section style={{ width: 360, flex: "none", background: color.surface, border: `1px solid ${color.border}`, borderRadius: 20, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {/* ... mismo contenido que hoy: input de búsqueda, checkbox "mostrar dados de baja", y el .map de filtrados ... */}
          </section>
        }
        detalle={
          creando ? (
            <NuevoClienteForm onCancelar={() => setCreando(false)} onCrear={crearCliente} accent={centro.color_acento} />
          ) : actual ? (
            <section style={{ flex: 1, minWidth: 0, background: color.surface, border: `1px solid ${color.border}`, borderRadius: 20, padding: 32, display: "flex", flexDirection: "column", gap: 28 }}>
              {/* ... DetalleCliente + grilla de Stat + historial (ver Step 3) ... */}
            </section>
          ) : (
            <section style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", color: color.textMuted, fontSize: 15 }}>
              Elegí un cliente de la lista, o creá uno nuevo.
            </section>
          )
        }
      />
```

Mismo criterio que en la Tarea 5: el contenido de cada sección es el JSX que ya existe hoy (líneas 104-209), cortado y pegado tal cual dentro de la llave correspondiente — releer el archivo real antes de aplicar este paso.

- [ ] **Step 3: Grilla de estadísticas a 2 columnas en móvil**

Dentro de la sección del detalle del cliente, cambiar:

```tsx
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12 }}>
```

por:

```tsx
            <div style={{ display: "grid", gridTemplateColumns: modo === "movil" ? "repeat(2, minmax(0,1fr))" : "repeat(4, minmax(0,1fr))", gap: 12 }}>
```

- [ ] **Step 4: Historial de servicios en tarjetas en móvil**

Reemplazar el bloque del historial:

```tsx
            <div>
              <div style={{ fontFamily: font.mono, fontSize: 12, letterSpacing: "0.1em", color: color.textMuted, paddingBottom: 12 }}>HISTORIAL DE SERVICIOS UTILIZADOS</div>
              <div style={{ height: 40, display: "grid", gridTemplateColumns: "90px minmax(0,1fr) minmax(0,1fr) 130px", gap: 16, alignItems: "center", borderBottom: `1px solid ${color.border}`, fontFamily: font.mono, fontSize: 12, letterSpacing: "0.08em", color: color.textMuted }}>
                <span>FECHA</span>
                <span>ACTIVIDAD</span>
                <span>RESPONSABLE</span>
                <span>ESTADO</span>
              </div>
              {historial.map((t) => {
                const act = actsById.get(t.actividad_id);
                const pro = t.profesional_id ? prosById.get(t.profesional_id) : null;
                let bg = color.bg;
                let fg = color.ink;
                if (t.estado === "confirmado" || t.estado === "pendiente") bg = centro.color_acento;
                if (t.estado === "no_asistio") {
                  bg = color.ink;
                  fg = "#FFFFFF";
                }
                return (
                  <div key={t.id} style={{ height: 56, display: "grid", gridTemplateColumns: "90px minmax(0,1fr) minmax(0,1fr) 130px", gap: 16, alignItems: "center", borderBottom: `1px solid ${color.border}` }}>
                    <span style={{ fontFamily: font.mono, fontSize: 14, fontWeight: 600 }}>
                      {new Date(t.inicio).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{act?.nombre ?? "—"}</span>
                    <span style={{ fontSize: 15 }}>{pro?.nombre ?? "—"}</span>
                    <span>
                      <span style={{ display: "inline-flex", alignItems: "center", height: 28, padding: "0 12px", borderRadius: 999, fontSize: 13, fontWeight: 700, background: bg, color: fg }}>
                        {t.estado === "asistio" ? "Asistió" : t.estado === "no_asistio" ? "No asistió" : t.estado === "cancelado" ? "Cancelado" : formatearHora(new Date(t.inicio))}
                      </span>
                    </span>
                  </div>
                );
              })}
              {!historial.length && <p style={{ color: color.textMuted, fontSize: 14, padding: "16px 0" }}>Todavía no tiene turnos.</p>}
            </div>
```

por:

```tsx
            <div>
              <div style={{ fontFamily: font.mono, fontSize: 12, letterSpacing: "0.1em", color: color.textMuted, paddingBottom: 12 }}>HISTORIAL DE SERVICIOS UTILIZADOS</div>
              {modo === "escritorio" && (
                <div style={{ height: 40, display: "grid", gridTemplateColumns: "90px minmax(0,1fr) minmax(0,1fr) 130px", gap: 16, alignItems: "center", borderBottom: `1px solid ${color.border}`, fontFamily: font.mono, fontSize: 12, letterSpacing: "0.08em", color: color.textMuted }}>
                  <span>FECHA</span>
                  <span>ACTIVIDAD</span>
                  <span>RESPONSABLE</span>
                  <span>ESTADO</span>
                </div>
              )}
              {historial.map((t) => {
                const act = actsById.get(t.actividad_id);
                const pro = t.profesional_id ? prosById.get(t.profesional_id) : null;
                let bg = color.bg;
                let fg = color.ink;
                if (t.estado === "confirmado" || t.estado === "pendiente") bg = centro.color_acento;
                if (t.estado === "no_asistio") {
                  bg = color.ink;
                  fg = "#FFFFFF";
                }
                const chipEstado = (
                  <span style={{ display: "inline-flex", alignItems: "center", height: 28, padding: "0 12px", borderRadius: 999, fontSize: 13, fontWeight: 700, background: bg, color: fg }}>
                    {t.estado === "asistio" ? "Asistió" : t.estado === "no_asistio" ? "No asistió" : t.estado === "cancelado" ? "Cancelado" : formatearHora(new Date(t.inicio))}
                  </span>
                );

                if (modo === "movil") {
                  return (
                    <div key={t.id} style={{ padding: "12px 0", display: "flex", flexDirection: "column", gap: 6, borderBottom: `1px solid ${color.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 15, fontWeight: 700 }}>{act?.nombre ?? "—"}</span>
                        {chipEstado}
                      </div>
                      <div style={{ fontSize: 13, color: color.textMuted }}>
                        {new Date(t.inicio).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
                        {pro ? ` · ${pro.nombre}` : ""}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={t.id} style={{ height: 56, display: "grid", gridTemplateColumns: "90px minmax(0,1fr) minmax(0,1fr) 130px", gap: 16, alignItems: "center", borderBottom: `1px solid ${color.border}` }}>
                    <span style={{ fontFamily: font.mono, fontSize: 14, fontWeight: 600 }}>
                      {new Date(t.inicio).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{act?.nombre ?? "—"}</span>
                    <span style={{ fontSize: 15 }}>{pro?.nombre ?? "—"}</span>
                    <span>{chipEstado}</span>
                  </div>
                );
              })}
              {!historial.length && <p style={{ color: color.textMuted, fontSize: 14, padding: "16px 0" }}>Todavía no tiene turnos.</p>}
            </div>
```

- [ ] **Step 5: Ficha médica a 1 columna en móvil**

Hay dos grillas `gridTemplateColumns: "repeat(2, minmax(0,1fr))"` dentro de `DetalleCliente` (una para el modo edición, en `editandoFicha ? (...)`, y otra para el modo lectura). `DetalleCliente` es una función separada que no tiene acceso a `modo` todavía — agregarle el hook también ahí:

En la firma de `DetalleCliente`, agregar la línea al principio del cuerpo de la función (junto a los demás `useState`):

```tsx
  const { modo } = useModoVista();
```

Y cambiar las dos apariciones de:

```tsx
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 16 }}>
```

y

```tsx
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 }}>
```

por (respetando el `gap` de cada una):

```tsx
            <div style={{ display: "grid", gridTemplateColumns: modo === "movil" ? "1fr" : "repeat(2, minmax(0,1fr))", gap: 16 }}>
```

```tsx
          <div style={{ display: "grid", gridTemplateColumns: modo === "movil" ? "1fr" : "repeat(2, minmax(0,1fr))", gap: 12 }}>
```

- [ ] **Step 6: Verificar que compila**

Run: `npx tsc -b --noEmit`
Expected: sin errores.

- [ ] **Step 7: Verificación visual manual**

1. Escritorio: Clientes se ve exactamente igual que antes (lista + detalle lado a lado, historial en tabla, ficha médica en 2 columnas).
2. Móvil: lista sola → tocar un cliente → detalle a pantalla completa con "← Volver"; el historial se ve en tarjetas (sin encabezado de columnas); la ficha médica se ve en 1 columna, tanto mirando como editando.

- [ ] **Step 8: Commit**

```bash
git add src/pages/admin/Clientes.tsx
git commit -m "feat: aplica MaestroDetalle y vista movil a Clientes"
```

---

## Tarea 7: Agenda — filas de turno en tarjetas en móvil

**Files:**
- Modify: `src/pages/admin/Agenda.tsx`

**Interfaces:**
- Consumes: `useModoVista` (Tarea 1).

- [ ] **Step 1: Agregar el import y el hook**

```tsx
import { useModoVista } from "@/lib/useModoVista";
```

Dentro de `export default function Agenda({ centro }: { centro: Centro }) {`, junto a los `useState`:

```tsx
  const { modo } = useModoVista();
```

- [ ] **Step 2: Ocultar el encabezado de columnas en móvil**

Cambiar:

```tsx
      <section style={{ background: color.surface, border: `1px solid ${color.border}`, borderRadius: 20, overflow: "hidden" }}>
        <div
          style={{
            height: 48,
            boxSizing: "border-box",
            padding: "0 24px",
            display: "grid",
            gridTemplateColumns: "80px 170px minmax(0,1fr) minmax(0,1fr) 130px 90px",
            gap: 16,
            alignItems: "center",
            borderBottom: `1px solid ${color.border}`,
            fontFamily: font.mono,
            fontSize: 12,
            letterSpacing: "0.08em",
            color: color.textMuted
          }}
        >
          <span>HORA</span>
          <span>ACTIVIDAD</span>
          <span>CLIENTE</span>
          <span>RESPONSABLE</span>
          <span>ESTADO</span>
          <span>AVISO</span>
        </div>
        {visibles.map((f) => (
          <FilaTurno key={f.turno.id} fila={f} accent={centro.color_acento} onEstado={cambiarEstado} />
        ))}
```

por:

```tsx
      <section style={{ background: color.surface, border: `1px solid ${color.border}`, borderRadius: 20, overflow: "hidden" }}>
        {modo === "escritorio" && (
          <div
            style={{
              height: 48,
              boxSizing: "border-box",
              padding: "0 24px",
              display: "grid",
              gridTemplateColumns: "80px 170px minmax(0,1fr) minmax(0,1fr) 130px 90px",
              gap: 16,
              alignItems: "center",
              borderBottom: `1px solid ${color.border}`,
              fontFamily: font.mono,
              fontSize: 12,
              letterSpacing: "0.08em",
              color: color.textMuted
            }}
          >
            <span>HORA</span>
            <span>ACTIVIDAD</span>
            <span>CLIENTE</span>
            <span>RESPONSABLE</span>
            <span>ESTADO</span>
            <span>AVISO</span>
          </div>
        )}
        {visibles.map((f) => (
          <FilaTurno key={f.turno.id} fila={f} accent={centro.color_acento} onEstado={cambiarEstado} />
        ))}
```

- [ ] **Step 3: Encabezado de la página — permitir que se apile en pantallas angostas**

Cambiar:

```tsx
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: 72 }}>
```

por:

```tsx
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end", justifyContent: "space-between", minHeight: 72 }}>
```

(cambia `height: 72` fijo por `minHeight: 72` para que, si el título y el botón quedan en dos líneas en una pantalla muy angosta, el bloque pueda crecer en vez de recortarse.)

- [ ] **Step 4: `FilaTurno` — tarjeta apilada en móvil**

Agregar el import en `FilaTurno` (ya está en el mismo archivo, solo hay que usar el hook adentro de la función). Cambiar la firma de `FilaTurno` para incluir el hook, y agregar la rama móvil antes del `return` del grid de escritorio:

```tsx
function FilaTurno({
  fila,
  accent,
  onEstado
}: {
  fila: FilaAgenda;
  accent: string;
  onEstado: (id: string, estado: EstadoTurno) => void;
}) {
  const { modo } = useModoVista();
  const { turno, actividad, cliente, profesional } = fila;
  const grupal = actividad.tipo === "grupal";
  let bg = color.bg;
  let fg = color.ink;
  if (turno.estado === "pendiente") bg = accent;
  if (turno.estado === "no_asistio") {
    bg = color.ink;
    fg = "#FFFFFF";
  }

  const selectEstado = (
    <select
      value={turno.estado}
      onChange={(e) => onEstado(turno.id, e.target.value as EstadoTurno)}
      style={{
        height: 28,
        borderRadius: 999,
        padding: "0 10px",
        fontSize: 13,
        fontWeight: 700,
        background: bg,
        color: fg,
        border: "none"
      }}
    >
      {Object.entries(estadoLabel).map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );

  const botonWhatsapp = (
    <a
      href={linkWhatsapp(cliente.telefono, `Hola ${cliente.nombre.split(" ")[0]}, te escribimos por tu turno de ${actividad.nombre} de hoy a las ${formatearHora(new Date(turno.inicio))}.`)}
      target="_blank"
      rel="noreferrer"
      aria-label={`Enviar recordatorio por WhatsApp a ${cliente.nombre}`}
      style={{
        width: 40,
        height: 40,
        flex: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        border: `1px solid ${color.borderStrong}`,
        background: color.surface
      }}
    >
      WA
    </a>
  );

  if (modo === "movil") {
    return (
      <div style={{ padding: "14px 20px", display: "flex", flexDirection: "column", gap: 8, borderBottom: `1px solid ${color.border}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: font.mono, fontSize: 16, fontWeight: 700 }}>{formatearHora(new Date(turno.inicio))}</span>
          {selectEstado}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{cliente.nombre}</div>
            <div style={{ fontSize: 13, color: color.textMuted }}>
              {actividad.nombre} · {grupal ? "Grupal" : "Individual"}
              {profesional ? ` · ${profesional.nombre}` : ""}
            </div>
          </div>
          {botonWhatsapp}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        height: 64,
        boxSizing: "border-box",
        padding: "0 24px",
        display: "grid",
        gridTemplateColumns: "80px 170px minmax(0,1fr) minmax(0,1fr) 130px 90px",
        gap: 16,
        alignItems: "center",
        borderBottom: `1px solid ${color.border}`
      }}
    >
      <span style={{ fontFamily: font.mono, fontSize: 15, fontWeight: 600 }}>{formatearHora(new Date(turno.inicio))}</span>
      <span>
        <span style={{ display: "inline-flex", alignItems: "center", height: 30, padding: "0 12px", borderRadius: 999, background: color.bg, fontSize: 13, fontWeight: 700 }}>
          {actividad.nombre}
        </span>
      </span>
      <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>{cliente.nombre}</span>
        <span style={{ fontSize: 13, color: color.textMuted }}>{grupal ? "Grupal" : "Individual"}</span>
      </span>
      <span style={{ fontSize: 15 }}>{profesional?.nombre ?? "—"}</span>
      {selectEstado}
      {botonWhatsapp}
    </div>
  );
}
```

- [ ] **Step 5: Verificar que compila**

Run: `npx tsc -b --noEmit`
Expected: sin errores.

- [ ] **Step 6: Verificación visual manual**

1. Escritorio: Agenda se ve exactamente igual que antes.
2. Móvil: cada turno se ve como una tarjeta (hora + estado arriba, cliente + actividad + WhatsApp abajo), sin encabezado de columnas. Cambiar el estado desde el `<select>` de una tarjeta y confirmar que sigue funcionando igual que antes.

- [ ] **Step 7: Commit**

```bash
git add src/pages/admin/Agenda.tsx
git commit -m "feat: vista movil de Agenda (turnos en tarjetas)"
```

---

## Tarea 8: Estadísticas — tablas en tarjetas + grilla de stats a 2 columnas

**Files:**
- Modify: `src/pages/admin/Estadisticas.tsx`

**Interfaces:**
- Consumes: `useModoVista` (Tarea 1).

- [ ] **Step 1: Agregar el import y el hook**

```tsx
import { useModoVista } from "@/lib/useModoVista";
```

Dentro de `export default function Estadisticas({ centro }: { centro: Centro }) {`, junto a los `useState`:

```tsx
  const { modo } = useModoVista();
```

- [ ] **Step 2: Grilla de 6 stats a 2 columnas en móvil**

Cambiar:

```tsx
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0,1fr))", gap: 12, margin: "24px 0" }}>
```

por:

```tsx
      <div style={{ display: "grid", gridTemplateColumns: modo === "movil" ? "repeat(2, minmax(0,1fr))" : "repeat(6, minmax(0,1fr))", gap: 12, margin: "24px 0" }}>
```

- [ ] **Step 3: Tabla "ocupación por actividad" en tarjetas**

Reemplazar:

```tsx
      <section style={{ background: color.surface, border: `1px solid ${color.border}`, borderRadius: 20, overflow: "hidden" }}>
        <div
          style={{
            height: 48,
            boxSizing: "border-box",
            padding: "0 24px",
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) 110px 110px 110px 110px 110px 110px",
            gap: 16,
            alignItems: "center",
            borderBottom: `1px solid ${color.border}`,
            fontFamily: font.mono,
            fontSize: 12,
            letterSpacing: "0.08em",
            color: color.textMuted
          }}
        >
          <span>ACTIVIDAD</span>
          <span>CUPOS/SEM</span>
          <span>RESERV.</span>
          <span>LIBRES</span>
          <span>OCUPACIÓN</span>
          <span>ASISTIÓ</span>
          <span>CANCELÓ</span>
        </div>
        {filas.map((f) => (
          <div
            key={f.actividad.id}
            style={{
              height: 60,
              boxSizing: "border-box",
              padding: "0 24px",
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) 110px 110px 110px 110px 110px 110px",
              gap: 16,
              alignItems: "center",
              borderBottom: `1px solid ${color.border}`,
              opacity: f.actividad.activa ? 1 : 0.5
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 15 }}>{f.actividad.nombre}</span>
            <span style={{ fontFamily: font.mono, fontSize: 14 }}>{f.cupos}</span>
            <span style={{ fontFamily: font.mono, fontSize: 14 }}>{f.reservados}</span>
            <span style={{ fontFamily: font.mono, fontSize: 14 }}>{f.libres}</span>
            <span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: 26,
                  padding: "0 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  background: f.ocupacion >= 80 ? centro.color_acento : color.bg
                }}
              >
                {f.ocupacion}%
              </span>
            </span>
            <span style={{ fontFamily: font.mono, fontSize: 14 }}>{f.asistidos}</span>
            <span style={{ fontFamily: font.mono, fontSize: 14 }}>{f.cancelados}</span>
          </div>
        ))}
        {!cargando && !filas.length && (
          <div style={{ padding: 24, color: color.textMuted, fontSize: 14 }}>Todavía no hay actividades cargadas.</div>
        )}
      </section>
```

por:

```tsx
      <section style={{ background: color.surface, border: `1px solid ${color.border}`, borderRadius: 20, overflow: "hidden" }}>
        {modo === "escritorio" && (
          <div
            style={{
              height: 48,
              boxSizing: "border-box",
              padding: "0 24px",
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) 110px 110px 110px 110px 110px 110px",
              gap: 16,
              alignItems: "center",
              borderBottom: `1px solid ${color.border}`,
              fontFamily: font.mono,
              fontSize: 12,
              letterSpacing: "0.08em",
              color: color.textMuted
            }}
          >
            <span>ACTIVIDAD</span>
            <span>CUPOS/SEM</span>
            <span>RESERV.</span>
            <span>LIBRES</span>
            <span>OCUPACIÓN</span>
            <span>ASISTIÓ</span>
            <span>CANCELÓ</span>
          </div>
        )}
        {filas.map((f) => {
          const chipOcupacion = (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 26,
                padding: "0 10px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                background: f.ocupacion >= 80 ? centro.color_acento : color.bg
              }}
            >
              {f.ocupacion}%
            </span>
          );

          if (modo === "movil") {
            return (
              <div key={f.actividad.id} style={{ padding: "12px 24px", display: "flex", flexDirection: "column", gap: 6, borderBottom: `1px solid ${color.border}`, opacity: f.actividad.activa ? 1 : 0.5 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{f.actividad.nombre}</span>
                  {chipOcupacion}
                </div>
                <div style={{ fontFamily: font.mono, fontSize: 13, color: color.textMuted }}>
                  {f.reservados}/{f.cupos} reservados · {f.libres} libres · {f.asistidos} asistió · {f.cancelados} canceló
                </div>
              </div>
            );
          }

          return (
            <div
              key={f.actividad.id}
              style={{
                height: 60,
                boxSizing: "border-box",
                padding: "0 24px",
                display: "grid",
                gridTemplateColumns: "minmax(0,1fr) 110px 110px 110px 110px 110px 110px",
                gap: 16,
                alignItems: "center",
                borderBottom: `1px solid ${color.border}`,
                opacity: f.actividad.activa ? 1 : 0.5
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 15 }}>{f.actividad.nombre}</span>
              <span style={{ fontFamily: font.mono, fontSize: 14 }}>{f.cupos}</span>
              <span style={{ fontFamily: font.mono, fontSize: 14 }}>{f.reservados}</span>
              <span style={{ fontFamily: font.mono, fontSize: 14 }}>{f.libres}</span>
              <span>{chipOcupacion}</span>
              <span style={{ fontFamily: font.mono, fontSize: 14 }}>{f.asistidos}</span>
              <span style={{ fontFamily: font.mono, fontSize: 14 }}>{f.cancelados}</span>
            </div>
          );
        })}
        {!cargando && !filas.length && (
          <div style={{ padding: 24, color: color.textMuted, fontSize: 14 }}>Todavía no hay actividades cargadas.</div>
        )}
      </section>
```

- [ ] **Step 4: Tabla "reservas tomadas" en tarjetas**

Reemplazar:

```tsx
      <section style={{ background: color.surface, border: `1px solid ${color.border}`, borderRadius: 20, overflow: "hidden" }}>
        <div
          style={{
            height: 48,
            boxSizing: "border-box",
            padding: "0 24px",
            display: "grid",
            gridTemplateColumns: "110px minmax(0,1fr) minmax(0,1fr) 140px 130px 120px 84px",
            gap: 16,
            alignItems: "center",
            borderBottom: `1px solid ${color.border}`,
            fontFamily: font.mono,
            fontSize: 12,
            letterSpacing: "0.08em",
            color: color.textMuted
          }}
        >
          <span>FECHA</span>
          <span>ACTIVIDAD</span>
          <span>CLIENTE</span>
          <span>TELÉFONO</span>
          <span>DNI</span>
          <span>ESTADO</span>
          <span>AVISO</span>
        </div>
        {reservas.map(({ turno, actividad, cliente }) => {
          let bg = color.bg;
          let fg = color.ink;
          if (turno.estado === "pendiente" || turno.estado === "confirmado") bg = centro.color_acento;
          if (turno.estado === "no_asistio") {
            bg = color.ink;
            fg = "#FFFFFF";
          }
          return (
            <div
              key={turno.id}
              style={{
                height: 60,
                boxSizing: "border-box",
                padding: "0 24px",
                display: "grid",
                gridTemplateColumns: "110px minmax(0,1fr) minmax(0,1fr) 140px 130px 120px 84px",
                gap: 16,
                alignItems: "center",
                borderBottom: `1px solid ${color.border}`
              }}
            >
              <span style={{ fontFamily: font.mono, fontSize: 13, fontWeight: 600 }}>
                {new Date(turno.inicio).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })} · {formatearHora(new Date(turno.inicio))}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{actividad.nombre}</span>
              <span style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cliente.nombre}</span>
              <span style={{ fontFamily: font.mono, fontSize: 13 }}>{cliente.telefono}</span>
              <span style={{ fontFamily: font.mono, fontSize: 13 }}>{cliente.dni || "—"}</span>
              <span>
                <span style={{ display: "inline-flex", alignItems: "center", height: 26, padding: "0 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: bg, color: fg }}>
                  {estadoLabel[turno.estado]}
                </span>
              </span>
              <span style={{ display: "flex", gap: 6 }}>
                <a
                  href={linkWhatsapp(cliente.telefono, `Hola ${cliente.nombre.split(" ")[0]}, te escribimos por tu turno de ${actividad.nombre}.`)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Enviar WhatsApp a ${cliente.nombre}`}
                  title="Avisar"
                  style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10, border: `1px solid ${color.borderStrong}`, background: color.surface, fontSize: 11, fontWeight: 700 }}
                >
                  WA
                </a>
                <a
                  href={linkWhatsapp(
                    cliente.telefono,
                    `Hola ${cliente.nombre.split(" ")[0]}, necesitamos reprogramar o cancelar tu turno de ${actividad.nombre} del ${new Date(turno.inicio).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })} a las ${formatearHora(new Date(turno.inicio))}. ¿Nos escribís para coordinar?`
                  )}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Reprogramar o cancelar el turno de ${cliente.nombre}`}
                  title="Reprogramar / cancelar"
                  style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10, border: `1px solid ${color.borderStrong}`, background: "#FCEBD5", fontSize: 14 }}
                >
                  ↻
                </a>
              </span>
            </div>
          );
        })}
        {!cargando && !reservas.length && (
          <div style={{ padding: 24, color: color.textMuted, fontSize: 14 }}>No hay reservas para este filtro.</div>
        )}
      </section>
```

por:

```tsx
      <section style={{ background: color.surface, border: `1px solid ${color.border}`, borderRadius: 20, overflow: "hidden" }}>
        {modo === "escritorio" && (
          <div
            style={{
              height: 48,
              boxSizing: "border-box",
              padding: "0 24px",
              display: "grid",
              gridTemplateColumns: "110px minmax(0,1fr) minmax(0,1fr) 140px 130px 120px 84px",
              gap: 16,
              alignItems: "center",
              borderBottom: `1px solid ${color.border}`,
              fontFamily: font.mono,
              fontSize: 12,
              letterSpacing: "0.08em",
              color: color.textMuted
            }}
          >
            <span>FECHA</span>
            <span>ACTIVIDAD</span>
            <span>CLIENTE</span>
            <span>TELÉFONO</span>
            <span>DNI</span>
            <span>ESTADO</span>
            <span>AVISO</span>
          </div>
        )}
        {reservas.map(({ turno, actividad, cliente }) => {
          let bg = color.bg;
          let fg = color.ink;
          if (turno.estado === "pendiente" || turno.estado === "confirmado") bg = centro.color_acento;
          if (turno.estado === "no_asistio") {
            bg = color.ink;
            fg = "#FFFFFF";
          }
          const chipEstado = (
            <span style={{ display: "inline-flex", alignItems: "center", height: 26, padding: "0 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: bg, color: fg }}>
              {estadoLabel[turno.estado]}
            </span>
          );
          const botonesAviso = (
            <span style={{ display: "flex", gap: 6, flex: "none" }}>
              <a
                href={linkWhatsapp(cliente.telefono, `Hola ${cliente.nombre.split(" ")[0]}, te escribimos por tu turno de ${actividad.nombre}.`)}
                target="_blank"
                rel="noreferrer"
                aria-label={`Enviar WhatsApp a ${cliente.nombre}`}
                title="Avisar"
                style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10, border: `1px solid ${color.borderStrong}`, background: color.surface, fontSize: 11, fontWeight: 700 }}
              >
                WA
              </a>
              <a
                href={linkWhatsapp(
                  cliente.telefono,
                  `Hola ${cliente.nombre.split(" ")[0]}, necesitamos reprogramar o cancelar tu turno de ${actividad.nombre} del ${new Date(turno.inicio).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })} a las ${formatearHora(new Date(turno.inicio))}. ¿Nos escribís para coordinar?`
                )}
                target="_blank"
                rel="noreferrer"
                aria-label={`Reprogramar o cancelar el turno de ${cliente.nombre}`}
                title="Reprogramar / cancelar"
                style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10, border: `1px solid ${color.borderStrong}`, background: "#FCEBD5", fontSize: 14 }}
              >
                ↻
              </a>
            </span>
          );

          if (modo === "movil") {
            return (
              <div key={turno.id} style={{ padding: "12px 24px", display: "flex", flexDirection: "column", gap: 8, borderBottom: `1px solid ${color.border}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{cliente.nombre}</span>
                  {chipEstado}
                </div>
                <div style={{ fontSize: 13, color: color.textMuted }}>
                  {actividad.nombre} · {new Date(turno.inicio).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })} · {formatearHora(new Date(turno.inicio))}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: font.mono, fontSize: 13, color: color.textMuted }}>{cliente.telefono}</span>
                  {botonesAviso}
                </div>
              </div>
            );
          }

          return (
            <div
              key={turno.id}
              style={{
                height: 60,
                boxSizing: "border-box",
                padding: "0 24px",
                display: "grid",
                gridTemplateColumns: "110px minmax(0,1fr) minmax(0,1fr) 140px 130px 120px 84px",
                gap: 16,
                alignItems: "center",
                borderBottom: `1px solid ${color.border}`
              }}
            >
              <span style={{ fontFamily: font.mono, fontSize: 13, fontWeight: 600 }}>
                {new Date(turno.inicio).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })} · {formatearHora(new Date(turno.inicio))}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{actividad.nombre}</span>
              <span style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cliente.nombre}</span>
              <span style={{ fontFamily: font.mono, fontSize: 13 }}>{cliente.telefono}</span>
              <span style={{ fontFamily: font.mono, fontSize: 13 }}>{cliente.dni || "—"}</span>
              <span>{chipEstado}</span>
              {botonesAviso}
            </div>
          );
        })}
        {!cargando && !reservas.length && (
          <div style={{ padding: 24, color: color.textMuted, fontSize: 14 }}>No hay reservas para este filtro.</div>
        )}
      </section>
```

- [ ] **Step 5: Verificar que compila**

Run: `npx tsc -b --noEmit`
Expected: sin errores.

- [ ] **Step 6: Verificación visual manual**

1. Escritorio: Estadísticas se ve exactamente igual que antes (grilla de 6 stats, dos tablas, grilla de ocupación por día).
2. Móvil: la grilla de stats pasa a 2 columnas; las dos tablas se ven en tarjetas, sin encabezado de columnas; los selectores de actividad/filtro siguen funcionando igual.

- [ ] **Step 7: Commit**

```bash
git add src/pages/admin/Estadisticas.tsx
git commit -m "feat: vista movil de Estadisticas (tablas en tarjetas)"
```

---

## Tarea 9: Verificación end-to-end completa

Sin código nuevo — checklist final con las 6 pantallas, en escritorio, en móvil (achicando la ventana del navegador) y en un celular real.

- [ ] **Paso 1:** En escritorio (sin tocar el selector), recorrer las 6 pantallas (Agenda, Actividades, Profesionales, Clientes, Accesos, Estadísticas) y confirmar que se ven y funcionan exactamente igual que antes de este proyecto.
- [ ] **Paso 2:** Tocar el selector 📱 desde la compu (sin achicar la ventana) y recorrer las 6 pantallas. Confirmar que cada una se ve bien, sin texto cortado ni botones superpuestos, y que todas las acciones (crear, editar, dar de baja, cambiar estado, etc.) siguen funcionando.
- [ ] **Paso 3:** Recargar la página con el selector en 📱 y confirmar que se mantiene en móvil. Tocar 🖥️, recargar, confirmar que se mantiene en escritorio.
- [ ] **Paso 4:** Abrir el sitio real desde un celular de verdad (sin haber tocado el selector ahí todavía) y confirmar que arranca en modo móvil automáticamente.
- [ ] **Paso 5:** Desde el celular, abrir el menú ☰, navegar entre las 6 secciones, y confirmar que "Cerrar sesión" sigue funcionando desde ahí.
- [ ] **Paso 6:** Desde el celular, probar el flujo completo de Accesos (ya probado en el proyecto anterior) para confirmar que no se rompió nada con los cambios de layout.
- [ ] **Paso 7:** Desde el celular, crear un cliente nuevo, una actividad nueva y un profesional nuevo, y confirmar que los tres formularios se ven y se completan bien.

Si todos los pasos anteriores dan el resultado esperado, la vista móvil del admin queda completa según la spec.
