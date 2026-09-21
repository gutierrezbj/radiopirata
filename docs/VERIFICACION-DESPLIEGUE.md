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
| nginx | vhost `radio.jrgblanco.com` en el puerto 80 → 3240, `nginx -t` correcto, recargado; probado con cabecera `Host` y devuelve el JSON con las cabeceras de seguridad de la app |
| healthcheck.sh | entrada `RadioPirata-Web|radiopirata-web|docker` añadida (copia de seguridad del script hecha); cron cada 5 minutos |
| SA99 InfraService | `vps-staging.projects.RadioPirata = {containers: ["radiopirata-web"], domain: "radio.jrgblanco.com"}`, verificado leyendo el documento después; las credenciales se tomaron del `.env` del propio servidor y no se han copiado a ningún sitio |

El nginx compartido del VPS aplica `gzip on` a todos los vhosts; la app además comprime por sí misma.

## Lo que falta, y de quién es

- **DNS.** `radio.jrgblanco.com` no existe todavía; el dominio `jrgblanco.com` está aparcado en Hostinger (`dns-parking.com`, 2.57.91.91). Hace falta un registro **A** `radio` → `187.77.71.102` en el panel del registrador. **Lo hace JuanCho.**
- **Certificado.** Cuando el DNS resuelva: `certbot --nginx -d radio.jrgblanco.com`, activar el bloque 443 y poner `HSTS: "1"` en el compose.
- **SEED_SERVERS** en `service.py` del repo SA99, para despliegues desde cero. Es otro proyecto y no se toca desde aquí; queda anotado.
- **Catálogo y Manifiesto** (Fase 7): la fila del Servidor 2 ya está en el Catálogo; el estado del dominio se actualizará al tener DNS y certificado.
- **QA en el dominio real** y la alerta de prueba del healthcheck en Telegram, que solo se pueden ver con el DNS puesto y tras el primer paso del cron.

## Lo que no se ha comprobado

- El log del healthcheck (`/var/log/srs-healthcheck.log`) solo resume cada pasada con `alerts=N`; no lista los servicios sanos. Las pasadas posteriores a añadir la entrada dan `alerts=0`, así que `radiopirata-web` no se ha reportado caído, pero no hay una línea que diga explícitamente que está UP. Memoria del contenedor en reposo: 28 MB.
- No se ha abierto la app en un navegador contra el servidor: por ahora solo responde en `127.0.0.1` del VPS y por nginx con cabecera `Host`, porque no hay DNS.
