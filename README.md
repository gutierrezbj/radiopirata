# RadioPirata

¿Dónde escuchamos hoy?

Una web para descubrir y escuchar emisoras del mundo mediante un globo interactivo.
La música siempre es buena compañía.

## Estado

**E1 implementada (2026-09-20).** Recorrido completo: inicio → destino (Tokio, Caracas o Lisboa) → lista de emisoras reales → escuchar → seguir explorando sin cortar el audio. Selección pequeña de 11 emisoras verificadas con fecha; evidencia en [docs/VERIFICACION-E1.md](docs/VERIFICACION-E1.md). Sin favoritos, filtros ni búsqueda global todavía (E2). No está publicada (E3).

- Encargo y arquitectura: [AGENTS.md](AGENTS.md), [docs/ENCARGO.md](docs/ENCARGO.md).
- Progreso y pendientes: [tasks/todo.md](tasks/todo.md).
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

Scripts de la selección de emisoras (necesitan red):

```bash
npm run seleccion:generar
```

Consulta Radio Browser por UUID y reescribe `server/data/seleccion-e1.json` con fecha.

```bash
npm run seleccion:verificar
```

Sondea cada emisora por HTTP con User-Agent de navegador y escribe `docs/VERIFICACION-E1.md`.

## Resultados de la última validación (2026-09-20)

| Comprobación | Resultado |
|---|---|
| `npm run typecheck` | sin errores (server y web) |
| `npm test` | 21 pruebas en server, 19 en web, todas en verde |
| `npm run build` | correcto; el globo (globe.gl + three) va en un trozo aparte de ~2 MB que solo se carga al entrar al explorador |
| Emisoras accesibles por HTTP | 11 de 11 |
| Emisoras que reproducen en Chromium | 11 de 11 (1 candidata retirada por no reproducir) |
| Dispositivos | Windows 11 con el navegador integrado de Claude desktop (Chromium), escritorio y emulación móvil 375×812 |

Detalle, limitaciones y lo que no se pudo probar: [docs/VERIFICACION-E1.md](docs/VERIFICACION-E1.md).

## Estructura

```
server/   API Node + Express (TypeScript). Adaptador de Radio Browser, caché acotada, selección E1 con fecha.
web/      React + TypeScript + Vite. Inicio, explorador con Globe.gl, panel de emisoras y reproductor único.
docs/     Encargo, sincronización y verificación.
tasks/    Progreso.
```

Piezas clave:

- `web/src/audio/controlador.ts`: único controlador de audio. Un `HTMLAudioElement` persistente fuera de React; cada selección invalida la anterior por generación, así que en un cambio rápido A → B → C solo C puede quedar activa. Estados `idle`, `loading`, `playing`, `paused`, `error`, con mensajes para autoplay bloqueado, espera excesiva, señal caída, formato no admitido y pérdida de conexión.
- `server/src/radioBrowser.ts`: descubrimiento de servidores por DNS SRV, User-Agent propio, timeout, cambio de servidor ante fallo y registro de clic solo al empezar a escuchar.
- `server/src/catalogo.ts`: refresca la selección desde Radio Browser con caché de 15 minutos; si el proveedor falla, sirve la copia local con fecha y lo dice en la respuesta.
- `server/data/seleccion-e1.json`: copia de la selección inicial generada el 2026-09-20.

## Configuración

Variables documentadas en [.env.example](.env.example): puerto, ruta del build de la web, User-Agent, timeout de Radio Browser y tamaño/vida de la caché. Ningún valor es secreto.

## Decisiones y límites de E1

- El audio va directo del servidor de la emisora al navegador; la API nunca lo transporta ni hay proxy.
- Solo URLs HTTPS con MP3/AAC nativos. Las señales HLS (`.m3u8`) se descartaron en esta selección; se añadirá soporte si hace falta y tras verificarlo por navegador.
- La ciudad de cada emisora es la que declara Radio Browser (`state`), mostrada tal cual; no se etiqueta por país ni se inventan coordenadas. Las emisoras sin coordenadas aparecen en la lista sin punto en el globo.
- Los destinos tienen coordenadas propias del índice (centro aproximado de la ciudad) y sirven para enfocar el globo, no para situar cada emisora.
- Pausar una radio en directo no guarda nada: al reanudar se reconecta la señal y la interfaz lo dice.
- El estado «En directo» aparece solo tras reproducción efectiva (evento `playing`).
- Sin WebGL, se muestran la lista y el reproductor sin globo. Con `prefers-reduced-motion`, sin animación de cámara ni transiciones.
- Los mockups aprobados siguen sin versionarse; E1 se implementó a partir de la especificación visual del encargo.

## Documentación técnica

- https://globe.gl/
- https://docs.radio-browser.info/
- https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay
