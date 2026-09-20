# Verificación de E2 — Descubrimiento ampliado

Sesión del 2026-09-20 (agente local), continuación de [VERIFICACION-E1.md](VERIFICACION-E1.md).

- Equipo: portátil Windows 11 Home (10.0.26200), Node 22.15.0.
- Navegador: panel integrado del Claude desktop (motor Chromium), viewport de escritorio y emulación móvil 375×812.
- Catálogo consultado en vivo: Radio Browser, servidores descubiertos por DNS SRV.

## Recorrido comprobado

| Paso | Resultado |
|---|---|
| Inicio con «Mis favoritas» arriba a la derecha | aparece solo cuando el navegador deja guardar |
| Buscar «sao paulo» → página del lugar | 37 emisoras, filtros por estilo, globo enfocado en Brasil |
| Buscar «Portugal» desde una ficha de país | 24 emisoras, sugerencias de lugar (Lisboa, Oporto) |
| Página de Lisboa | 4 comprobadas a mano primero, 26 del catálogo después |
| Filtro «pop» sobre los resultados | de 24 a 5 emisoras, sin cortar el audio |
| «Ver más emisoras» en una búsqueda | de 24 a 36 y el botón desaparece |
| Estrella en una emisora | guardada con esquema versión 1 en `localStorage` |
| Siguiente emisora desde el reproductor | pasa de M80 Rádio – 80s a Rádio Observador |
| Enlace compartido `?emisora=<uuid>` | abre la ficha, sin reproducir sola, con salidas para seguir explorando |
| Enlace compartido de una señal no reproducible | «Esa emisora ya no está disponible o no se puede reproducir aquí» |
| «Sorpréndeme» | llevó a Río de Janeiro y sonó una emisora de allí |
| Reikiavik (ciudad sin emisoras en el catálogo) | estado vacío honesto y dos salidas: país o sorpresa |
| Navegar entre lugares, búsquedas y favoritas | el audio no se interrumpe en ningún caso |
| Viewport móvil 375×812 | globo arriba, panel como hoja inferior, reproductor con anterior/siguiente |
| Build de producción en el mismo origen | `/`, `/?lugar=…` y `/?emisora=…` sirven la web; `/api/*` responde |

## Dos defectos encontrados y corregidos durante la verificación

1. **Un fallo pasajero del catálogo se quedaba cacheado 15 minutos.** Caracas devolvía «el catálogo no ha respondido» de forma repetida mientras una consulta directa a Radio Browser tardaba 0,45 s. La caché guardaba también las respuestas fallidas. Ahora un fallo no se guarda, así que el siguiente intento vuelve a preguntar.
2. **Las peticiones en paralelo se quitaban servidores entre ellas.** La lista de servidores de Radio Browser se rotaba mutando el array compartido; con tres consultas a la vez (nombre, estilo y país) una podía agotar sus intentos sin llegar a probar el servidor sano. Ahora cada petición recorre una copia del orden y el servidor que responde pasa al principio para la siguiente.

Ambos casos tienen prueba: «no guarda en caché un fallo del catálogo» y «dos peticiones a la vez no se quitan servidores entre ellas».

## Decisiones de honestidad tomadas en E2

- **Lo comprobado y lo del catálogo no se mezclan.** Las once emisoras de E1 llevan el sello «comprobada» y salen primero en su ciudad. El resto viene del catálogo sin comprobación nuestra y la nota del panel lo dice.
- **El país no prueba la ciudad.** Una ciudad sin emisoras no se rellena con emisoras del país: se muestra vacía y se ofrece la búsqueda del país como acción aparte.
- **La región no es la ciudad.** Radio Browser guarda una región en el campo de ubicación, así que la nota dice «en Lisboa o su región» y cada emisora enseña la ubicación que declara el catálogo.
- **Solo se ofrecen emisoras que pueden sonar.** Se descartan las que no son HTTPS, las de HLS y los formatos que ningún navegador abre (FLV, WMA, ASF, RTMP, DASH). Durante la verificación aparecieron emisoras FLV en São Paulo y por eso se añadió el filtro por formato.
- **Controles que no funcionan, no se enseñan.** Si el navegador no deja guardar, desaparecen la estrella y «Mis favoritas» y se explica por qué. Anterior y siguiente solo aparecen cuando hay más de una emisora en la lista de la que salió lo que suena.

## No comprobado en esta sesión (pendiente)

- Firefox, Safari/iOS y teléfonos físicos: todo lo anterior es Chromium en Windows.
- La hoja de compartir del sistema (`navigator.share`) no existe en este navegador de escritorio; se verificó la vía del portapapeles, no la del móvil.
- Modo privado y cuota de almacenamiento llena: cubiertos por pruebas unitarias del almacén, no reproducidos a mano en el navegador.
- Las emisoras del catálogo no están comprobadas una a una: algunas fallarán al reproducir y el reproductor lo dirá. Se sabe de al menos dos en Tokio (Free FM) que devuelven una página web a los navegadores.
- «Ver más» está limitado a 120 resultados por búsqueda, que es el tope que sirve la API.
