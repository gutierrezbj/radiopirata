# Material de campaña

No se sirve desde la web: son piezas para publicar a mano. Se regeneran con
`python web/scripts/generar-instagram.py`, que dibuja las dos de una vez.

| Fichero | Medida | Dónde |
|---|---|---|
| `instagram-1080x1350.png` | 1080×1350 | Publicación del feed. Es el formato vertical que más pantalla ocupa |
| `instagram-stories-1080x1920.png` | 1080×1920 | Stories. El texto se queda en la franja central: arriba manda el nombre de la cuenta y abajo van el sticker del enlace y la barra de responder |

La tarjeta que sale al compartir el enlace es otra cosa y sí vive en la web:
`web/public/tarjeta.png`, generada por `web/scripts/generar-tarjeta.py`.

Las tres piezas usan el mismo mundo que la aplicación: los continentes de
`world-atlas/land-110m` en proyección ortográfica, la luz del amanecer en el filo y las
antenas de las ciudades, con Caracas encendida en verde como cuando algo está sonando.

**Instagram no deja pulsar enlaces en el pie**: hay que poner
`radiopirata.jrgblanco.com` en la biografía antes de publicar.
