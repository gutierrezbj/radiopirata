# RadioPirata — Progreso

## Preparación
- [x] Repositorio creado.
- [x] Dirección de producto y visual documentada.
- [x] Encargo, arquitectura y criterios de aceptación versionados.
- [x] Carpeta de Windows sincronizada por el agente local (2026-09-20: la carpeta estaba vacía y sin Git; se clonó `main`).
- [ ] Mockups aprobados añadidos como referencias visuales al repositorio (siguen solo en el chat).

## E1 — Primera escucha
- [x] Inspeccionar carpeta y estado Git; preservar trabajo existente (no había nada que preservar).
- [x] Crear estructura React/TypeScript/Vite y API Node (workspaces `web/` y `server/`).
- [x] Adaptador Radio Browser con caché, límites y fallos controlados (DNS SRV, timeout, rotación de servidor, caché 15 min, copia local con fecha).
- [x] Selección real y verificada para Tokio, Caracas y Lisboa (11 emisoras; `server/data/seleccion-e1.json` del 2026-09-20; evidencia en `docs/VERIFICACION-E1.md`).
- [x] Inicio minimalista y selección de destino (pregunta, buscador con aviso honesto del alcance, fichas, horizonte).
- [x] Globo y panel de emisoras adaptados a escritorio/móvil (panel izquierdo en escritorio, hoja inferior en móvil).
- [x] Reproductor único persistente y estados de audio (idle/loading/playing/paused/error, volumen donde el navegador lo permite).
- [x] Sorpréndeme dentro de la selección inicial.
- [x] Validar escucha, navegación y cambios rápidos de estación (en Chromium; ver verificación).
- [~] Validar fallback sin WebGL y errores de red/reproducción: implementados y cubiertos por pruebas unitarias; no forzados a mano en el navegador.
- [x] Ejecutar build, tipos y pruebas focalizadas (21 pruebas server, 19 web).
- [x] Actualizar README con comandos y resultados; subir entrega.

### Pendientes y limitaciones registradas en E1
- Free FM 80 Tokyo retirada: sirve HTML a navegadores. Tokio queda con 3 emisoras verificadas.
- Solo probado en Chromium (navegador integrado de Claude desktop) en Windows 11, escritorio y emulación móvil. Falta Firefox, Safari/iOS y teléfonos físicos.
- Bloqueo real de autoplay, caída de señal en directo, `prefers-reduced-motion` y ausencia de WebGL: implementados, no reproducidos a mano.
- Las señales HLS quedaron fuera de la selección; si hace falta (p. ej. Antena 1 en Lisboa), añadir soporte y verificarlo por navegador.
- Sin captura de audio: «reproduce» significa evento `playing` del navegador, no escucha con altavoces.

## E2 — Descubrimiento
- [ ] Catálogo ampliado, índice de ciudades y búsqueda.
- [ ] Filtros de género.
- [ ] Favoritos y recientes locales.
- [ ] Compartir emisora.

## E3 — Publicación
- [ ] Validar rendimiento, accesibilidad y dispositivos.
- [ ] Confirmar alojamiento.
- [ ] Preparar configuración HTTPS y dominio.
- [ ] Publicar cuando lo indique el usuario.

No marcar como hecha una prueba sin ejecutarla. Registrar bloqueos y limitaciones.
