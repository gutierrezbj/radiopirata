# -*- coding: utf-8 -*-
"""Dibuja la tarjeta de 1200x630 que se ve al pegar un enlace de RadioPirata.

Se ejecuta a mano y el PNG resultante se versiona en `web/public/tarjeta.png`.
No entra en el build: no queremos una dependencia de imagen solo para esto.

    python web/scripts/generar-tarjeta.py

Necesita Pillow y las fuentes Segoe UI de Windows, que son las mismas que usa
la interfaz. Los colores salen de DESIGN.md.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ANCHO, ALTO = 1200, 630
FONDO = (18, 20, 22)
TEXTO = (245, 240, 230)
SECUNDARIO = (181, 176, 167)
ACENTO = (242, 203, 87)

FUENTES = Path("C:/Windows/Fonts")
def fuente(nombre: str, tamano: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FUENTES / nombre), tamano)

def horizonte(lienzo: Image.Image) -> None:
    """El borde del planeta entrando por abajo, como en el inicio de la web."""
    cx, cy, radio = ANCHO // 2, 1230, 715
    caja = (cx - radio, cy - radio, cx + radio, cy + radio)

    halo = Image.new("L", (ANCHO, ALTO), 0)
    ImageDraw.Draw(halo).ellipse(caja, outline=255, width=10)
    lienzo.paste(Image.new("RGB", (ANCHO, ALTO), ACENTO), (0, 0), halo.filter(ImageFilter.GaussianBlur(38)).point(lambda v: int(v * 0.85)))

    borde = Image.new("L", (ANCHO, ALTO), 0)
    ImageDraw.Draw(borde).ellipse(caja, outline=255, width=3)
    lienzo.paste(Image.new("RGB", (ANCHO, ALTO), ACENTO), (0, 0), borde.filter(ImageFilter.GaussianBlur(1)).point(lambda v: int(v * 0.55)))

    tierra = Image.new("L", (ANCHO, ALTO), 0)
    ImageDraw.Draw(tierra).ellipse(caja, fill=255)
    lienzo.paste(Image.new("RGB", (ANCHO, ALTO), (30, 34, 37)), (0, 0), tierra.filter(ImageFilter.GaussianBlur(2)))

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
    horizonte(lienzo)
    dibujo = ImageDraw.Draw(lienzo)

    radio(dibujo, 84, 62, 2.4)
    dibujo.text((176, 68), "RadioPirata", font=fuente("seguisb.ttf", 46), fill=TEXTO)

    # El dominio en una píldora fina a la derecha, a la altura de la marca.
    etiqueta = "radiopirata.jrgblanco.com"
    tipo = fuente("seguisb.ttf", 28)
    ancho_texto = dibujo.textlength(etiqueta, font=tipo)
    derecha = ANCHO - 84
    dibujo.rounded_rectangle([derecha - ancho_texto - 52, 70, derecha, 126], radius=28, outline=ACENTO, width=2)
    dibujo.text((derecha - ancho_texto - 26, 84), etiqueta, font=tipo, fill=ACENTO)

    # El titular en una sola línea: se ajusta el cuerpo hasta que cabe con margen.
    titular = "¿Dónde escuchamos hoy?"
    cuerpo = 96
    while cuerpo > 56 and dibujo.textlength(titular, font=fuente("segoeuib.ttf", cuerpo)) > ANCHO - 168:
        cuerpo -= 2
    dibujo.text((84, 268), titular, font=fuente("segoeuib.ttf", cuerpo), fill=TEXTO)

    dibujo.text((84, 404), "Emisoras reales del mundo, en directo.", font=fuente("segoeui.ttf", 38), fill=SECUNDARIO)

    destino = Path(__file__).resolve().parents[1] / "public" / "tarjeta.png"
    lienzo.save(destino, "PNG", optimize=True)
    print(f"{destino}  {destino.stat().st_size // 1024} kB")

if __name__ == "__main__":
    principal()
