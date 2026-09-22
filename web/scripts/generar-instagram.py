# -*- coding: utf-8 -*-
"""Dibuja la imagen vertical (1080x1350) para el lanzamiento en Instagram.

Mismo mundo que la aplicación: el planeta con los continentes en proyección
ortográfica, la luz del amanecer en el filo y las antenas de unas cuantas ciudades,
con la de Caracas encendida en verde como cuando algo está sonando.

    python web/scripts/generar-instagram.py

Necesita Pillow y las fuentes Segoe UI de Windows. El resultado se versiona en
`marketing/` y no se sirve desde la web: es material de campaña, no de producto.
"""
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

RAIZ = Path(__file__).resolve().parents[2]
TOPOLOGIA = RAIZ / "node_modules" / "world-atlas" / "land-110m.json"
DESTINO = RAIZ / "marketing" / "instagram-1080x1350.png"

ANCHO, ALTO = 1080, 1350
FONDO = (18, 20, 22)
TEXTO = (245, 240, 230)
SECUNDARIO = (181, 176, 167)
ACENTO = (242, 203, 87)
VERDE = (127, 211, 154)
TIERRA = (42, 47, 51)
MAR = (26, 30, 33)

# El planeta: centro por debajo del lienzo, así se ve la parte de arriba de la esfera.
CENTRO = (ANCHO // 2, 1430)
RADIO = 700
# El centro de la proyeccion va al sur: lo que se ve es la parte de arriba del disco, y asi
# el Atlantico entero (America a la izquierda, Europa y Africa a la derecha) entra en cuadro.
LATITUD_CENTRO = -30.0
LONGITUD_CENTRO = -45.0

# Ciudades con antena. La primera está sonando.
CIUDADES = [
    ("Caracas", 10.5, -66.9, True),
    ("Lisboa", 38.7, -9.1, False),
    ("Madrid", 40.4, -3.7, False),
    ("París", 48.9, 2.3, False),
    ("Nueva York", 40.7, -74.0, False),
    ("Bogotá", 4.7, -74.1, False),
    ("Buenos Aires", -34.6, -58.4, False),
    ("Dakar", 14.7, -17.5, False),
    ("Casablanca", 33.6, -7.6, False),
    ("São Paulo", -23.5, -46.6, False),
]

FUENTES = Path("C:/Windows/Fonts")


def fuente(nombre: str, tamano: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FUENTES / nombre), tamano)


def proyectar(lon: float, lat: float) -> tuple[float, float, bool]:
    """Ortográfica: la esfera vista de lejos. El tercer valor dice si mira hacia aquí."""
    lambda_ = math.radians(lon - LONGITUD_CENTRO)
    phi = math.radians(lat)
    phi0 = math.radians(LATITUD_CENTRO)
    coseno = math.sin(phi0) * math.sin(phi) + math.cos(phi0) * math.cos(phi) * math.cos(lambda_)
    x = math.cos(phi) * math.sin(lambda_)
    y = math.cos(phi0) * math.sin(phi) - math.sin(phi0) * math.cos(phi) * math.cos(lambda_)
    return CENTRO[0] + x * RADIO, CENTRO[1] - y * RADIO, coseno > 0


def arcos_decodificados(topologia: dict) -> list[list[tuple[float, float]]]:
    escala = topologia["transform"]["scale"]
    traslado = topologia["transform"]["translate"]
    salida = []
    for arco in topologia["arcs"]:
        x = y = 0
        puntos = []
        for dx, dy in arco:
            x += dx
            y += dy
            puntos.append((x * escala[0] + traslado[0], y * escala[1] + traslado[1]))
        salida.append(puntos)
    return salida


def anillo(indices: list[int], arcos: list) -> list[tuple[float, float]]:
    puntos: list[tuple[float, float]] = []
    for indice in indices:
        tramo = arcos[indice] if indice >= 0 else arcos[~indice][::-1]
        puntos.extend(tramo if not puntos else tramo[1:])
    return puntos


