# RadioPirata — Claude Code Project Context

Este repo sigue el **Protocolo de Coding Session JRGB** (5.º Protocolo Maestro): https://app.notion.com/p/3577981f08ef81049a35fc3ec8e24a6b. Cuaderno del producto en Notion: Proyecto Radio → Radio Pirata → **Radio Pirata 1.0** (https://app.notion.com/p/3e27981f08ef81308191f565b206b17d).

---

## Capa global — Protocolo de Coding Session JRGB

### Las 6 reglas operativas
1. **Plan First.** Modo plan para cualquier tarea de 3+ pasos o con decisión arquitectónica. Si algo se desvía, parar y replanificar. También se planifica la verificación.
2. **Subagent Strategy.** Descargar research, exploración de código y lecturas externas a subagentes, uno por objetivo. Opcional en este producto, que es compacto.
3. **Self-Improvement Loop.** Tras cualquier corrección del usuario, escribir el patrón en `tasks/lessons.md`. Leer ese fichero al empezar cada sesión. Mirror semanal a Notion («Lessons Aprendidas» del cuaderno).
4. **Verification Before Done.** Nada se marca hecho sin probarlo: tipos, pruebas, build y recorrido real contra el build de producción. Pregunta de cierre: «¿Aprobaría esto un staff engineer?».
5. **Demand Elegance Balanced.** En cambios no triviales, pausa y preguntar si hay una forma más elegante. Sin sobreingeniería en lo simple.
6. **Autonomous Bug Fixing.** Ante un bug, arreglarlo desde el log y las pruebas, sin pedir explicaciones que ya están ahí.

### Flujo de cada sesión
Plan en `tasks/todo.md` con items chequeables → validar el plan si no es trivial → marcar progreso → explicar cambios a alto nivel → sección de revisión al cerrar → capturar lecciones en `tasks/lessons.md`.

### Principios
**Simplicity First** (cambio mínimo) · **No Laziness** (causa raíz, no parche) · **Minimal Impact** (tocar solo lo necesario).

### Design System JRGB
Sin defaults genéricos de Tailwind, Shadcn ni Material. Identidad propia del producto en `DESIGN.md`. Fondo con personalidad, un primario por vista, motion con propósito y nunca lineal, contraste AA medido.

---

## Capa específica — RadioPirata

### Qué es
Explorador de emisoras reales del mundo sobre un globo, para escucharlas con pocos pasos. Para quien vive fuera es la radio local de casa. Producto propio de JuanCho bajo el Manifiesto SDD-JRGB; primer proyecto JRGB puro por el Protocolo de Kickoff.

### Estado
Fase 1 en curso. E1 a E4 entregadas (20-21 sep 2026) en `main`. **Desplegada en Servidor 2 el 21 sep 2026** (`/opt/apps/radiopirata`, contenedor `radiopirata-web` en 127.0.0.1:3240, vhost nginx en :80, registrada en healthcheck.sh y SA99). **Pendiente**: DNS de `radio.jrgblanco.com` (panel del registrador, lo hace Juan), Certbot y HSTS. Ver `docs/DESPLIEGUE.md`. 172 pruebas (83 server, 89 web).

### Stack
React 19 + TypeScript + Vite + Globe.gl (three.js) · Node 22 + Express 5 + TypeScript · Radio Browser como catálogo · **sin base de datos ni cuentas** (ADR-001: favoritas y recientes en `localStorage` versionado) · **un solo proceso** sirve web y API (ADR-002).

### Infraestructura
- Offset **+240**: puerto **3240** → contenedor 3001 (web + `/api`). 4240 reservado sin uso.
- Servidor 2 (187.77.71.102, Tailscale 100.110.52.21, hostname srv1369522), `/opt/apps/radiopirata`, `docker-compose.yml` con `127.0.0.1:3240:3001`.
- nginx vhost `deploy/nginx-radiopirata.conf` + Certbot. Contenedor `radiopirata-web` a registrar en `healthcheck.sh` y en SA99 (`vps-staging`).
- Sin secretos. Variables en `.env.example`.

### Integraciones
Radio Browser (https://docs.radio-browser.info/): descubrimiento DNS SRV, User-Agent descriptivo, clic registrado solo al empezar a sonar. Ningún otro servicio externo. El audio va de cada emisora al navegador, nunca por la API.

### Estructura
```
server/   src/app.ts, catalogo.ts, radioBrowser.ts, lugares.ts, tarjeta.ts, cabeceras.ts,
          validacion.ts · data/ (ciudades.json, seleccion-e1.json) · scripts/ · test/
web/      src/audio/ (controlador, cola, temporizador, instancia) · src/componentes/ ·
          src/util/ (ruta, sol, hora, filtros, lugares) · src/almacen/ · test/
docs/     ENCARGO.md, DESPLIEGUE.md, VERIFICACION-E1..E4.md, SINCRONIZACION.md
deploy/   nginx y systemd de ejemplo · tasks/todo.md · tasks/lessons.md · DESIGN.md · AGENTS.md
```

### Convenciones del producto
- Código e interfaz en **español**, nombres sin abreviar.
- Un solo `HTMLAudioElement` fuera de React; toda reproducción pasa por `reproducirDesde(emisora, lista)`; cada selección invalida la anterior por generación.
- **Honestidad**: lo comprobado a mano lleva sello; lo del catálogo se dice; una ciudad vacía no se rellena con el país; «En directo» solo tras `playing`; no se muestran controles que no funcionen.
- **«Es radio, no hace falta»**: sin títulos de canción, visualizadores ni paneles. Cada añadido debe acercar a casa.
- Solo emisoras reproducibles (HTTPS, sin HLS, sin FLV/WMA/ASF/RTMP/DASH). Los fallos del catálogo no se cachean.
- Estado en la URL; el servidor inyecta título y Open Graph por ruta; todo lo externo se escapa.
- Verificar contra el build de producción y documentar en `docs/VERIFICACION-*.md` lo que **no** se pudo comprobar.

### Comandos
```bash
npm install && npm run typecheck && npm test && npm run build && npm start   # http://localhost:3001
npm run dev                                                                    # API :3001 + web :5173
npm run seleccion:generar && npm run seleccion:verificar                       # selección comprobada (red)

# Servidor 2 (ver docs/DESPLIEGUE.md)
ssh root@100.110.52.21 && cd /opt/apps/radiopirata && git pull && docker compose up -d --build
docker ps | grep radiopirata && ss -tlnp | grep docker-proxy | grep '0.0.0.0'   # lo segundo, vacío
curl -s http://127.0.0.1:3240/api/salud
```
Tras cada build hay que reiniciar el proceso o el contenedor: el servidor lee `index.html` una sola vez.
