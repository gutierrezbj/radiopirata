# Desplegar RadioPirata

Preparado el 2026-09-21. **Nada de esto se ha ejecutado contra un servidor real**: no hay alojamiento elegido ni acceso a ninguna máquina. Son las instrucciones para cuando JuanCho decida dónde va y dé la indicación de publicar.

## Qué hace falta

| | |
|---|---|
| Node | 22.12 o superior (probado con 22.15) |
| Memoria | el proceso ronda los 100 MB; con 512 MB sobra |
| Disco | menos de 300 MB con dependencias de ejecución |
| Base de datos | ninguna |
| Secretos | ninguno: no hay cuentas ni claves |
| Salida a internet | HTTPS hacia `*.api.radio-browser.info` y resolución DNS de registros SRV para `_api._tcp.radio-browser.info` |
| Entrada | un puerto HTTP (3001 por defecto) detrás de un proxy con HTTPS |

El audio **no pasa por el servidor**: va del servidor de cada emisora al navegador. Por eso el ancho de banda del alojamiento no depende de cuánta gente esté escuchando, solo de las consultas al catálogo, que además van con caché.

## Un solo proceso

`npm start` levanta la API y sirve la web compilada desde el mismo origen. No hay dos servicios que coordinar ni CORS que configurar.

```bash
npm ci --omit=dev
npm run build
npm start
```

`npm run build` necesita las dependencias de desarrollo, así que en una máquina de producción lo normal es construir con todas (`npm ci`), construir y luego podar (`npm prune --omit=dev`), o construir la imagen Docker que ya hace ese reparto.

## Variables

Todas están en [.env.example](../.env.example) y ninguna es secreta. Las que importan al desplegar:

| Variable | Para qué |
|---|---|
| `PORT` | puerto de escucha |
| `WEB_DIST` | ruta al build de la web, relativa al directorio de trabajo del proceso |
| `TRUST_PROXY` | número de proxies por delante; con nginx delante, `1` |
| `HSTS` | `1` solo cuando el dominio ya sirva HTTPS correctamente |
| `RADIO_BROWSER_USER_AGENT` | identificador que pide la documentación de Radio Browser |

**Cuidado con `HSTS`.** Activarlo antes de tener el certificado deja a los navegadores obligados a usar HTTPS durante un año, y si el certificado no está, no se puede entrar. Se activa después de comprobar que HTTPS funciona.

## Opción A — systemd y nginx

1. Crear un usuario sin shell y colocar el repositorio en `/srv/radiopirata`.
2. Construir dentro: `npm ci && npm run build && npm prune --omit=dev`.
3. Copiar `.env.example` a `/srv/radiopirata/.env` y ajustar `TRUST_PROXY=1`.
4. Instalar [deploy/radiopirata.service](../deploy/radiopirata.service) en `/etc/systemd/system/`, recargar y arrancar.
5. Instalar [deploy/nginx-radiopirata.conf](../deploy/nginx-radiopirata.conf), de momento **solo el bloque del puerto 80**, y recargar nginx.

Comprobación antes de seguir:

```bash
curl -s http://127.0.0.1:3001/api/salud
```

Debe responder `{"ok":true,...}` con el número de destinos y de lugares.

## Opción B — Docker

```bash
docker build -t radiopirata .
```

```bash
docker run -d --name radiopirata -p 127.0.0.1:3001:3001 -e TRUST_PROXY=1 --restart unless-stopped radiopirata
```

La imagen trae comprobación de salud propia, corre como usuario sin privilegios y recibe `SIGTERM` directamente, así que `docker stop` cierra las conexiones abiertas en vez de cortarlas.

## DNS

El dominio previsto es `radio.jrgblanco.com`. Hace falta **un registro A** apuntando a la IP pública del servidor, y un **AAAA** si la máquina tiene IPv6.

| Tipo | Nombre | Valor | TTL |
|---|---|---|---|
| A | `radio` | IP pública del servidor | 300 mientras se prueba, luego 3600 |
| AAAA | `radio` | IPv6 del servidor, si la hay | igual que el A |

Un TTL bajo durante las pruebas permite corregir rápido; se sube cuando todo esté estable.

Comprobar antes de pedir el certificado, porque Let's Encrypt validará por HTTP contra esa IP:

```bash
dig +short radio.jrgblanco.com A
```

## HTTPS

Con el DNS resuelto y nginx sirviendo el puerto 80:

```bash
sudo certbot --nginx -d radio.jrgblanco.com
```

Certbot escribe los certificados y añade la configuración TLS. Después:

1. Activar el bloque `443` de la configuración de nginx y recargar.
2. Comprobar `https://radio.jrgblanco.com/api/salud` desde fuera.
3. Solo entonces, poner `HSTS=1` en el `.env` y reiniciar el servicio.

La renovación la hace el temporizador de certbot; conviene comprobarla una vez con `sudo certbot renew --dry-run`.

## Cabeceras que ya envía la aplicación

No hace falta añadirlas en nginx; el propio servidor manda `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` y `Cross-Origin-Opener-Policy`. La política de contenidos permite audio desde cualquier origen HTTPS, que es justo lo que necesita una radio, y nada más de fuera.

## Actualizar y volver atrás

Cada versión es un commit. Para actualizar: traer el commit, construir, reiniciar el servicio. Para volver atrás: `git checkout <commit anterior>`, construir y reiniciar. Los ficheros de la web llevan un hash en el nombre y se cachean un año; `index.html` no se cachea, así que el cambio se ve de inmediato sin que nadie tenga que vaciar nada.

## Qué vigilar

- `GET /api/salud` para la comprobación de vida.
- Los registros del proceso: cuando Radio Browser falla, la aplicación lo dice en la respuesta y sigue sirviendo lo comprobado a mano.
- Si el catálogo estuviera caído mucho tiempo, las ciudades aparecerían con pocas emisoras o vacías. No es un fallo del servidor.

## Lo que no está decidido ni hecho

- **No hay alojamiento elegido.** No se ha contratado nada ni se ha entrado en ninguna máquina.
- **No se ha tocado el DNS** de `jrgblanco.com`.
- **No se ha publicado.** Hace falta la indicación expresa de JuanCho.
- No hay copias de seguridad que planear: el estado vive en el navegador de cada persona.
- No se ha medido el consumo con tráfico real, porque no ha habido tráfico real.
