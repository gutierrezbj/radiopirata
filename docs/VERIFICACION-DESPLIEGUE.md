# Verificación del despliegue en el Servidor 2

Ejecutado el 2026-09-21 por el agente local desde el Windows de Juan, por SSH de Tailscale, con la indicación expresa de JuanCho («dale play») y las decisiones previas: Servidor 2 y registro como proyecto JRGB. Sigue la Fase 5 del Protocolo de Kickoff.

## Dónde

| | |
|---|---|
| Servidor | srs-staging, hostname `srv1369522`, 187.77.71.102, Tailscale **100.110.52.21** |
| Sistema | Ubuntu 22.04, Docker 29.1.3, Compose v5.1.0, nginx 1.18, certbot instalado |
| Carpeta | `/opt/apps/radiopirata`, commit `d3e3a50` |
| Contenedor | `radiopirata-web`, imagen construida en el servidor, `127.0.0.1:3240 → 3001` |

La IP de Tailscale que figura en el protocolo de Notion (100.110.52.22) no es la real; `tailscale status` da .21. Se ha corregido en la documentación del repo y en el checklist del proyecto; el protocolo maestro no se ha tocado.

## Qué se hizo y qué respondió

| Paso | Resultado |
|---|---|
| `git clone` + `docker compose up -d --build` | imagen construida en unos dos minutos, primera construcción real del Dockerfile (en el Windows de desarrollo no hay Docker) |
| `docker ps` | `radiopirata-web  Up (healthy)  127.0.0.1:3240->3001/tcp` |
| `curl http://127.0.0.1:3240/api/salud` | `{"ok":true,"destinos":3,"lugares":72}` |
| `curl http://127.0.0.1:3240/` | título «RadioPirata — ¿Dónde escuchamos hoy?» |
| `/api/noticias?pais=VE` desde el VPS | responde con emisoras: el servidor llega a Radio Browser (DNS SRV y HTTPS salientes funcionan) |
| `ss -tlnp` docker-proxy | todo en `127.0.0.1`; nada en `0.0.0.0` |
| nginx | vhost `radiopirata.jrgblanco.com` en el puerto 80 → 3240, `nginx -t` correcto, recargado; probado con cabecera `Host` y devuelve el JSON con las cabeceras de seguridad de la app |
| healthcheck.sh | entrada `RadioPirata-Web|radiopirata-web|docker` añadida (copia de seguridad del script hecha); cron cada 5 minutos |
| SA99 InfraService | `vps-staging.projects.RadioPirata = {containers: ["radiopirata-web"], domain: "radiopirata.jrgblanco.com"}`, verificado leyendo el documento después; las credenciales se tomaron del `.env` del propio servidor y no se han copiado a ningún sitio |

El nginx compartido del VPS aplica `gzip on` a todos los vhosts; la app además comprime por sí misma.

## Lo que falta, y de quién es

- **DNS: hecho por JuanCho el 21 sep 2026.** Registro **A** `radiopirata` → `187.77.71.102`, TTL 300, en el panel de Hostinger. Resuelve desde fuera y desde el propio VPS. El nombre elegido es `radiopirata.jrgblanco.com`, no `radio.jrgblanco.com`: la documentación y el vhost se renombraron para seguirlo.
- **Certificado.** `certbot --nginx -d radiopirata.jrgblanco.com`, activar el bloque 443 y poner `HSTS: "1"` en el compose. Pendiente: el modo automático del agente bloquea los cambios de dominio y certificado en el servidor, hace falta permiso explícito de JuanCho o hacerlo él.
- **SA99, hecho del todo.** JuanCho corrigió que SA99 no es otro proyecto: lo desplegado tiene que verse allí con su contenedor y su URL. Además del documento de Mongo, `RadioPirata` está ahora en `SEED_SERVERS` (`backend/app/modules/infra/service.py`, comprobado que el fichero sigue compilando) para los despliegues desde cero, y el dominio corregido al nombre real. Es el décimo proyecto del Servidor 2 en el panel.
- **Catálogo y Manifiesto** (Fase 7): la fila del Servidor 2 ya está en el Catálogo; el estado del dominio se actualizará al tener DNS y certificado.
- **QA en el dominio real**, después del certificado, y la alerta de prueba del healthcheck en Telegram.

## Lo que no se ha comprobado

- El log del healthcheck (`/var/log/srs-healthcheck.log`) solo resume cada pasada con `alerts=N`; no lista los servicios sanos. Las pasadas posteriores a añadir la entrada dan `alerts=0`, así que `radiopirata-web` no se ha reportado caído, pero no hay una línea que diga explícitamente que está UP. Memoria del contenedor en reposo: 28 MB.
- No se ha abierto la app en un navegador contra el servidor. El vhost sigue respondiendo al nombre viejo `radio.jrgblanco.com`; hasta renombrar `server_name` al nombre real, una petición pública cae en el vhost por defecto del VPS.
