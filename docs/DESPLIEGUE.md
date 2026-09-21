# Desplegar RadioPirata en la infra JRGB

Reescrito el 2026-09-21 contra el Protocolo de Kickoff y el Catálogo de Infraestructura JRGB de Notion, y con dos decisiones de JuanCho de ese día: va al **Servidor 2** y se registra como proyecto JRGB (cuaderno: Proyecto Radio → Radio Pirata → Radio Pirata 1.0).

**Nada de esto se ha ejecutado todavía.** No se ha entrado en el servidor, no se ha tocado el DNS ni se ha pedido certificado. Docker no está instalado en el Windows de desarrollo, así que la imagen nunca se ha construido: la primera construcción real será en el Servidor 2.

## Lo reservado

| | |
|---|---|
| Servidor | **Servidor 2** (187.77.71.102, por Tailscale 100.110.52.22). Flujo «Demo/MVP: se queda ahí» |
| Offset | **+240** en el Catálogo (Sección 4). Puerto **3240** → contenedor 3001. El 4240 queda sin uso: la API va bajo `/api` en el mismo proceso |
| Dominio | `radio.jrgblanco.com` |
| Carpeta | `/opt/apps/radiopirata` |
| Contenedor | `radiopirata-web` (definido en `docker-compose.yml`) |

## Qué necesita

- Salida HTTPS hacia `*.api.radio-browser.info` y resolución DNS de `_api._tcp.radio-browser.info` (SRV).
- Unos 100 MB de memoria y menos de 300 MB de disco. Sin base de datos, sin secretos.
- El audio **no pasa por el servidor**: va de cada emisora al navegador. El ancho de banda del VPS no depende de la audiencia.

## Fase 5 del Protocolo: deploy en Servidor 2

```bash
ssh root@100.110.52.22
cd /opt/apps
git clone https://github.com/gutierrezbj/radiopirata.git radiopirata
cd radiopirata
docker compose up -d --build
```

Comprobar, en este orden:

```bash
docker ps | grep radiopirata
```

```bash
ss -tlnp | grep docker-proxy | grep '0.0.0.0'
```

Lo segundo **debe estar vacío**: el puerto va atado a `127.0.0.1`.

```bash
curl -s http://127.0.0.1:3240/api/salud
```

Debe responder `{"ok":true,"destinos":3,"lugares":72}`.

## nginx y HTTPS

1. Copiar [deploy/nginx-radiopirata.conf](../deploy/nginx-radiopirata.conf) a `/etc/nginx/sites-available/radiopirata`, enlazar en `sites-enabled` y dejar **solo el bloque del puerto 80** hasta tener certificado. `nginx -t` y `systemctl reload nginx`.
2. DNS en el panel del registrador de `jrgblanco.com`: registro **A** `radio` → `187.77.71.102`, TTL 300 mientras se prueba. Comprobar con `dig +short radio.jrgblanco.com A`.
3. `certbot --nginx -d radio.jrgblanco.com`. Activar el bloque 443 y recargar.
4. Comprobar desde fuera `https://radio.jrgblanco.com/api/salud`.
5. Solo entonces, `HSTS: "1"` en `docker-compose.yml` y `docker compose up -d`.

El nginx compartido del VPS ya aplica gzip y brotli a todos los vhosts (estándar JRGB); la aplicación además comprime por sí misma. Endpoint más pesado: el trozo del globo, de 1 946 kB a 550 kB. La página de inicio son 82 kB transferidos.

## Registro obligatorio (sin esto, «no existe»)

- **healthcheck.sh** (`/opt/scripts/healthcheck.sh`): añadir el contenedor `radiopirata-web`. Esperar cinco minutos y confirmar que no aparece en «Sistema».
- **SA99 InfraService** (servidor `vps-staging`):

```javascript
db.servers.updateOne(
  { _id: "vps-staging" },
  { $set: { "projects.RadioPirata": { containers: ["radiopirata-web"], domain: "radio.jrgblanco.com" } } }
);
```

Y actualizar `SEED_SERVERS` en `service.py` del repo SA99 para despliegues desde cero.

- **Catálogo de Infraestructura**: Sección 2 (tabla de proyectos del Servidor 2) y Sección 7 (dominios). La Sección 4 ya tiene el +240.

## Actualizar y volver atrás

```bash
cd /opt/apps/radiopirata && git pull && docker compose up -d --build
```

Volver atrás es `git checkout <commit anterior>` y el mismo comando. No hay datos que restaurar: el estado vive en el navegador de cada persona. **Tras cada build hay que reiniciar el contenedor**: el servidor lee `index.html` una sola vez al arrancar.

## Alternativa sin Docker

[deploy/radiopirata.service](../deploy/radiopirata.service) es una unidad de systemd para una máquina con Node 22 y sin Docker. En la infra JRGB no hace falta: allí todo va en Compose.

## Verificación final

```bash
ss -tlnp | grep docker-proxy | grep '0.0.0.0'
```

```bash
curl -s -o /dev/null -w '%{http_code}' https://radio.jrgblanco.com/
```

```bash
docker ps | grep radiopirata
```

Y el recorrido a mano en el dominio real: inicio → Caracas → una emisora suena → cambiar de ciudad sin que se corte → enlace compartido pegado en WhatsApp muestra el nombre de la emisora.
