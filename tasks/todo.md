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

## E4 — Acercar a casa · terminada el 2026-09-21
El norte lo puso JuanCho: la radio local de casa para quien vive fuera. Ver `docs/VERIFICACION-E4.md`.
- [x] Noticias por país: 241 países con recuento real, emisoras que el catálogo o su nombre presentan como informativas, nota honesta.
- [x] Temporizador para dormirse con la radio puesta (15 a 60 min), con fundido final donde el navegador lo permite y cuenta contra hora fija.
- [x] Zona horaria en las 72 ciudades del índice, validada al arrancar; hora de allí en el panel y en el reproductor.
- [x] Día y noche en el globo desde la posición real del sol; «Donde ya es de noche» en el inicio.
- [x] Tarjeta al compartir: título y Open Graph puestos por el servidor para lugar, emisora, noticias y búsqueda.
- [x] Relojes de láminas (idea de JuanCho): el de allí y el de aquí en la cabecera de cada ciudad, con caída de dígitos al entrar y al cambiar el minuto; frase entera para lectores de pantalla.
- [x] Imagen de la tarjeta (1200×630) a petición de JuanCho el 2026-09-21: fondo carbón, horizonte del planeta, marca, titular y el dominio en una píldora amarilla. Se genera con `web/scripts/generar-tarjeta.py` y vive en `web/public/tarjeta.png`. El servidor añade `og:image` absoluta con tipo, medidas y texto alternativo, y `twitter:card` grande. Comprobado en el dominio real, también con el agente de WhatsApp.
- [ ] Escuchar una a una las emisoras informativas de Venezuela.

## Registro JRGB y despliegue · decidido el 2026-09-21
- [x] Leer Notion: Protocolo de Kickoff, Catálogo de Infraestructura y Manifiesto SDD-JRGB.
- [x] Decisiones de JuanCho: Servidor 2; registrar como proyecto JRGB.
- [x] Página «Radio Pirata 1.0» en Notion bajo Proyecto Radio → Radio Pirata, con SDD-01..08, subcarpetas y copia del checklist.
- [x] Offset +240 reservado en el Catálogo (Sección 4); siguiente libre +250.
- [x] `docker-compose.yml` (127.0.0.1:3240:3001), `CLAUDE.md`, nginx a 3240, `docs/DESPLIEGUE.md` reescrita contra la infra real.
- [x] Artefactos del Protocolo de Coding Session: `CLAUDE.md` con capa global y de producto, `DESIGN.md`, `tasks/lessons.md`; copia del checklist UX/UI bajo Diseño y página «Lessons Aprendidas» en Notion; entrada v1.5 en el Cuaderno Maestro.
- [ ] Identity Sprint formal y Distinctiveness Audit (bloquean producción, no el Servidor 2).
- [x] Dominio `radiopirata.jrgblanco.com` en la tabla de la Sección 7 del Catálogo, como reservado en Servidor 2 (pasar a activo al desplegar).
- [x] Fase 5 (2026-09-21, «dale play» de JuanCho): clonado en `/opt/apps/radiopirata`, imagen construida, contenedor `radiopirata-web` sano en 127.0.0.1:3240, nada en 0.0.0.0, vhost nginx en :80, entrada en healthcheck.sh, registro en SA99. Evidencia en `docs/VERIFICACION-DESPLIEGUE.md`.
- [x] DNS: JuanCho creó el registro A **`radiopirata`** → 187.77.71.102 (TTL 300). Resuelve. El dominio pasa a ser `radiopirata.jrgblanco.com` y así se ha renombrado en todo el repo.
- [x] HTTPS: JuanCho ejecutó nginx + Certbot (el modo automático lo deniega); certificado hasta el 20 dic 2026, HSTS activado y contenedor recreado.
- [x] QA en el dominio real: redirección, salud, cabeceras, tarjetas por ruta y recorrido Caracas → Lisboa sin cortar el audio.
- [x] Fase 7: fila del Servidor 2 en el Catálogo, dominio en la Sección 7, tabla del Manifiesto, checklist y página del proyecto actualizados en Notion.
- [ ] Ver en el log del healthcheck una pasada con `radiopirata-web` (el log solo resume alertas; hasta ahora `alerts=0`).
- [x] SA99 completo: documento de Mongo con el dominio real y `RadioPirata` añadido a `SEED_SERVERS` en `service.py`. No es otro proyecto (corrección de JuanCho).

