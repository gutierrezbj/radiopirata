import Globe, { type GlobeInstance } from 'globe.gl';
import { useEffect, useRef } from 'react';
import type { MeshPhongMaterial } from 'three';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import tierra from 'world-atlas/land-110m.json';
import type { Destino, Emisora } from '../tipos';
import { prefiereMenosMovimiento } from '../util/entorno';

interface Props {
  destinos: Destino[];
  destinoActual: Destino | null;
  emisoras: Emisora[];
  alElegirDestino: (destino: Destino) => void;
  alPasarPorDestino: (destino: Destino | null) => void;
}

type InstanciaGlobo = GlobeInstance;

interface PuntoDestino {
  tipo: 'destino';
  destino: Destino;
  lat: number;
  lng: number;
}

interface PuntoEmisora {
  tipo: 'emisora';
  emisora: Emisora;
  lat: number;
  lng: number;
}

type Punto = PuntoDestino | PuntoEmisora;

const ALTITUD_DESTINO = 1.6;
const topologia = tierra as unknown as Topology;
const superficie = feature(topologia, topologia.objects['land'] as Parameters<typeof feature>[1]);
const poligonos = superficie.type === 'FeatureCollection' ? superficie.features : [superficie];

/**
 * Integra Globe.gl con React: una instancia por montaje, limpieza completa al desmontar,
 * pausa del render cuando la pestaña no está visible y respeto de prefers-reduced-motion.
 */
export function Globo({ destinos, destinoActual, emisoras, alElegirDestino, alPasarPorDestino }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const globo = useRef<InstanciaGlobo | null>(null);
  const callbacks = useRef({ alElegirDestino, alPasarPorDestino });
  callbacks.current = { alElegirDestino, alPasarPorDestino };
  const destinoInicial = useRef(destinoActual);
  const primerEnfoque = useRef(true);

  useEffect(() => {
    const el = contenedor.current;
    if (!el) return;
    const menosMovimiento = prefiereMenosMovimiento();

    // Sin animación de entrada: pisaría el enfoque inicial del destino.
    const g = new Globe(el, { animateIn: false, rendererConfig: { antialias: true, alpha: true } })
      .backgroundColor('rgba(0,0,0,0)')
      .showAtmosphere(true)
      .atmosphereColor('#F2CB57')
      .atmosphereAltitude(0.1)
      .polygonsData(poligonos)
      .polygonCapColor(() => '#2A2F33')
      .polygonSideColor(() => 'rgba(0,0,0,0)')
      .polygonStrokeColor(() => '#3B4145')
      .polygonAltitude(0.004)
      .pointLat((p) => (p as Punto).lat)
      .pointLng((p) => (p as Punto).lng)
      .pointColor((p) => ((p as Punto).tipo === 'destino' ? '#F2CB57' : '#F5F0E6'))
      .pointAltitude((p) => ((p as Punto).tipo === 'destino' ? 0.02 : 0.008))
      .pointRadius((p) => ((p as Punto).tipo === 'destino' ? 0.55 : 0.22))
      .pointsMerge(false)
      .pointLabel((p) => {
        const punto = p as Punto;
        return punto.tipo === 'destino'
          ? `<div class="globo__etiqueta">${escapar(punto.destino.nombre)}<small>${escapar(punto.destino.pais)}</small></div>`
          : `<div class="globo__etiqueta">${escapar(punto.emisora.nombre)}<small>según el catálogo</small></div>`;
      })
      .onPointClick((p) => {
        const punto = p as Punto;
        if (punto.tipo === 'destino') callbacks.current.alElegirDestino(punto.destino);
      })
      .onPointHover((p) => {
        const punto = p as Punto | null;
        callbacks.current.alPasarPorDestino(punto && punto.tipo === 'destino' ? punto.destino : null);
      })
      .showPointerCursor((tipo, datos) => tipo === 'label' || (tipo === 'point' && (datos as Punto).tipo === 'destino'))
      .labelsData(destinos)
      .labelLat((d) => (d as Destino).coordenadas.lat)
      .labelLng((d) => (d as Destino).coordenadas.lng)
      .labelText((d) => (d as Destino).nombre)
      .labelSize(1.1)
      .labelDotRadius(0)
      .labelColor(() => '#F5F0E6')
      .labelAltitude(0.03)
      .labelResolution(2)
      .onLabelClick((d) => callbacks.current.alElegirDestino(d as Destino));

    const material = g.globeMaterial() as MeshPhongMaterial;
    material.color.set('#1A1E21');
    material.emissive.set('#0E1012');
    material.shininess = 4;

    g.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const controles = g.controls();
    // Sin giro automático: el destino elegido debe quedarse a la vista.
    controles.autoRotate = false;
    controles.enableDamping = !menosMovimiento;
    controles.minDistance = 140;
    controles.maxDistance = 600;

    // Enfoque inicial inmediato; los cambios posteriores de destino se animan en su propio efecto.
    const inicial = destinoInicial.current;
    if (inicial) g.pointOfView({ lat: inicial.coordenadas.lat, lng: inicial.coordenadas.lng, altitude: ALTITUD_DESTINO }, 0);

    const observador = new ResizeObserver(([entrada]) => {
      if (!entrada) return;
      g.width(entrada.contentRect.width).height(entrada.contentRect.height);
    });
    observador.observe(el);
    g.width(el.clientWidth).height(el.clientHeight);

    const visibilidad = () => {
      if (document.hidden) g.pauseAnimation();
      else g.resumeAnimation();
    };
    document.addEventListener('visibilitychange', visibilidad);

    globo.current = g;
    return () => {
      document.removeEventListener('visibilitychange', visibilidad);
      observador.disconnect();
      g.pauseAnimation();
      g._destructor();
      globo.current = null;
      el.replaceChildren();
    };
    // Los datos se actualizan en efectos separados; la instancia se crea una vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const g = globo.current;
    if (!g) return;
    g.labelsData(destinos);
  }, [destinos]);

  useEffect(() => {
    const g = globo.current;
    if (!g) return;
    const puntos: Punto[] = [
      ...destinos.map<PuntoDestino>((d) => ({ tipo: 'destino', destino: d, lat: d.coordenadas.lat, lng: d.coordenadas.lng })),
      ...emisoras
        .filter((e) => e.coordenadas !== null)
        .map<PuntoEmisora>((e) => ({ tipo: 'emisora', emisora: e, lat: e.coordenadas!.lat, lng: e.coordenadas!.lng })),
    ];
    g.pointsData(puntos);
  }, [destinos, emisoras]);

  useEffect(() => {
    const g = globo.current;
    if (!g || !destinoActual) return;
    if (primerEnfoque.current) {
      // El enfoque inicial ya se aplicó al crear la instancia.
      primerEnfoque.current = false;
      return;
    }
    const duracion = prefiereMenosMovimiento() ? 0 : 1200;
    g.pointOfView({ lat: destinoActual.coordenadas.lat, lng: destinoActual.coordenadas.lng, altitude: ALTITUD_DESTINO }, duracion);
  }, [destinoActual]);

  return <div ref={contenedor} className="globo" aria-hidden="true" />;
}

function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}
