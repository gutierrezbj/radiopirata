# Encargo de implementación — RadioPirata
Fecha: 2026-09-20. Dirección de producto y visual aceptada en conversación con JuanCho.

## 1. Producto
Explorar emisoras reales del mundo y escucharlas con pocos pasos. La interfaz debe transmitir curiosidad, calma y compañía. El proyecto es independiente de las otras aplicaciones de JRGB.

Frases de inicio:
- «¿Dónde escuchamos hoy?»
- «La música siempre es buena compañía.»

Nombre: RadioPirata.
Dominio previsto: radio.jrgblanco.com; no está configurado por este encargo.

## 2. Alcance y entregas

### E1 — Recorrido completo con selección pequeña
Implementar inicio y explorador, globo real y reproducción real. Seleccionar y verificar emisoras de Tokio, Caracas y Lisboa. No hacen falta muchas: al menos una reproducible por destino cuando sea accesible; si un destino no puede verificarse, registrarlo como pendiente, sin simular éxito.

Inicio → destino → listado → escuchar → seguir explorando.
Búsqueda limitada a estos destinos y emisoras, indicándolo con honestidad.
«Sorpréndeme» elige entre los destinos/estaciones disponibles.
E1 debe mostrar ya la dirección visual acordada.

### E2 — Descubrimiento ampliado
Búsqueda del catálogo por nombre, país y etiquetas; índice propio pequeño de ciudades para resolver nombres y coordenadas fiables; favoritos y recientes locales; filtros musicales; enlaces para compartir una estación.
No mostrar controles activos que todavía no funcionen.

### E3 — Preparación pública
Validación de navegadores y móvil, rendimiento, accesibilidad, fallos de proveedor y señales; preparación del despliegue y documentación de DNS/HTTPS.
Publicar solo con indicación del usuario y tras elegir alojamiento concreto.

## 3. Arquitectura
- Frontend: React + TypeScript + Vite.
- Globo: Globe.gl, integrándolo con React con montaje y limpieza correctos.
- API: Node.js + TypeScript. Servir API y frontend bajo el mismo origen en producción; proxy de desarrollo de Vite.
- Catálogo: Radio Browser, encapsulado en un adaptador.
- Audio: un elemento HTMLAudioElement persistente fuera del árbol que cambia al navegar. Empezar con formatos nativos compatibles; añadir soporte HLS solo si la selección lo exige y verificarlo por navegador.
- Persistencia E2: localStorage con esquema versionado, manejo de datos inválidos y fallo de almacenamiento.
- Sin base de datos, login ni sincronización entre dispositivos en esta versión.
- Un repositorio con web/, server/, docs/ y tasks/ es suficiente. El agente puede ajustar detalles de estructura explicándolo.
- Elegir versiones estables compatibles al implementar y fijarlas con lockfile; documentar versión de Node y comandos reales.

Flujo de catálogo: navegador → API propia → Radio Browser.
Flujo de audio: servidor de la emisora → navegador.
La API nunca transporta el audio.

## 4. Catálogo, lugares y búsqueda
Radio Browser no garantiza disponibilidad ni coordenadas completas. Consultar su documentación vigente, descubrir servidores según sus indicaciones y admitir cambio de servidor ante fallo.
Usar identificador de aplicación descriptivo en peticiones del backend y respetar el mecanismo documentado de registro de clic al iniciar una escucha, sin contarlo al navegar.
Aplicar timeouts, caché acotada y reintento limitado. Una política inicial razonable: caché de consultas de 15 minutos con máximo de entradas y copia de la selección inicial identificada con fecha.
Validar entrada, limitar longitud, paginar y limitar respuestas. El cliente no puede indicar hosts arbitrarios para que el backend los consulte.
No insertar HTML de proveedores. Validar URLs externas y esquemas admitidos.
Usar URLs HTTPS compatibles para la primera selección. No resolver bloqueos de una señal creando un proxy de audio.
Conservar identificador, nombre, país, idioma, etiquetas, URL, web oficial y coordenadas cuando existan.
El país no prueba la ciudad: una emisora japonesa no se debe etiquetar automáticamente como Tokio.
Un destino del índice de ciudades puede tener coordenadas propias, pero no se deben presentar como ubicación exacta de cada emisora sin evidencia.
Si no hay coordenadas fiables, la emisora puede aparecer en una lista sin un punto ficticio.
Los marcadores de los mockups son ilustrativos, no una fuente geográfica.

## 5. Dirección visual
Fondo carbón cálido, marfil, gris secundario legible y amarillo cálido. Una tipografía sans humanista, radios aproximados de 16 px, espacio generoso y pocas líneas divisorias.
Tokens de partida ajustables: fondo #121416, superficie #1E2225, texto #F5F0E6, secundario #B5B0A7, acento #F2CB57.
Comprobar contraste real; evitar que amarillo sea el único indicador de estado.
No añadir estética futurista, estrellas, neón, tablas administrativas o paneles de métricas.

### Inicio
- Símbolo pequeño de radio arriba a la izquierda.
- «Mis favoritas» arriba a la derecha solo cuando funcione en E2.
- Gran pregunta central «¿Dónde escuchamos hoy?».
- Subtítulo y buscador con acción clara.
- «Sorpréndeme» debajo.
- Horizonte del planeta entrando desde el borde inferior.
- Mucho espacio vacío. Sin listado ni reproductor antes de comenzar la experiencia.

### Explorador
- Globo como protagonista.
- Panel de emisoras del lugar a la izquierda en escritorio.
- Filtros discretos arriba cuando funcionen.
- Reproductor persistente abajo con estación, lugar, estado, reproducir/pausar y volumen donde el navegador lo permita.
- Favoritos y anterior/siguiente solo cuando su comportamiento esté implementado y definido. Anterior/siguiente cambian de estación, nunca de canción.
- Estado «En directo» solo tras reproducción efectiva.
- Elegir un destino mueve suavemente la cámara; respetar prefers-reduced-motion.
- Hover muestra información. Clic/toque selecciona; la reproducción parte de una acción explícita, no del mero movimiento del ratón.

### Móvil y acceso alternativo
Panel de emisoras desde abajo, reproductor visible sin tapar acciones, controles táctiles cómodos.
Evitar renders permanentes innecesarios; adaptar detalle/píxeles del globo a rendimiento.
Lista/buscador accesibles incluso sin WebGL; teclado y foco visible; nombres accesibles en botones de icono.
El mockup debe adaptarse a pantallas pequeñas, no reducirse como una foto.

## 6. Audio: comportamiento obligatorio
Estados idle, loading, playing, paused y error.
Solo una señal puede sonar. Cambio rápido A → B → C: únicamente C puede quedar activa; invalidar eventos/promesas de selecciones anteriores.
Navegación y filtros conservan la reproducción actual.
Gestionar play() rechazado por el navegador, espera excesiva, stream caído y pérdida de conexión; mostrar acción para reintentar o elegir otra estación.
Pausar una radio en directo no implica guardar el programa. Explicar el retorno al directo cuando corresponda.
No prometer título de canción si la fuente no lo entrega.
No descargar ni grabar música.
No garantizar reproducción en segundo plano en todos los móviles sin pruebas.

## 7. Criterios de aceptación E1
- Inicio y explorador conectados, con dirección visual reconocible.
- Selección de destinos reales y estaciones verificadas con evidencia y fecha.
- El globo enfoca correctamente el destino.
- Iniciar reproducción audible en navegador compatible.
- No hay audio simultáneo ni cambio de estación por respuestas atrasadas.
- Mover el globo y abrir otro destino no interrumpe lo que suena.
- Señal caída y rechazo de autoplay producen salida comprensible.
- Usable en escritorio y viewport móvil; informar qué dispositivos reales se verificaron.
- Build y tipos correctos; pruebas focalizadas en lógica de audio, caché y errores.
- README con comandos ejecutados de instalación, desarrollo, validación y build.
- Ningún secreto ni dependencia generada en Git.

## 8. Despliegue
Preparar la aplicación para servir web y API juntas en un servidor Node. El alojamiento concreto sigue pendiente; no asumir acceso al VPS del usuario.
Mantener configuración mediante variables documentadas en .env.example sin valores secretos.
Tras validación, acordar destino y conectar radio.jrgblanco.com con HTTPS.
No anunciar costes, fecha de entrega o disponibilidad pública como confirmados sin evidencia.

## 9. Referencias
- https://globe.gl/
- https://docs.radio-browser.info/
- https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay

Las dos imágenes aprobadas están en el chat. No están versionadas aquí; pedirlas si se necesita comparación visual exacta. Esto no bloquea la primera implementación basada en estas especificaciones.