def dibujar_planeta(lienzo: Image.Image) -> None:
    caja = (CENTRO[0] - RADIO, CENTRO[1] - RADIO, CENTRO[0] + RADIO, CENTRO[1] + RADIO)

    # El mar.
    esfera = Image.new("L", (ANCHO, ALTO), 0)
    ImageDraw.Draw(esfera).ellipse(caja, fill=255)
    lienzo.paste(Image.new("RGB", (ANCHO, ALTO), MAR), (0, 0), esfera.filter(ImageFilter.GaussianBlur(1)))

    # La tierra.
    topologia = json.loads(TOPOLOGIA.read_text(encoding="utf-8"))
    arcos = arcos_decodificados(topologia)
    mapa = Image.new("L", (ANCHO, ALTO), 0)
    pincel = ImageDraw.Draw(mapa)
    for geometria in topologia["objects"]["land"]["geometries"]:
        poligonos = geometria["arcs"] if geometria["type"] == "MultiPolygon" else [geometria["arcs"]]
        for poligono in poligonos:
            for indices in poligono:
                visibles: list[tuple[float, float]] = []
                for lon, lat in anillo(indices, arcos):
                    x, y, visible = proyectar(lon, lat)
                    if visible:
                        visibles.append((x, y))
                    else:
                        if len(visibles) > 2:
                            pincel.polygon(visibles, fill=255)
                        visibles = []
                if len(visibles) > 2:
                    pincel.polygon(visibles, fill=255)
    recorte = Image.new("L", (ANCHO, ALTO), 0)
    ImageDraw.Draw(recorte).ellipse(caja, fill=255)
    mapa = Image.composite(mapa, Image.new("L", (ANCHO, ALTO), 0), recorte)
    lienzo.paste(Image.new("RGB", (ANCHO, ALTO), TIERRA), (0, 0), mapa)

    # El amanecer: halo cálido por fuera del filo y un borde fino encima.
    halo = Image.new("L", (ANCHO, ALTO), 0)
    ImageDraw.Draw(halo).ellipse(caja, outline=255, width=14)
    lienzo.paste(
        Image.new("RGB", (ANCHO, ALTO), ACENTO),
        (0, 0),
        halo.filter(ImageFilter.GaussianBlur(40)).point(lambda v: int(v * 0.9)),
    )
    filo = Image.new("L", (ANCHO, ALTO), 0)
    ImageDraw.Draw(filo).ellipse(caja, outline=255, width=3)
    lienzo.paste(
        Image.new("RGB", (ANCHO, ALTO), ACENTO),
        (0, 0),
        filo.filter(ImageFilter.GaussianBlur(1)).point(lambda v: int(v * 0.6)),
    )


def dibujar_antenas(dibujo: ImageDraw.ImageDraw) -> None:
    """Mástil hacia fuera de la esfera y dos ondas encima, como en el globo de la web."""
    for _, lat, lon, sonando in CIUDADES:
        x, y, visible = proyectar(lon, lat)
        # Nada pegado al borde de abajo: una antena cortada por la mitad canta mucho.
        if not visible or y > ALTO - 110:
            continue
        dx, dy = x - CENTRO[0], y - CENTRO[1]
        largo = math.hypot(dx, dy) or 1
        ux, uy = dx / largo, dy / largo
        color = VERDE if sonando else TEXTO
        alto = 46 if sonando else 34
        punta = (x + ux * alto, y + uy * alto)
        dibujo.line([(x, y), punta], fill=color, width=5 if sonando else 4)
        dibujo.ellipse([x - 6, y - 6, x + 6, y + 6], fill=color)
        dibujo.ellipse([punta[0] - 7, punta[1] - 7, punta[0] + 7, punta[1] + 7], fill=color)
        for salto, radio in ((16, 13), (30, 22)):
            cx, cy = x + ux * (alto + salto), y + uy * (alto + salto)
            angulo = math.degrees(math.atan2(uy, ux))
            dibujo.arc(
                [cx - radio, cy - radio, cx + radio, cy + radio],
                angulo - 70,
                angulo + 70,
                fill=color if sonando else SECUNDARIO,
                width=4 if sonando else 3,
            )


def radio(dibujo: ImageDraw.ImageDraw, x: int, y: int, escala: float) -> None:
    """El icono de la web (web/public/icono.svg) a mayor tamaño."""
    def p(vx: float, vy: float) -> tuple[float, float]:
        return (x + vx * escala, y + vy * escala)

    grosor = max(2, round(1.8 * escala))
    dibujo.rounded_rectangle([p(6, 11), p(26, 25)], radius=3 * escala, outline=TEXTO, width=grosor)
    dibujo.ellipse([p(16.8, 14.8), p(23.2, 21.2)], outline=ACENTO, width=grosor)
    for vy in (15.5, 19.0):
        dibujo.line([p(9.5, vy), p(14.5, vy)], fill=SECUNDARIO, width=max(2, round(1.6 * escala)))
    dibujo.line([p(11, 11), p(19, 6)], fill=TEXTO, width=grosor)


def principal() -> None:
    lienzo = Image.new("RGB", (ANCHO, ALTO), FONDO)
    dibujar_planeta(lienzo)
    dibujo = ImageDraw.Draw(lienzo)
    dibujar_antenas(dibujo)

    radio(dibujo, 84, 74, 2.6)
    dibujo.text((186, 80), "RadioPirata", font=fuente("seguisb.ttf", 50), fill=TEXTO)

    titulo = fuente("segoeuib.ttf", 96)
    dibujo.text((84, 250), "La radio de casa,", font=titulo, fill=TEXTO)
    dibujo.text((84, 360), "estés donde estés.", font=titulo, fill=TEXTO)

    normal = fuente("segoeui.ttf", 40)
    dibujo.text((84, 500), "Giras el globo, eliges ciudad", font=normal, fill=SECUNDARIO)
    dibujo.text((84, 554), "y suena su radio local, en directo.", font=normal, fill=SECUNDARIO)

    etiqueta = "radiopirata.jrgblanco.com"
    tipo = fuente("seguisb.ttf", 34)
    ancho_texto = dibujo.textlength(etiqueta, font=tipo)
    dibujo.rounded_rectangle([84, 640, 84 + ancho_texto + 64, 710], radius=35, outline=ACENTO, width=2)
    dibujo.text((116, 658), etiqueta, font=tipo, fill=ACENTO)

    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    lienzo.save(DESTINO, "PNG", optimize=True)
    print(f"{DESTINO}  {DESTINO.stat().st_size // 1024} kB")


if __name__ == "__main__":
    principal()
