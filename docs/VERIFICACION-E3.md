# Verificación de E3 — Preparación pública

Sesión del 2026-09-21 (agente local). Continúa [VERIFICACION-E1.md](VERIFICACION-E1.md) y [VERIFICACION-E2.md](VERIFICACION-E2.md).

- Equipo: portátil Windows 11 Home (10.0.26200), Node 22.15.0.
- Navegador: panel integrado del Claude desktop (motor Chromium), escritorio y emulación móvil 375×812.
- Todo se comprobó contra el **build de producción** servido por el propio servidor Node, no contra el servidor de desarrollo.

## Rendimiento

Lo que descarga de verdad el navegador, ya comprimido por el servidor:

| Recurso | Sin comprimir | Transferido |
|---|---|---|
| `index.html` | 0,7 kB | 0,7 kB |
| Aplicación (JS) | 252 kB | 79 kB |
| Estilos | 11 kB | 3 kB |
| Globo (JS, carga aparte) | 1 946 kB | 550 kB |

**La página de inicio pesa unos 82 kB.** Se comprobó en una pestaña limpia que solo pide `index.html`, el JS de la aplicación, los estilos y dos llamadas a la API: el trozo del globo no se descarga hasta entrar al explorador. Esos 550 kB son el precio de dibujar un globo real y solo lo paga quien llega a verlo.

Otras medidas tomadas en esta entrega:

- Compresión activada en el servidor, que es lo que convierte 1 946 kB en 550 kB.
- Los ficheros con hash se sirven con caché de un año e `immutable`; `index.html` sin caché, para que un despliegue se vea al instante.
- El globo adapta la densidad de píxeles al equipo: hasta 2× en escritorio holgado, 1,5× en pantallas pequeñas o con cuatro núcleos o menos.
- El globo deja de dibujarse tras tres segundos sin tocarlo y despierta con cualquier interacción, al cambiar de lugar o al volver a la pestaña. Comprobado: tras seis segundos quieto, arrastrar el globo lo mueve con normalidad.

## Accesibilidad

Contraste medido sobre los tokens del tema (mínimo exigible 4,5:1 para texto):

| Combinación | Contraste |
|---|---|
| Texto sobre fondo | 16,3:1 |
| Texto sobre superficie | 14,1:1 |
| Secundario sobre fondo | 8,6:1 |
| Secundario sobre superficie alta | 6,6:1 |
| Acento sobre fondo | 11,8:1 |
| Texto oscuro sobre acento | 11,8:1 |
| Verde de «en directo» sobre superficie | 8,9:1 |

Ninguna combinación baja de 6,6:1. El amarillo nunca es el único indicador: «En directo» lleva punto verde y palabra, el sello «comprobada» lleva texto, y los filtros y destinos activos usan `aria-pressed` y `aria-current` además del color.

Comprobado en esta sesión:

- Orden de tabulación en el inicio: «Mis favoritas», buscador, «Explorar», Tokio, Caracas, Lisboa. Sin saltos raros ni trampas de foco.
- Al cambiar de vista, el foco pasa al encabezado del panel. Comprobado: tras abrir Caracas, el elemento con foco es el título «Caracas».
- Al abrir un enlace directo **no** se toca el foco, que se queda donde lo pone el navegador. Así quien llega por un enlace compartido puede tabular desde el principio.
- El título de la pestaña cambia con la vista («Caracas, Venezuela · RadioPirata», «Búsqueda: fado · RadioPirata») y hay un aviso invisible con el nombre de la vista para lectores de pantalla.
- El globo es decorativo (`aria-hidden`) y todo lo que hace se puede hacer también desde el buscador y las listas.

## Fallos de proveedor y de señal

| Caso forzado | Qué hizo la aplicación |
|---|---|
| Emisora que devuelve una página web en vez de audio (Free FM 80 Tokyo) | «Sin señal» en la lista, «Este navegador no puede reproducir esta señal» en el reproductor, botón «Reintentar» y botón «siguiente» disponible para pasar de ella |
| Lugar que no existe en el índice (`?lugar=atlantida`) | encabezado «Lugar desconocido», mensaje «Ese lugar no está en nuestro índice de ciudades» y «Reintentar» |
| Emisora compartida no reproducible | «Esa emisora ya no está disponible o no se puede reproducir aquí» |
| Catálogo caído (en pruebas, cliente sin red) | las emisoras comprobadas a mano siguen apareciendo y la nota dice que falta el resto |

