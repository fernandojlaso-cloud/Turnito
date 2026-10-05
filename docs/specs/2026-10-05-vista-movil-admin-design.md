# Vista móvil del panel de administración

Estado: aprobado para pasar a plan de implementación
Fecha: 2026-10-05
Alcance: que las 6 pantallas del panel de admin (Agenda, Actividades, Profesionales, Clientes, Accesos, Estadísticas) se vean y usen bien desde un celular, con un selector manual para forzar vista escritorio/móvil.

## Fuera de alcance (proyectos separados, no tocar acá)

- Paquetes de clases y cuenta corriente para clientes de actividades grupales.
- QR de cobro / aviso de pago para clientes de actividades individuales.
- Cualquier cambio a la página pública de reservas (`/r/:slug`) — ya es mobile-friendly, no se toca.
- Tarea 8 de Accesos (dominio + Resend) — proyecto aparte, en curso.

## Contexto relevante del código actual

- `src/pages/admin/AdminLayout.tsx`: sidebar fijo de 248px a la izquierda con los links de navegación + nombre del centro + botón "Cerrar sesión". No colapsa en pantallas chicas.
- `src/pages/admin/Agenda.tsx`, `Clientes.tsx`, `Estadisticas.tsx`: listan datos en "tablas" armadas con `display: grid` y columnas de ancho fijo (ej. Agenda: `80px 170px minmax(0,1fr) minmax(0,1fr) 130px 90px`). No entran en una pantalla de celular (~375-414px de ancho).
- `src/pages/admin/Actividades.tsx`, `Profesionales.tsx`: layout maestro-detalle — una lista fija a la izquierda (340-380px) y el detalle del elemento seleccionado a la derecha, lado a lado. En celular quedan apretados uno al lado del otro.
- `src/pages/admin/Accesos.tsx`: ya es mobile-first (pantalla de cámara de un solo bloque), no necesita cambios.
- No existe hoy ningún mecanismo de detección de tamaño de pantalla ni preferencia guardada en el proyecto.

## Decisiones tomadas

1. **Punto de quiebre:** 768px de ancho de pantalla. Por debajo se considera "móvil", por arriba "escritorio".
2. **Selector manual:** un control "🖥️ Escritorio / 📱 Móvil" visible siempre, arriba a la derecha del panel, que fuerza una vista sin importar el ancho real de pantalla. Pensado tanto para uso real en celular como para poder probar/ajustar la vista móvil desde una computadora sin achicar la ventana.
3. **Persistencia:** la elección del selector se guarda en `localStorage` del navegador (clave `turnito_vista_forzada`, valores `"movil"` / `"escritorio"` / ausente = automático). Es por dispositivo/navegador, no por usuario ni por centro.
4. **Navegación en móvil:** menú tipo overlay a pantalla completa, activado con un botón ☰ arriba a la izquierda. Mismas secciones que hoy, mismo orden. Se cierra al elegir una sección o al tocar fuera del panel.
5. **Tablas → tarjetas:** en Agenda, Clientes y Estadísticas, cada fila pasa de columnas lado a lado a una tarjeta apilada en móvil. Esto se implementa pantalla por pantalla (los datos de cada tabla son distintos), no con un transformador genérico de grillas.
6. **Maestro-detalle → apilado:** en Actividades y Profesionales, se arma un componente de layout compartido (`MaestroDetalle`) que en escritorio muestra lista+detalle lado a lado (como hoy) y en móvil muestra primero la lista a pantalla completa y, al tocar un ítem, el detalle a pantalla completa con un botón "← Volver".
7. **Nada de contenido cambia:** los datos, botones, formularios y lógica de cada pantalla quedan exactamente iguales — solo cambia cómo se acomodan visualmente según el modo de vista.

## Arquitectura


## Componentes nuevos

- `src/lib/useModoVista.ts` — hook puro reutilizable. Expone también `vistaForzada` (para que `SelectorVista` la lea/escriba) y la constante `BREAKPOINT_MOVIL = 768`.
- `src/lib/__tests__/useModoVista.test.ts` — tests del hook (lógica de decisión, no del DOM real).
- `src/components/admin/SelectorVista.tsx` — el control 🖥️/📱, usa `useModoVista()`.
- `src/components/admin/MenuMovil.tsx` — overlay de navegación a pantalla completa para móvil, recibe la misma lista de links que ya arma `AdminLayout.tsx`.
- `src/components/admin/MaestroDetalle.tsx` — wrapper de layout: recibe `lista` y `detalle` (ambos `ReactNode`), arma el layout según `useModoVista()`.

## Cambios en archivos existentes

- `src/pages/admin/AdminLayout.tsx`: usa `useModoVista()`; renderiza sidebar o header+`MenuMovil` según el modo; agrega `SelectorVista` en la esquina superior derecha.
- `src/pages/admin/Agenda.tsx`: agrega la vista de tarjeta apilada para móvil, usando `useModoVista()`.
- `src/pages/admin/Clientes.tsx`: ídem, para su tabla de clientes.
- `src/pages/admin/Estadisticas.tsx`: ídem, para sus tablas (puede haber más de una tabla en esta pantalla — se adapta cada una).
- `src/pages/admin/Actividades.tsx`: se envuelve la lista + el detalle existentes con `<MaestroDetalle>`, sin tocar su contenido interno.
- `src/pages/admin/Profesionales.tsx`: ídem.

## Manejo de errores / casos borde

- Si `localStorage` no está disponible (navegador en modo privado muy restrictivo) o el valor guardado es inválido: se ignora silenciosamente y se usa el modo automático según el ancho real.
- El listener de `resize` se da de baja (`cleanup`) al desmontar, para no acumular listeners al navegar entre pantallas.
- No aplica Server-Side Rendering (la app es un SPA con Vite), así que no hay riesgo de `window is undefined` al cargar.

## Plan de pruebas

1. `useModoVista`: tests automáticos (Vitest) — sin preferencia + pantalla ancha → `"escritorio"`; sin preferencia + pantalla angosta → `"movil"`; con preferencia forzada → siempre esa, sin importar el ancho real.
2. Verificación visual manual de cada una de las 6 pantallas, en modo escritorio (confirmando que no cambió nada) y en modo móvil (achicando la ventana del navegador y además desde un celular real), confirmando que todos los datos y acciones siguen funcionando igual.
3. Selector de vista: tocarlo y confirmar que cambia al instante, que persiste al recargar la página, y que persiste al cerrar y volver a entrar.
4. Menú móvil: confirmar que el botón ☰ abre el panel, que tocar una sección navega y cierra el panel, y que tocar afuera también lo cierra.
5. Maestro-detalle en móvil: confirmar que al tocar un ítem de la lista se ve el detalle a pantalla completa, y que "← Volver" regresa a la lista sin perder la selección previa.
