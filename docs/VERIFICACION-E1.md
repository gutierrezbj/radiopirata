# Verificación de la selección E1

Generado automáticamente por `npm run seleccion:verificar` el 2026-09-20T20:38:31.829Z.
Selección de emisoras generada el 2026-09-20T20:36:17.304Z desde Radio Browser (https://www.radio-browser.info), consulta /json/stations/byuuid.

Criterio: petición GET real a la URL de la emisora, con User-Agent de navegador y un tiempo máximo de 8000 ms; se considera accesible si responde 2xx con `Content-Type` `audio/*` y entrega datos.

**Accesibles por HTTP: 11 de 11.**

| Destino | Emisora | HTTP | Tipo | Bytes leídos | ms | Resultado |
|---|---|---|---|---|---|---|
| Tokio | FM世田谷 | 200 | audio/mpeg | 33855 | 1215 | ✅ accesible |
| Tokio | Gotanno FM 89.2 | 200 | audio/mpeg | 36986 | 1442 | ✅ accesible |
| Tokio | J1 HITS | 200 | audio/mpeg; charset=UTF-8 | 33269 | 825 | ✅ accesible |
| Caracas | Alba Ciudad 96.3 FM | 200 | audio/mpeg | 33600 | 1082 | ✅ accesible |
| Caracas | La Mega 107.3 | 200 | audio/mpeg | 33855 | 1058 | ✅ accesible |
| Caracas | KYS FM | 200 | audio/mpeg | 33437 | 1013 | ✅ accesible |
| Caracas | Estereo 88.7 FM | 200 | audio/aac | 49036 | 923 | ✅ accesible |
| Lisboa | TSF Rádio Notícias | 200 | audio/mpeg | 33598 | 790 | ✅ accesible |
| Lisboa | SmoothFM | 200 | audio/aac | 32768 | 1580 | ✅ accesible |
| Lisboa | M80 Rádio – 80s | 200 | audio/aac | 32768 | 1522 | ✅ accesible |
| Lisboa | Rádio Observador | 200 | audio/aacp | 32768 | 1157 | ✅ accesible |

## Reproducción audible en navegador

Esta tabla solo prueba acceso HTTP desde el equipo donde se ejecutó. La reproducción audible se comprueba a mano en el navegador y se registra abajo por el agente o el usuario, con fecha y dispositivo.

<!-- reproduccion-manual:inicio -->
### Sesión del 2026-09-20 (agente local)

- Equipo: portátil Windows 11 Home (10.0.26200), Node 22.15.0.
- Navegador: panel de navegador integrado del Claude desktop (motor Chromium), viewport de escritorio (800×450 aprox.) y emulación móvil 375×812. No se probó en Firefox, Safari ni en un teléfono físico.
- Criterio: se anota «reproduce» cuando el elemento de audio emite el evento `playing` y el reproductor muestra «En directo». Es la señal del navegador de que la señal se decodifica y avanza; no se comprobó con altavoces ni con captura de audio, así que no se afirma «audible» en sentido literal.

| Destino | Emisora | Resultado en Chromium | Tiempo hasta «En directo» |
|---|---|---|---|
| Tokio | FM世田谷 | reproduce | < 8 s |
| Tokio | Gotanno FM 89.2 | reproduce | < 8 s |
| Tokio | J1 HITS | reproduce | < 9 s |
| Tokio | Free FM 80 Tokyo | **no reproduce** → retirada de la selección | error «no puede reproducir esta señal» (MEDIA_ERR_SRC_NOT_SUPPORTED) |
| Caracas | Alba Ciudad 96.3 FM | reproduce | < 8 s |
| Caracas | La Mega 107.3 | reproduce | < 9 s |
| Caracas | KYS FM | reproduce | ~12 s (servidor lento; llegó a sonar antes del límite de 15 s) |
| Caracas | Estereo 88.7 FM | reproduce | < 9 s |
| Lisboa | TSF Rádio Notícias | reproduce | < 7 s |
| Lisboa | SmoothFM | reproduce | < 8 s |
| Lisboa | M80 Rádio – 80s | reproduce | < 8 s |
| Lisboa | Rádio Observador | reproduce | < 10 s |

Motivo de la retirada de Free FM 80 Tokyo: su URL raíz (`https://freefm80.radioca.st/`) responde `audio/mpeg` a clientes genéricos, pero con User-Agent de navegador devuelve `302 → index.html` (`text/html`). Por eso la primera verificación, hecha con el User-Agent de la API, la daba por buena. El script se cambió para sondear con User-Agent de navegador.

### Recorrido y comportamiento comprobados en la misma sesión

- Inicio → «Lisboa» → lista de 4 emisoras → clic en TSF → «Conectando…» → «En directo». Se registró un único clic en la API (`POST /api/emisoras/:id/clic`) por cada inicio efectivo.
- Con TSF sonando, cambiar a «Caracas» movió el globo y cargó otra lista sin interrumpir TSF.
- Cambio rápido Alba Ciudad → La Mega → KYS FM: solo KYS FM quedó activa y solo ella registró clic; las dos anteriores no llegaron a sonar ni a registrarse.
- Pausar muestra «En pausa · Al reanudar vuelves al directo»; reanudar reconecta la señal (nuevo inicio, nuevo clic).
- Volver al inicio mantiene el reproductor visible y la emisora sonando.
- Buscar «Madrid» muestra el aviso honesto del alcance; «tokyo» resuelve a Tokio.
- «Sorpréndeme» eligió Lisboa y arrancó Rádio Observador con la activación de usuario del clic (sin bloqueo de autoplay).
- Viewport móvil: globo arriba, panel de emisoras como hoja inferior, reproductor visible.
- La API de producción (`npm start`) sirvió la web compilada y respondió `/api/destinos` en el mismo origen.

### No comprobado en esta sesión (pendiente)

- Bloqueo de autoplay real del navegador y caída de señal en mitad de la escucha: cubiertos por pruebas unitarias del controlador, no reproducidos a mano.
- Fallback sin WebGL: implementado (lista y reproductor sin globo), no forzado en el navegador.
- `prefers-reduced-motion`: implementado (sin animación de cámara ni transiciones), no emulado.
- Teléfonos físicos, Safari/iOS, Firefox, reproducción en segundo plano.
<!-- reproduccion-manual:fin -->
