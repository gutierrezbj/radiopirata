# Lecciones aprendidas — RadioPirata

Patrimonio del producto. **Nunca se borra**, solo se acumula. Se lee al empezar cada sesión y se refleja en Notion (Radio Pirata 1.0 → Lessons Aprendidas) cada semana. Formato: qué pasó, regla que evita repetirlo.

## Producto y honestidad

- **«Es radio, no hace falta.»** (21 sep 2026) Propuse título de canción y visualizador; JuanCho lo tumbó: pierde el encanto. Regla: cada añadido debe acercar a casa. Si solo adorna, sobra.
- **Un «recuadrito amarillo» era un borde, no un relleno.** (21 sep) Rellené de amarillo el bloque de relojes y quedó «un pollo amarillo». Regla: ante una petición visual pequeña, la interpretación mínima primero; el acento se usa en líneas y detalles, nunca en superficies.
- **Lo comprobado y lo del catálogo no se mezclan.** Lo escuchado a mano lleva sello y fecha; lo demás dice «según el catálogo». Nunca rellenar una ciudad vacía con emisoras del país: el país no prueba la ciudad.
- **Verificar con lo que sufriría la persona.** Free FM 80 Tokyo daba audio a `curl` y HTML al navegador. Regla: sondear señales con User-Agent de navegador, y considerar «reproduce» solo el evento `playing`.

## Técnica

- **No cachear fallos.** Un fallo pasajero de Radio Browser dejó Caracas vacía quince minutos. Regla: la caché solo guarda respuestas completas.
- **Sin rotación compartida entre peticiones en paralelo.** Tres consultas a la vez se quitaban servidores y podían fallar todas con uno sano disponible. Regla: cada petición recorre su propia copia de la lista; el que responde pasa al principio.
- **Filtrar por formato, no solo por esquema.** Aparecieron emisoras FLV. Regla: lista negra de códecs y extensiones que ningún navegador abre, además de HTTPS y sin HLS.
- **CSP y librerías que escriben estilos.** `style-src 'self'` rompía las etiquetas de Globe.gl. Regla: abrir `style-src` con `unsafe-inline` si una librería lo necesita, y **nunca** `script-src`.
- **El primer enfoque del globo llega después del montaje.** Regla: derivar el lugar del índice ya cargado y colocar la cámara de golpe la primera vez, animar las siguientes.
- **La fuente de las etiquetas 3D no tiene acentos.** Regla: sobre el globo, nombres sin tildes; el nombre completo va en el panel.
- **El servidor lee `index.html` una vez.** Un build nuevo no se ve hasta reiniciar. Regla: reiniciar tras cada build; en dev, reiniciar el visor antes de comprobar.
- **El foco no se roba a quien abre un enlace.** Regla: mover el foco al título solo si hubo navegación dentro de la app (`huboNavegacion()`).
- **Quieto parece roto.** (22 sep) JuanCho: «si no se mueve da la sensación de que no está buscando». Ahorrar batería dejando el globo inmóvil borró la única señal de que la búsqueda estaba en marcha. Regla: cuando se quita movimiento por rendimiento, comprobar que algo sigue contando lo que pasa.
- **Un atajo encendido tiene que apagarse.** (22 sep) «Noticias» se quedaba marcado y desde esa vista no se veía cómo volver a la música. Regla: todo atajo que marca dónde estás debe devolver al inicio al pulsarlo otra vez.
- **La regla no es «Tailwind no».** (22 sep) Rechacé un componente de shadcn diciendo que el Design System JRGB prohíbe Tailwind. JuanCho: «eso esta mal argumentado, es una MUY buena tecnologia». Lo que la regla pide es evitar lo genérico y que el diseño acompañe al cliente. Regla: al descartar una librería, argumentar desde el diseño que necesita este producto, no desde una prohibición que no existe; y si la petición es «un botón original», la respuesta es diseñar uno, no explicar por qué no.
- **Una luna en una interfaz significa modo nocturno.** (22 sep) El temporizador para dormir llevaba una luna y JuanCho lo vio enseguida: «esa luna normalmente es modo nocturno». Ahora son dos zetas. Regla: un icono no se elige por lo que evoca el concepto, sino por lo que ya significa en las interfaces que la gente usa todos los días.
- **Los acentos no se le piden a nadie.** (22 sep) Regla: toda comparación de texto pasa por `normalizar()`; escribir «japon» o «mexico» tiene que bastar, y las sugerencias se ofrecen mientras se escribe en vez de esperar al Enter.
- **Un fallo puede parecer otro.** La consola de una pestaña reutilizada conserva errores de políticas ya cambiadas. Regla: comprobar en pestaña nueva antes de perseguir un fantasma.

## Proceso y entorno

- **Leer Notion antes de hablar de despliegue.** (21 sep) Escribí una guía «sin alojamiento decidido» cuando JRGB tiene Catálogo, Protocolo y servidores definidos. Regla: en cualquier proyecto de Juan, leer primero el Protocolo de Kickoff, el Catálogo de Infraestructura y el Manifiesto.
- **«Radio Pirata» a secas es la emisora.** La app es «Radio Pirata 1.0». No confundirlas en Notion ni en el habla.
- **Cada proyecto en su chat.** No mezclar RadioPirata con Trama ni Sinatra.
- **npm en este Windows corta con ECONNRESET** en tarballs grandes: bajar la URL fallida con `curl -L` y `npm cache add`.
- **Docker no está instalado en el equipo de desarrollo.** La imagen se construye por primera vez en el servidor; decirlo siempre en la verificación.
- **La automatización del navegador no activa botones con Enter ni Espacio.** El orden de tabulación y el foco sí se pueden comprobar; la activación por teclado queda como pendiente manual.
- **Anotar lo que no se comprobó** vale tanto como lo que sí. Cada `docs/VERIFICACION-*.md` termina con esa lista.
