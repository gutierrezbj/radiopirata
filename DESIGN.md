# DESIGN.md — RadioPirata

Documento de handoff de diseño (Protocolo UX/UI JRGB, Fase 6). Estado honesto: la dirección visual se acordó en la conversación de diseño con JuanCho el 20 sep 2026 y está en `docs/ENCARGO.md` §5; **no se hizo un Identity Sprint formal** ni existe theme en `jrgb-ui`. Este documento recoge las decisiones tal y como están en el código, para que el Sprint y el Distinctiveness Audit se hagan sobre lo real.

## Carácter
Curiosidad, calma y compañía. Una radio de antes, de noche, con la luz del dial encendida. Nada futurista, sin estrellas ni neón, sin tablas administrativas ni paneles de métricas.

## Temperatura y paleta (60-30-10)
| Token | Valor | Uso |
|---|---|---|
| `--fondo` | `#121416` | carbón cálido, fondo (60 %) |
| `--superficie` / `--superficie-alta` | `#1E2225` / `#262B2F` | tarjetas, paneles, reproductor (30 %) |
| `--texto` | `#F5F0E6` | marfil, texto principal |
| `--secundario` | `#B5B0A7` | gris cálido legible, texto secundario |
| `--acento` | `#F2CB57` | amarillo cálido: botón principal, marcos, foco (10 %). Nunca como única señal de estado |
| `--senal-mala` / `--senal-media` / `--senal-buena` | `#E2674E` / `#F0A44E` / `#7FD39A` | dial de sintonía y «en directo» |

Contraste medido: texto sobre fondo 16,3:1; secundario sobre superficie alta 6,6:1; señales del dial 4,8 / 7,7 / 8,9:1 sobre superficie. Todo por encima de AA.

## Tipografía
Una sola familia sans humanista del sistema (`Segoe UI Variable`, `Segoe UI`, `system-ui`, `Noto Sans`), 16 px base, pesos 400 y 600. Números tabulares en los relojes. **Pendiente del Identity Sprint**: decidir si se incorpora una segunda familia con tensión (display o mono) y si se auto-hospeda.

## Forma
Radios de 16 px en tarjetas y 10 px en fichas pequeñas, botones en píldora, pocas líneas divisorias, mucho espacio vacío en el inicio. El horizonte del planeta entra desde el borde inferior del inicio como gradiente radial.

## Detalles firma
- **Dial de sintonía**: anillo alrededor del botón de reproducir que va de rojo a ámbar y a verde según entra la señal real (`readyState`).
- **Relojes de láminas**: hora de allí y de aquí en dígitos partidos que caen al cambiar, cada uno en un marco fino amarillo.
- **Sello «comprobada»**: texto en amarillo con borde fino en las emisoras escuchadas a mano.
- **Día y noche en el globo**: luz desde la posición real del sol.
- **Amanecer en el inicio** (idea de JuanCho, 22 sep): el borde del planeta entra por abajo con la luz templada del sol a punto de salir por la izquierda. Es un gradiente, no una animación: en el inicio no hay nada que mover.
- **Tarjeta al compartir** (1200×630): el mismo carbón y el horizonte ámbar del inicio, la marca arriba a la izquierda, el dominio en una píldora de borde fino y el titular de la portada. Sin fotos ni degradados de moda: se reconoce como la misma casa.

## Motion
Vocabulario limitado a cinco patrones: transición de 160 ms `ease` en bordes y fondos de controles; viaje de cámara del globo de 1 200 ms; caída de lámina en 320 ms + 320 ms con `ease-in` / `ease-out`. Nunca lineal. Se añaden dos el 22 sep 2026: **giro de búsqueda**, el globo girando a 0,55 sobre su eje mientras el catálogo responde, y **relleno desde el origen**, un círculo del color de acento que crece 420 ms desde el punto por donde entra el puntero en los atajos de la cabecera. Con `prefers-reduced-motion` no hay transiciones, la cámara salta, los dígitos cambian sin caer y el globo no gira. El globo deja de dibujarse tras 3 s sin interacción, salvo mientras dura el giro de búsqueda.

El giro no es decoración: sin él, buscar parecía no hacer nada. El relleno sí lo es, y por eso se queda solo en tres botones.

## Componentes
Inicio (pregunta, buscador, fichas de destinos comprobados, Sorpréndeme, Donde ya es de noche) · Explorador (cabecera con buscador compacto y atajos, panel izquierdo o hoja inferior en móvil, escena del globo) · Lista de emisoras (fila con acción principal, estrella y compartir) · Reproductor persistente (anterior, dial + play/pausa, siguiente, temporizador, favorita, compartir, volumen) · Panel de países · Relojes.

Estados obligatorios en cada vista: cargando, vacío con salida, error con acción, sin WebGL, sin almacenamiento local.

## Accesibilidad
Foco visible en amarillo, orden de tabulación lógico, foco al título al navegar (no al abrir un enlace), título de pestaña por vista, aviso `aria-live` de cambio de vista, globo `aria-hidden` con todo disponible desde listas, relojes como grupo con frase entera, tamaños táctiles de 44 px en el reproductor.

## Pendiente del protocolo UX/UI
Identity Sprint documentado con moodboard no digital, decisión tipográfica con tensión, theme en `jrgb-ui`, subir los dos mockups aprobados a Diseño, QA visual en Safari y Firefox y en móvil real, y el Distinctiveness Audit de 12 puntos antes de cualquier deploy a producción. La tarjeta al compartir usa Segoe UI porque es la tipografía de la interfaz; si el Sprint cambia de familia, hay que regenerarla.
