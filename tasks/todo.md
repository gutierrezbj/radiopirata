# RadioPirata — Progreso

## Preparación
- [x] Repositorio creado.
- [x] Dirección de producto y visual documentada.
- [x] Encargo, arquitectura y criterios de aceptación versionados.
- [x] Carpeta de Windows sincronizada por el agente local (2026-09-20: la carpeta estaba vacía y sin Git; se clonó `main`).
- [ ] Mockups aprobados añadidos como referencias visuales al repositorio (siguen solo en el chat).

## E1 — Primera escucha · terminada el 2026-09-20
- [x] Inspeccionar carpeta y estado Git; preservar trabajo existente (no había nada que preservar).
- [x] Crear estructura React/TypeScript/Vite y API Node (workspaces `web/` y `server/`).
- [x] Adaptador Radio Browser con caché, límites y fallos controlados.
- [x] Selección real y verificada para Tokio, Caracas y Lisboa (11 emisoras; evidencia en `docs/VERIFICACION-E1.md`).
- [x] Inicio minimalista y selección de destino.
- [x] Globo y panel de emisoras adaptados a escritorio/móvil.
- [x] Reproductor único persistente y estados de audio.
- [x] Sorpréndeme dentro de la selección inicial.
- [x] Validar escucha, navegación y cambios rápidos de estación.
- [~] Validar fallback sin WebGL y errores de red/reproducción: implementados y con pruebas unitarias; no forzados a mano en el navegador.
- [x] Ejecutar build, tipos y pruebas focalizadas.
- [x] Actualizar README con comandos y resultados; subir entrega.

## E2 — Descubrimiento · terminada el 2026-09-20
- [x] Catálogo ampliado: búsqueda por nombre, estilo y país en paralelo, sin repetidos y paginada.
- [x] Índice propio de 72 ciudades con coordenadas fiables, validado al arrancar y usado para resolver nombres.
- [x] Filtros por estilo sobre la lista que se está viendo.
- [x] Favoritas y recientes locales con esquema versionado y datos inválidos tratados.
- [x] Compartir una emisora con enlace propio; el estado de la aplicación vive en la dirección.
- [x] Anterior y siguiente de emisora, con recorrido definido sobre la lista de la que salió lo que suena.
- [x] «Mis favoritas» y filtros visibles solo cuando funcionan.
- [x] Validar el recorrido a mano en escritorio y móvil (`docs/VERIFICACION-E2.md`).
- [x] Ejecutar build, tipos y pruebas (59 en server, 54 en web).
- [x] Actualizar README y subir entrega.

### Arreglado durante E2
- Un fallo pasajero del catálogo se quedaba cacheado 15 minutos y dejaba una ciudad vacía. Ya no se cachean los fallos.
- Las consultas en paralelo se quitaban servidores de Radio Browser entre ellas y podían fallar todas con un servidor sano disponible. Cada petición recorre ahora su propia copia del orden.
- Emisoras con formatos que ningún navegador abre (FLV y compañía) aparecían en las listas. Se filtran por formato.
- El globo no enfocaba la ciudad al abrirla porque el lugar llegaba después de montarse.

### Pendientes y limitaciones registradas
- Solo probado en Chromium (navegador integrado de Claude desktop) en Windows 11, escritorio y emulación móvil. Falta Firefox, Safari/iOS y teléfonos físicos.
- Las emisoras del catálogo no están comprobadas una a una: algunas fallarán y el reproductor lo dice.
- Las señales HLS siguen fuera; si se quieren emisoras como Antena 1, hay que añadir soporte y verificarlo por navegador.
- La hoja de compartir del sistema en móvil no se ha probado; sí la copia al portapapeles.
- Modo privado y cuota llena: cubiertos por pruebas unitarias, no reproducidos a mano.
- Una búsqueda devuelve como mucho 120 emisoras.
- Sin captura de audio: «reproduce» significa evento `playing` del navegador, no escucha con altavoces.

## E3 — Publicación
- [ ] Validar rendimiento, accesibilidad y dispositivos reales.
- [ ] Probar en Firefox y Safari, y en un teléfono de verdad.
- [ ] Confirmar alojamiento.
- [ ] Preparar configuración HTTPS y dominio.
- [ ] Publicar cuando lo indique el usuario.

No marcar como hecha una prueba sin ejecutarla. Registrar bloqueos y limitaciones.
