# Verificación de los retoques del 22 de septiembre de 2026

Cuatro peticiones de JuanCho del día siguiente a ponerla en el aire, más una idea suya de diseño. Comprobado primero contra el build de producción en local (puerto 3011) y después en `https://radiopirata.jrgblanco.com` ya desplegado.

## Lo que se comprobó

| Qué | Cómo quedó |
|---|---|
| Giro al buscar | Tres capturas seguidas durante una búsqueda muestran el globo girando; dos capturas separadas cinco segundos después de cargar son idénticas, así que se para al terminar |
| Viaje al país | Buscar «Francia» deja el globo sobre Europa con París marcado. El índice propio tiene ciudad en 55 países; en los demás el globo gira mientras busca y se queda donde está |
| Sugerencias | «fra» propone París, Francia (3840 emisoras), Polinesia Francesa, Guayana Francesa y Territorios Australes Franceses |
| Sin acentos | «japo» propone Osaka, Tokio y Japón (227 emisoras). También «mexico» y «MÉXICO» |
| Teclado y lectores | El campo es `combobox` con `aria-expanded`, `aria-activedescendant` y una lista `listbox` con opciones; flechas para moverse, Enter para entrar, Escape para cerrar |
| Atajos con salida | Pulsar «Noticias» estando dentro devuelve a «¿Dónde escuchamos hoy?». Igual en Recientes y Favoritas |
| Relleno de los atajos | El círculo del color de acento crece desde donde entra el puntero y cubre la píldora; con el teclado sale del centro |
| Amanecer | La luz templada entra por el filo izquierdo del planeta en el inicio, en escritorio y en móvil |
| Pruebas | 181 en verde: 85 del servidor y 96 de la web, con siete nuevas para las sugerencias |

## Decisiones

- **No se inventan coordenadas de países.** Se usa la ciudad del índice propio, que tiene coordenadas comprobadas. Un país sin ciudad en el índice no mueve el globo a un punto aproximado.
- **El amanecer no se anima.** Es un gradiente quieto. El globo ya deja de dibujarse a los tres segundos para no gastar batería; una animación infinita en el inicio iría contra eso.
- **El relleno de los botones es CSS propio**, no una librería. Ver la nota sobre el componente de shadcn en `DESIGN.md` y en `tasks/lessons.md`.

## Lo que no se ha comprobado

- La búsqueda predictiva en un teclado de móvil de verdad: solo en emulación. En particular, no se ha visto cómo se comporta la lista con el teclado virtual abierto.
- Firefox, Safari y iOS siguen sin probarse.
- El caso raro del globo que una vez no viajó de Caracas a Lisboa: no se ha podido reproducir y sigue anotado en `tasks/todo.md`.
