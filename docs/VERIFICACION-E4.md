# Verificación de E4 — Acercar a casa

Sesión del 2026-09-21 (agente local). Continúa [VERIFICACION-E3.md](VERIFICACION-E3.md).

El sentido de esta entrega lo puso JuanCho: RadioPirata es la radio local de casa para quien vive fuera. Con ese norte, el orden fue noticias del país, dormirse con la radio puesta, la hora de allí, y que un enlace compartido diga qué es.

- Equipo: portátil Windows 11 Home, Node 22.15.0.
- Navegador: panel integrado del Claude desktop (motor Chromium), contra el **build de producción** servido por el propio servidor Node.

## Noticias por país

| Comprobación | Resultado |
|---|---|
| `GET /api/paises` | 241 países con recuento real del catálogo; Venezuela 199 emisoras, Arabia Saudí 137 |
| Lista de países en la web | ordenada en español por el navegador: Afganistán, Albania, Alemania… con filtro por nombre |
| `GET /api/noticias?pais=VE` | 26 emisoras informativas, globo enfocado en Caracas |
| Francia / Arabia Saudí | 31 / 5 emisoras |
| Cómo se decide «informativa» | etiqueta del catálogo (`news`, `noticias`, `notícias`, `nachrichten`, `radio hablada`…) o el propio nombre («BandNews», «Notícias», «Informativa») |
| Nota del panel | «26 emisoras que el catálogo o su propio nombre presentan como informativas en Venezuela. No están comprobadas una a una.» |

La lista de Venezuela mezcla emisoras claramente informativas (Radio Nacional de Venezuela - Informativa, Unión Radio, TeleSur) con otras que el catálogo etiqueta como «radio hablada» aunque sean musicales (Rumba 98.1). No se ha querido afinar más a mano: se dice de dónde sale y se deja que los filtros por estilo recorten.

## Dormirse con la radio puesta

- Botón de luna en el reproductor con opciones de 15, 30, 45 y 60 minutos.
- Comprobado: al elegir 15 min el estado pasa a «En directo · se apaga en 15 min», el botón queda marcado y su etiqueta accesible dice lo que queda.
- El temporizador cuenta contra una hora fija, no contra ticks: si el navegador ralentiza los temporizadores en segundo plano, se apaga igual al mirar el reloj (con prueba unitaria).
- En los últimos treinta segundos el volumen baja poco a poco, solo donde el navegador deja tocarlo; al acabar, pausa y devuelve el volumen. **El fundido no se ha esperado a mano en el navegador**, está cubierto por la lógica del temporizador y del controlador.

## La hora de allí, y día y noche en el globo

- Las 72 ciudades del índice llevan zona horaria IANA, curada a mano y validada al arrancar: si una zona no existe, el servidor no arranca.
- Comprobado: Lisboa mostraba «Allí son las 11:50, por la mañana.» en el panel y «11:51 allí» en el reproductor al sonar SmoothFM. Guadalajara: «Allí son las 04:51, de madrugada.»
- La hora solo se enseña cuando la emisora salió de una ciudad del índice; en una búsqueda o en noticias por país no se sabe la ciudad y no se inventa.
- El globo se ilumina desde donde está el sol, calculado con la fecha y sin ninguna fuente externa. Comprobado en capturas: con Lisboa abierta a media mañana, Europa y África iluminadas; con Guadalajara de madrugada, las Américas a oscuras y el borde iluminado por el este. La posición se recalcula cada cinco minutos.
- «Donde ya es de noche» eligió Guadalajara a las 04:51 y empezó a sonar W Radio 101.5. Elige entre las ciudades del índice donde el sol está más de seis grados bajo el horizonte.

## Añadido después: relojes de láminas

Idea de JuanCho: los relojes de láminas que caían una detrás de otra. Se pusieron en la cabecera de cada ciudad del índice, dos: «Allí, en Caracas, por la mañana» y «Aquí», con la zona de la ciudad y la del navegador de quien escucha.

- Cada dígito es una lámina partida por la mitad; al cambiar, la mitad de arriba cae mostrando el nuevo dígito y la de abajo sube detrás. Al entrar en la ciudad caen todas desde vacío; después solo cuando cambia el minuto. Se comprueba cada segundo para no perder ningún cambio.
- Con «reducir movimiento» activado en el sistema, el dígito cambia sin caída.
- Para lectores de pantalla, el bloque es un grupo con una frase entera: «Allí son las 07:04, por la mañana. Aquí son las 13:04.» Las láminas van ocultas.
- Comprobado con el build de producción: Caracas 07:04 y aquí 13:04 en escritorio y en móvil emulado; Tokio 20:04 «por la noche». Ocho láminas por par de relojes, como toca.
- Van dentro de un marco fino amarillo, el acento del tema, sobre el fondo normal. La primera versión rellenó el recuadro de amarillo entero y JuanCho lo tumbó con razón: demasiado.
- **No comprobado**: la caída en sí no se ha visto fotograma a fotograma; se ve el resultado final. Y solo en Chromium.

## Tarjeta al compartir

Comprobado con `curl` contra el servidor de producción:

| Enlace | `<title>` y `og:title` |
|---|---|
| `/?noticias=VE` | Noticias de Venezuela · RadioPirata |
| `/?emisora=7bc1f66f…` | M80 Rádio – 80s en RadioPirata · «Lisbon, Portugal · Escúchala en directo.» |
| `/?lugar=caracas` | Caracas, Venezuela · RadioPirata |
| `/` | RadioPirata — ¿Dónde escuchamos hoy? |

Las etiquetas se inyectan en el servidor porque WhatsApp y compañía leen el HTML sin ejecutar nada. Todo lo que viene de fuera se escapa (con prueba). **No hay imagen de tarjeta**: harían falta 1200×630 píxeles diseñados y no se ha querido improvisar uno.

## Lo que NO se ha comprobado

- Ninguna de las 26 emisoras informativas de Venezuela se ha escuchado una a una; sí una de Guadalajara y SmoothFM.
- El fundido de los últimos treinta segundos y el apagado real al terminar el temporizador no se han esperado en el navegador.
- La tarjeta se ha comprobado leyendo el HTML, no pegando el enlace en WhatsApp o Telegram.
- Solo Chromium en Windows.
- Consola limpia en pestaña nueva; la pestaña reutilizada del panel conserva avisos antiguos de una política de contenidos que ya no está en vigor.

Pruebas: 83 en servidor y 88 en web, todas en verde.