## Retoques del 2026-09-22 (peticiones de JuanCho)
- [x] El globo gira despacio mientras el catálogo responde y se para al llegar; sin giro con `prefers-reduced-motion`. «Si no se mueve da la sensación de que no está buscando».
- [x] Al buscar un país, el globo viaja a la ciudad que el índice propio reconoce (Francia → París). Sin ciudad en el índice, gira mientras busca y se queda donde está: no se inventan coordenadas.
- [x] Buscador predictivo: propone ciudades del índice y países del catálogo con su número de emisoras, con teclado (flechas, Enter, Escape) y patrón ARIA de combobox.
- [x] Los acentos dan igual: todo se compara con `normalizar()`. «japon» encuentra Japón, «mexico» encuentra México.
- [x] «Noticias», «Recientes» y «Favoritas» funcionan como interruptor: si ya estás dentro, te devuelven al inicio.
- [x] Botón propio, la **tecla de emisora**: cuerpo, hundido al pulsar, se queda dentro mientras está puesta y enciende la lucecita del dial. En los atajos de la cabecera y en los tres destinos comprobados del inicio. Sustituye al relleno desde el puntero, que era prestado y no decía nada de una radio.
- [x] Amanecer en el horizonte del inicio, idea de JuanCho al ver la línea del planeta en pantalla ancha.
- [x] El mapa del mundo dentro de esa circunferencia, para que sea un globo de verdad: SVG de 34 kB generado con `web/scripts/generar-planeta.py` desde los mismos datos que el globo del explorador.
- [x] Los atajos del inicio, que eran enlaces subrayados sueltos, pasan a ser teclas como los del explorador: JuanCho los vio «deslucir el look tan premium».
- [x] Antenas en el globo (idea de JuanCho: «los conitos» eran cilindros sin sentido): cada ciudad es una antena con tres anillos de emisión, que se encienden en verde y crecen cuando suena una emisora de esa ciudad. La ciudad abierta va en ámbar.
- [ ] La antena verde solo se enciende si la reproducción arrancó desde una ciudad. Desde una búsqueda no hay ciudad y no se enciende ninguna: queda pendiente decidir si se quiere resolver la ciudad de cada emisora.
- [ ] Mirar por qué una vez el globo no viajó de Caracas a Lisboa; no se ha podido reproducir.

## E3 — Preparación pública · preparada el 2026-09-21
- [x] Rendimiento: compresión en el servidor, caché inmutable para ficheros con hash, densidad de píxeles del globo según el equipo y globo que deja de dibujarse cuando nadie lo toca.
- [x] Medir lo que se descarga de verdad: 82 kB en el inicio; el globo son otros 550 kB y solo los paga quien entra al explorador.
- [x] Accesibilidad: contraste medido (mínimo 6,6:1), orden de tabulación, foco al encabezado al cambiar de vista, título de pestaña por vista y aviso para lectores de pantalla.
- [x] Fallos de proveedor y de señal forzados a mano: emisora que no reproduce, lugar inexistente, emisora compartida caída y catálogo sin respuesta.
- [x] Cabeceras de seguridad y política de contenidos, con HSTS apagado hasta que haya HTTPS.
- [x] Apagado ordenado del servidor al recibir SIGTERM.
- [x] Preparar despliegue: Dockerfile, unidad de systemd, configuración de nginx y `docs/DESPLIEGUE.md` con DNS y HTTPS.
- [ ] Probar en Firefox y Safari, y en un teléfono de verdad.
- [x] Confirmar alojamiento: **Servidor 2** (decisión de JuanCho, 2026-09-21).
- [x] `radiopirata.jrgblanco.com` en marcha con certificado de Let's Encrypt (21 sep 2026).
- [x] Publicar cuando lo indique el usuario: desplegada en el Servidor 2 el 2026-09-21; visible desde fuera cuando exista el DNS.

### Arreglado durante E3
- La política de contenidos bloqueaba los estilos en línea del globo y rompía la información al pasar el ratón. Se abrió `style-src` dejando `script-src` cerrado.
- El encabezado decía «Cargando…» mientras mostraba el error de un lugar desconocido.
- Al entrar al explorador desde el inicio, el foco caía al cuerpo del documento.

### Añadido a petición de JuanCho (2026-09-21)
- [x] Dial de sintonía: anillo alrededor del botón de reproducir que va de rojo a ámbar y a verde según entra la señal. Se apoya en `readyState` del elemento de audio, no en una animación inventada. Comprobados los cuatro estados en el navegador.

### Sin comprobar en E3
- Docker no está instalado en este equipo: el `Dockerfile` está escrito pero nunca se ha construido.
- Los ficheros de systemd y nginx no se han aplicado a ninguna máquina.
- La activación con teclado (Enter y Espacio) no se pudo observar porque la automatización del navegador no la dispara; el orden de tabulación y el foco sí se comprobaron.
- Sigue sin probarse en Firefox, Safari, iOS, Android ni teléfonos físicos.
- El aviso para lectores de pantalla se comprobó leyendo el DOM, no con un lector real.

No marcar como hecha una prueba sin ejecutarla. Registrar bloqueos y limitaciones.
