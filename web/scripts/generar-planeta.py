# -*- coding: utf-8 -*-
"""Dibuja el mapa del mundo que se ve dentro del planeta del inicio.

El inicio no carga el globo de WebGL: sería medio mega para una pantalla en la que
todavía no has elegido nada. Así que los continentes se dibujan una vez, aquí, con los
mismos datos que usa el globo del explorador (`world-atlas/land-110m`), en proyección
ortográfica, que es como se ve una esfera de verdad desde lejos.

    python web/scripts/generar-planeta.py

El resultado es `web/public/planeta.svg`, que el CSS pone como fondo del círculo. Al ser
una esfera proyectada, la tierra se comprime cerca del borde igual que en un globo.
"""
import json
import math
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
ORIGEN = RAIZ / "node_modules" / "world-atlas" / "land-110m.json"
DESTINO = RAIZ / "web" / "public" / "planeta.svg"

# Centro de la vista. La franja que se ve en el inicio es la de arriba del disco, así que
# con el centro en el ecuador quedan a la vista el Atlántico, América y Europa.
LATITUD_CENTRO = 0.0
LONGITUD_CENTRO = -25.0

LADO = 1000
RADIO = LADO / 2
TIERRA = "#2A2F33"


def arcos_decodificados(topologia: dict) -> list[list[tuple[float, float]]]:
    """Deshace la cuantización de TopoJSON: enteros con delta a grados."""
    escala = topologia["transform"]["scale"]
    traslado = topologia["transform"]["translate"]
    decodificados = []
    for arco in topologia["arcs"]:
        x = y = 0
        puntos = []
        for dx, dy in arco:
            x += dx
            y += dy
            puntos.append((x * escala[0] + traslado[0], y * escala[1] + traslado[1]))
        decodificados.append(puntos)
    return decodificados


def anillo(indices: list[int], arcos: list) -> list[tuple[float, float]]:
    """Une los arcos de un anillo; un índice negativo significa ese arco al revés."""
    puntos: list[tuple[float, float]] = []
    for indice in indices:
        tramo = arcos[indice] if indice >= 0 else arcos[~indice][::-1]
        puntos.extend(tramo if not puntos else tramo[1:])
    return puntos


def proyectar(lon: float, lat: float) -> tuple[float, float, bool]:
    """Ortográfica: como se ve una esfera de lejos. El tercer valor dice si mira hacia aquí."""
    lambda_ = math.radians(lon - LONGITUD_CENTRO)
    phi = math.radians(lat)
    phi0 = math.radians(LATITUD_CENTRO)
    coseno = math.sin(phi0) * math.sin(phi) + math.cos(phi0) * math.cos(phi) * math.cos(lambda_)
    x = math.cos(phi) * math.sin(lambda_)
    y = math.cos(phi0) * math.sin(phi) - math.sin(phi0) * math.cos(phi) * math.cos(lambda_)
    return RADIO + x * RADIO, RADIO - y * RADIO, coseno > 0


def trazos(puntos: list[tuple[float, float]]) -> list[str]:
    """Un trazo por cada tramo que cae en la cara visible; lo de detrás no se dibuja."""
    partes: list[str] = []
    actual: list[str] = []
    for lon, lat in puntos:
        x, y, visible = proyectar(lon, lat)
        if not visible:
            if len(actual) > 2:
                partes.append("M" + "L".join(actual) + "Z")
            actual = []
            continue
        actual.append(f"{x:.1f} {y:.1f}")
    if len(actual) > 2:
        partes.append("M" + "L".join(actual) + "Z")
    return partes


def principal() -> None:
    topologia = json.loads(ORIGEN.read_text(encoding="utf-8"))
    arcos = arcos_decodificados(topologia)

    caminos: list[str] = []
    for geometria in topologia["objects"]["land"]["geometries"]:
        poligonos = geometria["arcs"] if geometria["type"] == "MultiPolygon" else [geometria["arcs"]]
        for poligono in poligonos:
            for indices in poligono:
                caminos.extend(trazos(anillo(indices, arcos)))

    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {LADO} {LADO}" '
        f'width="{LADO}" height="{LADO}" aria-hidden="true">'
        f'<path fill="{TIERRA}" fill-rule="evenodd" d="{"".join(caminos)}"/>'
        "</svg>"
    )
    DESTINO.write_text(svg, encoding="utf-8")
    print(f"{DESTINO}  {len(svg) // 1024} kB  ({len(caminos)} trazos)")


if __name__ == "__main__":
    principal()
