# RadioPirata — Claude Code Project Context

## What is this
Explorador de emisoras reales del mundo sobre un globo, para escucharlas con pocos pasos. Para quien vive fuera es la radio local de casa. Proyecto propio JRGB bajo el Manifiesto SDD-JRGB; cuaderno en Notion: Proyecto Radio → Radio Pirata → **Radio Pirata 1.0**.

## Current State
Fase 1 en curso. E1 a E4 entregadas (20-21 sep 2026) y en `main`. **No publicada**: destino decidido Servidor 2, offset +240 (puerto 3240), dominio `radio.jrgblanco.com`. Despliegue pendiente de ejecutar según `docs/DESPLIEGUE.md`. 172 pruebas (83 server, 89 web).

## Tech Stack
React 19 + TypeScript + Vite + Globe.gl (three.js) · Node 22 + Express 5 + TypeScript · Radio Browser como catálogo · sin base de datos ni cuentas (favoritas y recientes en `localStorage` versionado, ADR-001) · Docker Compose en la infra JRGB.

## Project Structure
```
server/   API y servidor web en un solo proceso. src/catalogo.ts (búsqueda, noticias, caché),
          src/radioBrowser.ts (adaptador), src/tarjeta.ts (Open Graph), data/ (índice de
          ciudades y selección comprobada con fecha), scripts/ (generar/verificar selección).
web/      src/audio/ (controlador único, cola, temporizador), src/componentes/ (Inicio,
          Explorador, Globo, Reproductor, RelojLaminas…), src/util/ (ruta, sol, hora, filtros).
docs/     ENCARGO.md, DESPLIEGUE.md, VERIFICACION-E1..E4.md, SINCRONIZACION.md.
deploy/   nginx y systemd de ejemplo.   tasks/todo.md   AGENTS.md (reglas del agente)
```

## Key Patterns
- Un solo `HTMLAudioElement` fuera de React; cada selección invalida la anterior por generación. Solo la última puede sonar.
- Honestidad antes que relleno: lo comprobado a mano lleva sello; lo del catálogo se dice; una ciudad vacía no se rellena con el país; «En directo» solo tras reproducción efectiva; no se muestran controles que no funcionen.
- «Es radio, no hace falta»: sin títulos de canción, visualizadores ni paneles. Cada cosa nueva debe acercar a casa.
- Solo emisoras reproducibles: HTTPS, sin HLS, sin formatos que el navegador no abre.
- Los fallos del catálogo no se cachean. Las peticiones en paralelo no comparten rotación de servidores.
- Estado en la URL (`?lugar=`, `?q=`, `?noticias=`, `?emisora=`); el servidor inyecta título y Open Graph por ruta.
- Comprobar siempre contra el build de producción (`npm run build` + `npm start`) y documentar en `docs/VERIFICACION-*.md` lo que **no** se pudo comprobar.

## Deploy
```bash
# local
npm install && npm run typecheck && npm test && npm run build && npm start   # http://localhost:3001

# Servidor 2 (staging JRGB), ver docs/DESPLIEGUE.md
ssh root@100.110.52.22 && cd /opt/apps/radiopirata && git pull && docker compose up -d --build
docker ps | grep radiopirata && ss -tlnp | grep docker-proxy | grep '0.0.0.0'   # lo segundo debe estar vacío
curl -s http://127.0.0.1:3240/api/salud
# después: nginx vhost + certbot para radio.jrgblanco.com, registrar en healthcheck.sh y SA99
```
El servidor lee `web/dist/index.html` una sola vez al arrancar: tras cada build hay que reiniciar el contenedor.