## Seguridad de la entrega

Cabeceras comprobadas con `curl` contra el servidor de producción:

- `Content-Security-Policy` con `script-src 'self'`, `connect-src 'self'`, `frame-ancestors 'none'` y `media-src https:`, que es lo único que necesita abrirse al exterior porque el audio viene de cada emisora.
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` sin cámara, micrófono, ubicación ni pagos, y `Cross-Origin-Opener-Policy: same-origin`.
- `Strict-Transport-Security` **solo** si se activa `HSTS=1`, que se deja apagado hasta que el dominio sirva HTTPS de verdad.
- No se envía `X-Powered-By`.

## Un defecto encontrado y corregido durante la verificación

La política de contenidos con `style-src 'self'` bloqueaba los estilos que la librería del globo escribe en sus elementos para colocar la información al pasar el ratón. La consola mostraba seis bloqueos por carga. Se permitió `'unsafe-inline'` **solo en estilos**, dejando `script-src` cerrado, que es lo que impide ejecutar código ajeno. Después de eso la consola queda limpia.

También se corrigió que el encabezado dijera «Cargando…» mientras mostraba un error de lugar desconocido, y que el foco cayera al cuerpo del documento al llegar al explorador desde el inicio.

## Añadido después: dial de sintonía

Idea de JuanCho el 2026-09-21: un círculo que se ponga verde a medida que la emisora «sintoniza». Se implementó como un anillo alrededor del botón de reproducir.

La pregunta importante era de dónde sacar el color sin inventarlo. La respuesta es `readyState` del elemento de audio, que es lo que el propio navegador sabe sobre cuánto audio tiene ya listo para sonar: 0 es que no llega nada y 4 es que va sobrado. Con eso la aguja sube sola mientras conecta, sin simular nada.

| Estado real | Anillo | Texto del reproductor |
|---|---|---|
| Conectando, sin datos aún | rojo, arco corto | «Sintonizando…» |
| Llegan metadatos | rojo, arco algo mayor | «Sintonizando…» |
| Hay audio suficiente | ámbar | «Sintonizando…» |
| Sonando de verdad | verde, anillo completo | «En directo» |
| En pausa | gris, medio anillo | «En pausa» |
| Señal caída o formato imposible | rojo, anillo completo | el mensaje del fallo |

Comprobado en el navegador con el build de producción: al pulsar TSF el anillo pasó de rojo con arco corto a verde completo al empezar a sonar; con Free FM 80 Tokyo, que devuelve una página web en vez de audio, se cerró entero en rojo; y al pausar SmoothFM quedó gris a medio anillo.

El verde solo aparece con reproducción efectiva, igual que el «En directo», así que el dial no promete nada que no esté pasando. El color nunca va solo: el arco cambia de tamaño y el texto dice lo mismo con palabras. Contraste de los tres colores sobre la superficie: 4,8:1 el rojo, 7,7:1 el ámbar y 8,9:1 el verde, por encima del 3:1 que se pide a elementos gráficos.

## Lo que NO se ha podido comprobar

- **Docker no está instalado en este equipo**, así que el `Dockerfile` está escrito pero **no se ha construido ni ejecutado nunca**.
- **Los ficheros de systemd y nginx no se han aplicado a ningún servidor.** No hay alojamiento elegido ni acceso a ninguna máquina.
- **No se ha tocado el DNS** ni se ha pedido ningún certificado. `radio.jrgblanco.com` sigue sin apuntar a nada nuestro.
- **No se ha publicado nada.**
- **Activación con teclado**: se comprobó el orden de tabulación y el movimiento del foco, pero la automatización de este navegador no dispara la activación por Enter o Espacio en botones nativos, así que no llegué a observarla. Los controles son elementos `<button>` normales, de modo que la activación es la del propio navegador, pero **no la he visto funcionar con mis propios ojos** y queda pendiente de una prueba manual.
- **Solo Chromium en Windows.** Siguen sin probarse Firefox, Safari, iOS, Android y cualquier teléfono físico.
- No se ha medido el consumo con tráfico real porque no ha habido tráfico real.
- El aviso para lectores de pantalla se ha comprobado leyendo el DOM, no con un lector de pantalla de verdad.
