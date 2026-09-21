# RadioPirata

¿Dónde escuchamos hoy?

Una web para descubrir y escuchar emisoras del mundo mediante un globo interactivo.
La música siempre es buena compañía.

## Estado

**E1, E2 y E3 implementadas (2026-09-21).** Se busca en todo el catálogo por ciudad, país y estilo; hay un índice propio de 72 ciudades con coordenadas fiables, favoritas y recientes en el dispositivo, filtros por estilo y enlaces para compartir una emisora. La selección comprobada a mano de E1 sigue marcada como tal. El despliegue está preparado y documentado.

**No está publicada.** No hay alojamiento elegido, no se ha tocado el DNS y no se ha pedido ningún certificado. Publicar necesita la indicación de JuanCho y decidir dónde va.

- Encargo y arquitectura: [AGENTS.md](AGENTS.md), [docs/ENCARGO.md](docs/ENCARGO.md).
- Progreso y pendientes: [tasks/todo.md](tasks/todo.md).
- Cómo desplegarla: [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md).
- Evidencia: [E1](docs/VERIFICACION-E1.md), [E2](docs/VERIFICACION-E2.md) y [E3](docs/VERIFICACION-E3.md).
- Sincronización de la carpeta local: [docs/SINCRONIZACION.md](docs/SINCRONIZACION.md).
- Repositorio: https://github.com/gutierrezbj/radiopirata · Destino previsto: `radio.jrgblanco.com` (pendiente de configurar).

## Requisitos

- Node.js 22 (probado con 22.15.0; mínimo 22.12). Archivo `.node-version` incluido.
- npm 10 (workspaces).

## Comandos

Todos desde la raíz del repositorio.

```bash
npm install
```

```bash
npm run dev
```

Arranca la API en http://localhost:3001 y la web en http://localhost:5173 (Vite hace proxy de `/api` a la API).

```bash
npm run typecheck
```

```bash
npm test
```

```bash
npm run build
```

Genera `web/dist` (Vite) y `server/dist` (tsc). Ninguno se versiona.

```bash
npm start
```

