import Globe, { type GlobeInstance } from 'globe.gl';
import { useEffect, useRef } from 'react';
import type { MeshPhongMaterial } from 'three';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import tierra from 'world-atlas/land-110m.json';
import type { Emisora, Lugar } from '../tipos';
import { prefiereMenosMovimiento } from '../util/entorno';

interface Props {
  /** Todas las ciudades del índice propio: son los puntos que se pueden abrir. */
  lugares: Lugar[];
  lugarEnfocado: Lugar | null;
  emisoras: Emisora[];
  alElegirLugar: (lugar: Lugar) => void;
  alPasarPorLugar: (lugar: Lugar | null) => void;
}

type InstanciaGlobo = GlobeInstance;

interface PuntoLugar {
  tipo: 'lugar';
  lugar: Lugar;
  enfocado: boolean;
  lat: number;
  lng: number;
}

interface PuntoEmisora {
  tipo: 'emisora';
  emisora: Emisora;
  lat: number;
  lng: number;
}

type Punto = PuntoLugar | PuntoEmisora;

const ALTITUD_DESTINO = 1.6;
const topologia = tierra as unknown as Topology;
const superficie = feature(topologia, topologia.objects['land'] as Parameters<typeof feature>[1]);
const poligonos = superficie.type === 'FeatureCollection' ? superficie.features : [superficie];

/**
 * Integra Globe.gl con React: una instancia por montaje, limpieza completa al desmontar,
 * pausa del render cuando la pestaña no está visible y respeto de prefers-reduced-motion.
 * Los puntos son las ciudades del índice propio; las emisoras solo aparecen si el catálogo
 * da coordenadas para ellas, nunca inventadas a partir del país.
 */
export function Globo({ lugares, lugarEnfocado, emisoras, alElegirLugar, alPasarPorLugar }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const globo = useRef<InstanciaGlobo | null>(null);
  const callbacks = useRef({ alElegirLugar, alPasarPorLugar });
  callbacks.current = { alElegirLugar, alPasarPorLugar };
  const enfoqueInicial = useRef(lugarEnfocado);
  const primerEnfoque = useRef(true);

  useEffect(() => {
    const el = contenedor.current;
    if (!el) return;
    const menosMovimiento = prefiereMenosMovimiento();

    // Sin animación de entrada: pisaría el enfoque inicial del lugar.
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
      .pointColor((p) => colorDePunto(p as Punto))
      .pointAltitude((p) => ((p as Punto).tipo === 'lugar' ? 0.02 : 0.008))
      .pointRadius((p) => radioDePunto(p as Punto))
      .pointsMerge(false)
      .pointLabel((p) => etiquetaDePunto(p as Punto))
      .onPointClick((p) => {
        const punto = p as Punto;
        if (punto.tipo === 'lugar') callbacks.current.alElegirLugar(punto.lugar);
      })
      .onPointHover((p) => {
        const punto = p as Punto | null;
        callbacks.current.alPasarPorLugar(punto && punto.tipo === 'lugar' ? punto.lugar : null);
      })
      .showPointerCursor((tipo, datos) => tipo === 'label' || (tipo === 'point' && (datos as Punto).tipo === 'lugar'))
      .labelLat((d) => (d as Lugar).coordenadas.lat)
      .labelLng((d) => (d as Lugar).coordenadas.lng)
      .labelText((d) => (d as Lugar).nombre)
      .labelSize(1.1)
      .labelDotRadius(0)
      .labelColor(() => '#F5F0E6')
      .labelAltitude(0.03)
      .labelResolution(2)
      .onLabelClick((d) => callbacks.current.alElegirLugar(d as Lugar));

    const material = g.globeMaterial() as MeshPhongMaterial;
    material.color.set('#1A1E21');
    material.emissive.set('#0E1012');
    material.shininess = 4;

    g.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const controles = g.controls();
    // Sin giro automático: el lugar elegido debe quedarse a la vista.
    controles.autoRotate = false;
    controles.enableDamping = !menosMovimiento;
    controles.minDistance = 140;
    controles.maxDistance = 600;

    const inicial = enfoqueInicial.current;
    g.pointOfView(
      inicial
        ? { lat: inicial.coordenadas.lat, lng: inicial.coordenadas.lng, altitude: ALTITUD_DESTINO }
        : { lat: 20, lng: 0, altitude: 2.4 },
      0,
    );

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
    // Los datos se actualizan en efectos aparte; la instancia se crea una sola vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const g = globo.current;
    if (!g) return;
    // Solo se escribe el nombre del lugar abierto: 70 etiquetas a la vez taparían el mundo.
    g.labelsData(lugarEnfocado ? [lugarEnfocado] : []);
  }, [lugarEnfocado]);

  useEffect(() => {
    const g = globo.current;
    if (!g) return;
    const puntos: Punto[] = [
      ...lugares.map<PuntoLugar>((lugar) => ({
        tipo: 'lugar',
        lugar,
        enfocado: lugar.id === lugarEnfocado?.id,
        lat: lugar.coordenadas.lat,
        lng: lugar.coordenadas.lng,
      })),
      ...emisoras.flatMap<PuntoEmisora>((emisora) =>
        emisora.coordenadas
          ? [{ tipo: 'emisora', emisora, lat: emisora.coordenadas.lat, lng: emisora.coordenadas.lng }]
          : [],
      ),
    ];
    g.pointsData(puntos);
  }, [lugares, emisoras, lugarEnfocado]);

  useEffect(() => {
    const g = globo.current;
    if (!g || !lugarEnfocado) return;
    // El primer lugar suele llegar después de montarse el globo: entonces se coloca de golpe,
    // sin un viaje largo desde la vista por defecto. Los cambios posteriores sí se animan.
    const yaColocado = primerEnfoque.current && enfoqueInicial.current?.id === lugarEnfocado.id;
    const duracion = primerEnfoque.current ? 0 : prefiereMenosMovimiento() ? 0 : 1200;
    primerEnfoque.current = false;
    if (yaColocado) return;
    g.pointOfView(
      { lat: lugarEnfocado.coordenadas.lat, lng: lugarEnfocado.coordenadas.lng, altitude: ALTITUD_DESTINO },
      duracion,
    );
  }, [lugarEnfocado]);

  return <div ref={contenedor} className="globo" aria-hidden="true" />;
}

function colorDePunto(punto: Punto): string {
  if (punto.tipo === 'emisora') return '#F5F0E6';
  return punto.enfocado ? '#F2CB57' : 'rgba(245, 240, 230, 0.55)';
}

function radioDePunto(punto: Punto): number {
  if (punto.tipo === 'emisora') return 0.22;
  return punto.enfocado ? 0.55 : 0.3;
}

function etiquetaDePunto(punto: Punto): string {
  return punto.tipo === 'lugar'
    ? `<div class="globo__etiqueta">${escapar(punto.lugar.nombre)}<small>${escapar(punto.lugar.pais)}</small></div>`
    : `<div class="globo__etiqueta">${escapar(punto.emisora.nombre)}<small>según el catálogo</small></div>`;
}

function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}