Sirve la API y la web compilada desde el mismo origen (http://localhost:3001 por defecto). Necesita `npm run build` antes.

Scripts de la selección comprobada a mano (necesitan red):

```bash
npm run seleccion:generar
```

Consulta Radio Browser por UUID y reescribe `server/data/seleccion-e1.json` con fecha.

```bash
npm run seleccion:verificar
```

Sondea cada emisora por HTTP con User-Agent de navegador y actualiza `docs/VERIFICACION-E1.md` conservando las notas escritas a mano.

## Resultados de la última validación (2026-09-21)

| Comprobación | Resultado |
|---|---|
| `npm run typecheck` | sin errores (server y web) |
| `npm test` | 64 pruebas en server, 68 en web, todas en verde |
| `npm run build` | correcto |
| Peso de la página de inicio | 82 kB transferidos; el globo son otros 550 kB que solo se cargan al entrar al explorador |
| Contraste del tema | mínimo 6,6:1, muy por encima del 4,5:1 exigible |
| Cabeceras de seguridad | política de contenidos, `nosniff`, `DENY` en marcos y permisos recortados |
| Emisoras comprobadas a mano | 11 de 11 reproducen en Chromium |
| Dispositivos | Windows 11 con el navegador integrado de Claude desktop (Chromium), escritorio y emulación móvil 375×812 |

Detalle y limitaciones: [docs/VERIFICACION-E3.md](docs/VERIFICACION-E3.md). Lo que **no** se ha podido comprobar: Docker no está instalado en este equipo, así que el `Dockerfile` no se ha construido nunca; los ficheros de systemd y nginx no se han aplicado a ningún servidor; y sigue sin probarse en Firefox, Safari ni teléfonos físicos.

## Qué se puede hacer

- **Buscar** una ciudad, un país o un estilo. El texto se resuelve primero contra el índice propio de ciudades; si no es una ciudad exacta, se busca en el catálogo por nombre, estilo y país a la vez.
- **Abrir una ciudad** desde el buscador, desde los destinos comprobados o pinchando cualquiera de los 72 puntos del globo.
- **Filtrar por estilo** dentro de la lista que se está viendo. Solo se ofrecen los estilos que agrupan más de una emisora.
- **Guardar favoritas y ver recientes**, que se quedan en el navegador del dispositivo.
- **Compartir una emisora** con un enlace `?emisora=<id>` que abre su ficha.
- **Ver la sintonía**: un anillo alrededor del botón de reproducir que va de rojo a ámbar y a verde según entra la señal, como el dial de una radio. No es decoración: sale de `readyState`, que es lo que el navegador sabe sobre cuánto audio tiene ya listo. Si la señal falla, el anillo se cierra entero en rojo.
- **Pasar a la anterior o la siguiente** de la lista desde la que se eligió lo que suena.
- **Sorpréndeme**: una ciudad al azar del índice y una emisora al azar de esa ciudad.

## Estructura

```
server/   API Node + Express (TypeScript). Adaptador de Radio Browser, índice de ciudades,
          búsqueda, caché acotada, cabeceras de seguridad y selección comprobada con fecha.
web/      React + TypeScript + Vite. Inicio, explorador con Globe.gl, panel de emisoras,
          reproductor único y almacén local de favoritas y recientes.
deploy/   Ejemplos de systemd y nginx para servirla en una máquina propia.
docs/     Encargo, despliegue, sincronización y verificación.
tasks/    Progreso.
```

Piezas clave:

- `web/src/audio/controlador.ts`: único controlador de audio. Un `HTMLAudioElement` persistente fuera de React; cada selección invalida la anterior por generación, así que en un cambio rápido A → B → C solo C puede quedar activa. Estados `idle`, `loading`, `playing`, `paused`, `error`, con mensajes para autoplay bloqueado, espera excesiva, señal caída, formato no admitido y pérdida de conexión.
- `web/src/almacen/local.ts`: favoritas y recientes en `localStorage` con esquema versionado. Sanea cada entrada al leerla, descarta lo corrupto, empieza de cero ante otra versión y se marca como no disponible si el navegador no deja guardar.
- `web/src/util/ruta.ts`: el estado de la aplicación vive en la dirección, así que cualquier vista se puede compartir o recargar.
- `server/src/lugares.ts` y `server/data/ciudades.json`: índice propio de 72 ciudades, validado al arrancar.
- `server/src/radioBrowser.ts`: descubrimiento de servidores por DNS SRV, User-Agent propio, timeout, cambio de servidor sin interferir entre peticiones en paralelo y registro de clic solo al empezar a escuchar.
- `server/src/catalogo.ts`: búsqueda por nombre, estilo y país en paralelo, fusión sin repetidos, paginación en memoria y caché de 15 minutos que nunca guarda un fallo.

## API

| Ruta | Para qué |
|---|---|
| `GET /api/destinos` | los pocos destinos con emisoras comprobadas a mano |
| `GET /api/lugares` | índice propio de ciudades con coordenadas |
| `GET /api/lugares/:id/emisoras` | emisoras de una ciudad: comprobadas primero, catálogo después |
| `GET /api/buscar?q=&pagina=&pais=` | búsqueda por nombre, estilo y país; `pais` es el código ISO de dos letras |
| `GET /api/emisoras/:id` | una emisora, para abrir un enlace compartido |
| `POST /api/emisoras/:id/clic` | registro de escucha de Radio Browser, solo al empezar a sonar |

El audio nunca pasa por la API: va del servidor de la emisora al navegador.

## Configuración y despliegue

Variables documentadas en [.env.example](.env.example): puerto, ruta del build de la web, User-Agent, timeout de Radio Browser, tamaño y vida de la caché, proxies de confianza y HSTS. Ningún valor es secreto: RadioPirata no usa claves ni cuentas.

`npm start` sirve la web y la API en el mismo proceso y el mismo origen. Hay un [Dockerfile](Dockerfile) y ejemplos de [systemd](deploy/radiopirata.service) y [nginx](deploy/nginx-radiopirata.conf). Los pasos completos, incluidos DNS y HTTPS, están en [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md).

## Decisiones y límites

- El audio va directo del servidor de la emisora al navegador; la API nunca lo transporta ni hay proxy.
- Solo se ofrecen emisoras que pueden sonar: HTTPS, sin HLS y sin formatos que ningún navegador abre (FLV, WMA, ASF, RTMP, DASH). Eso deja fuera emisoras conocidas y es a propósito, para no enseñar un botón que falla.
- Las emisoras del catálogo no están comprobadas una a una. Si una falla, el reproductor lo dice y se puede reintentar o pasar a la siguiente.
- La ubicación de cada emisora es la que declara Radio Browser, mostrada tal cual. Su campo es una región, así que una ciudad puede traer emisoras de su entorno; la nota del panel lo advierte.
- Una ciudad sin emisoras no se rellena con emisoras de su país: el país no prueba la ciudad.
- Las coordenadas del índice propio son el centro aproximado de cada ciudad y solo sirven para enfocar el globo.
- Favoritas y recientes no salen del dispositivo: no hay cuentas ni sincronización.
- Pausar una radio en directo no guarda nada: al reanudar se reconecta la señal y la interfaz lo dice.
- El estado «En directo» aparece solo tras reproducción efectiva.
- Sin WebGL se muestran la lista y el reproductor sin globo. Con `prefers-reduced-motion`, sin animación de cámara ni transiciones.
- Una búsqueda devuelve como mucho 120 emisoras, de 24 en 24.
- Los mockups aprobados siguen sin versionarse; la interfaz se hizo a partir de la especificación visual del encargo.

## Documentación técnica

- https://globe.gl/
- https://docs.radio-browser.info/
- https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay
