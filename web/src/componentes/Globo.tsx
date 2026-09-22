import Globe, { type GlobeInstance } from 'globe.gl';
import { useEffect, useRef } from 'react';
import {
  AmbientLight,
  CylinderGeometry,
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  TorusGeometry,
  type MeshPhongMaterial,
} from 'three';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import tierra from 'world-atlas/land-110m.json';
import type { Emisora, Lugar } from '../tipos';
import { pixelRatioAdecuado, prefiereMenosMovimiento } from '../util/entorno';
import { posicionDelSol } from '../util/sol';

interface Props {
  /** Todas las ciudades del índice propio: son los puntos que se pueden abrir. */
  lugares: Lugar[];
  lugarEnfocado: Lugar | null;
  emisoras: Emisora[];
  /** Mientras se busca, el globo gira despacio: así se ve que la búsqueda está en marcha. */
  buscando?: boolean;
  /** Ciudad de la que sale lo que está sonando: su antena emite en verde. */
  lugarSonandoId?: string | null;
  alElegirLugar: (lugar: Lugar) => void;
  alPasarPorLugar: (lugar: Lugar | null) => void;
}

type InstanciaGlobo = GlobeInstance;

interface PuntoEmisora {
  tipo: 'emisora';
  emisora: Emisora;
  lat: number;
  lng: number;
}

type Punto = PuntoEmisora;

/** Una ciudad del índice sobre el globo, dibujada como una antena de radio. */
interface Antena {
  lugar: Lugar;
  enfocado: boolean;
  sonando: boolean;
}

const MARFIL = '#F5F0E6';
const AMBAR = '#F2CB57';
const GRIS = '#B5B0A7';
const VERDE = '#7FD39A';
/** Alto del mástil en unidades del globo, cuyo radio son 100. */
const ALTO_MASTIL = 3.4;

/**
 * La antena de cada ciudad: base, mástil, punta y tres anillos de emisión encima. Apagada,
 * los anillos son grises y discretos; cuando suena una emisora de esa ciudad se encienden en
 * verde. Los anillos son circulares a propósito: así se leen igual desde cualquier ángulo.
 */
function crearAntena({ enfocado, sonando }: Antena): Group {
  const grupo = new Group();
  const color = enfocado ? AMBAR : MARFIL;

  const base = new Mesh(
    new CylinderGeometry(0.7, 0.9, 0.3, 10),
    new MeshBasicMaterial({ color, transparent: true, opacity: enfocado ? 0.9 : 0.5 }),
  );
  base.rotation.x = Math.PI / 2;
  base.position.z = 0.15;
  grupo.add(base);

  const mastil = new Mesh(
    new CylinderGeometry(0.16, 0.24, ALTO_MASTIL, 6),
    new MeshBasicMaterial({ color, transparent: true, opacity: enfocado ? 1 : 0.75 }),
  );
  mastil.rotation.x = Math.PI / 2;
  mastil.position.z = ALTO_MASTIL / 2;
  grupo.add(mastil);

  const punta = new Mesh(new SphereGeometry(0.34, 10, 8), new MeshBasicMaterial({ color: sonando ? VERDE : color }));
  punta.position.z = ALTO_MASTIL;
  grupo.add(punta);

  const anillos: Array<[number, number]> = [
    [0.55, 0.45],
    [0.95, 0.9],
    [1.4, 1.4],
  ];
  for (const [radio, altura] of anillos) {
    const onda = new Mesh(
      new TorusGeometry(radio, 0.09, 6, 22),
      new MeshBasicMaterial({
        color: sonando ? VERDE : GRIS,
        transparent: true,
        opacity: sonando ? 0.95 - radio * 0.25 : 0.3 - radio * 0.08,
      }),
    );
    onda.position.z = ALTO_MASTIL + altura;
    grupo.add(onda);
  }

  // La ciudad abierta y la que suena se ven un poco mas grandes: a esta distancia, si no,
  // la antena encendida se pierde entre las demas.
  const escala = sonando ? 1.45 : enfocado ? 1.2 : 1;
  grupo.scale.set(escala, escala, escala);

  return grupo;
}

const ALTITUD_DESTINO = 1.6;
/** Tiempo sin tocar el globo tras el cual se deja de dibujar. Nada se mueve solo, así que no se pierde nada. */
const SIESTA_MS = 3000;
/** Cada cuánto se recoloca el sol. En cinco minutos se mueve poco más de un grado. */
const RELOJ_SOLAR_MS = 5 * 60_000;
const topologia = tierra as unknown as Topology;
const superficie = feature(topologia, topologia.objects['land'] as Parameters<typeof feature>[1]);
const poligonos = superficie.type === 'FeatureCollection' ? superficie.features : [superficie];

/**
 * Integra Globe.gl con React: una instancia por montaje, limpieza completa al desmontar,
 * pausa del render cuando la pestaña no está visible y respeto de prefers-reduced-motion.
 * Los puntos son las ciudades del índice propio; las emisoras solo aparecen si el catálogo
 * da coordenadas para ellas, nunca inventadas a partir del país.
 */
export function Globo({
  lugares,
  lugarEnfocado,
  emisoras,
  buscando = false,
  lugarSonandoId = null,
  alElegirLugar,
  alPasarPorLugar,
}: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const globo = useRef<InstanciaGlobo | null>(null);
  const callbacks = useRef({ alElegirLugar, alPasarPorLugar });
  callbacks.current = { alElegirLugar, alPasarPorLugar };
  const enfoqueInicial = useRef(lugarEnfocado);
  const primerEnfoque = useRef(true);
  /** Vuelve a dibujar el globo y programa la siguiente siesta. La coloca el efecto de montaje. */
  const despertar = useRef<(durante?: number) => void>(() => undefined);
  /** Mantiene el globo dibujando sin siestas mientras dura el giro de búsqueda. */
  const mantenerDespierto = useRef<(valor: boolean) => void>(() => undefined);
  const girar = useRef<(valor: boolean) => void>(() => undefined);

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
      .objectLat((d) => (d as Antena).lugar.coordenadas.lat)
      .objectLng((d) => (d as Antena).lugar.coordenadas.lng)
      .objectAltitude(0)
      .objectFacesSurface(true)
      .objectThreeObject((d) => crearAntena(d as Antena))
      .objectLabel((d) => etiquetaDeLugar((d as Antena).lugar))
      .onObjectClick((d) => callbacks.current.alElegirLugar((d as Antena).lugar))
      .onObjectHover((d) => callbacks.current.alPasarPorLugar(d ? (d as Antena).lugar : null))
      .pointLat((p) => (p as Punto).lat)
      .pointLng((p) => (p as Punto).lng)
      .pointColor(() => colorDePunto())
      .pointAltitude(0.008)
      .pointRadius(() => radioDePunto())
      .pointsMerge(false)
      .pointLabel((p) => etiquetaDePunto(p as Punto))
      .showPointerCursor((tipo) => tipo === 'label' || tipo === 'object')
      .labelLat((d) => (d as Lugar).coordenadas.lat)
      .labelLng((d) => (d as Lugar).coordenadas.lng)
      // La fuente que usa la librería para las etiquetas no tiene acentos y pinta «M?xico».
      .labelText((d) => sinAcentos((d as Lugar).nombre))
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

    // Día y noche de verdad: una luz cálida desde donde está el sol ahora y poca luz ambiente,
    // así la mitad del mundo que duerme se ve más oscura. Se recoloca cada pocos minutos.
    const ambiente = new AmbientLight(0xffffff, 0.3);
    const sol = new DirectionalLight(0xfff1d0, 1.25);
    g.lights([ambiente, sol]);
    const colocarSol = () => {
      const p = posicionDelSol(new Date());
      sol.position.set(p.x, p.y, p.z);
    };
    colocarSol();

    g.renderer().setPixelRatio(pixelRatioAdecuado());
    const controles = g.controls();
    // Quieto por defecto: el lugar elegido debe quedarse a la vista. Solo gira mientras se busca.
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

    // El globo no gira solo: cuando nadie lo toca, no hace falta redibujarlo sesenta veces por
    // segundo. Se duerme tras unos segundos de calma y se despierta con cualquier interacción.
    let siesta: ReturnType<typeof setTimeout> | null = null;
    let dormido = false;
    let sinSiestas = false;
    const dormir = () => {
      if (dormido || sinSiestas) return;
      dormido = true;
      g.pauseAnimation();
    };
    const activar = (durante = SIESTA_MS) => {
      if (dormido) {
        dormido = false;
        g.resumeAnimation();
      }
      if (siesta !== null) clearTimeout(siesta);
      siesta = setTimeout(dormir, durante);
    };
    despertar.current = activar;
    mantenerDespierto.current = (valor) => {
      sinSiestas = valor;
      activar();
    };
    // El giro automático solo se enciende mientras se busca: con un lugar elegido, el sitio
    // tiene que quedarse quieto delante de quien mira.
    girar.current = (valor) => {
      controles.autoRotate = valor && !menosMovimiento;
      controles.autoRotateSpeed = 0.55;
    };
    activar();
    const relojSolar = setInterval(() => {
      colocarSol();
      activar();
    }, RELOJ_SOLAR_MS);

    const interaccion = () => activar();
    for (const evento of ['pointerdown', 'pointermove', 'wheel', 'touchstart'] as const) {
      el.addEventListener(evento, interaccion, { passive: true });
    }

    const observador = new ResizeObserver(([entrada]) => {
      if (!entrada) return;
      g.width(entrada.contentRect.width).height(entrada.contentRect.height);
      activar();
    });
    observador.observe(el);
    g.width(el.clientWidth).height(el.clientHeight);

    const visibilidad = () => {
      if (document.hidden) dormir();
      else activar();
    };
    document.addEventListener('visibilitychange', visibilidad);

    globo.current = g;
    return () => {
      document.removeEventListener('visibilitychange', visibilidad);
      for (const evento of ['pointerdown', 'pointermove', 'wheel', 'touchstart'] as const) {
        el.removeEventListener(evento, interaccion);
      }
      if (siesta !== null) clearTimeout(siesta);
      clearInterval(relojSolar);
      despertar.current = () => undefined;
      mantenerDespierto.current = () => undefined;
      girar.current = () => undefined;
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
    despertar.current();
  }, [lugarEnfocado]);

  useEffect(() => {
    const g = globo.current;
    if (!g) return;
    g.objectsData(
      lugares.map<Antena>((lugar) => ({
        lugar,
        enfocado: lugar.id === lugarEnfocado?.id,
        sonando: lugar.id === lugarSonandoId,
      })),
    );
    despertar.current();
  }, [lugares, lugarEnfocado, lugarSonandoId]);

  useEffect(() => {
    const g = globo.current;
    if (!g) return;
    // Las emisoras solo se pintan si el catálogo da coordenadas; nunca se deducen del país.
    g.pointsData(
      emisoras.flatMap<Punto>((emisora) =>
        emisora.coordenadas
          ? [{ tipo: 'emisora', emisora, lat: emisora.coordenadas.lat, lng: emisora.coordenadas.lng }]
          : [],
      ),
    );
    despertar.current();
  }, [emisoras]);

  useEffect(() => {
    const g = globo.current;
    if (!g || !lugarEnfocado) return;
    // El primer lugar suele llegar después de montarse el globo: entonces se coloca de golpe,
    // sin un viaje largo desde la vista por defecto. Los cambios posteriores sí se animan.
    const yaColocado = primerEnfoque.current && enfoqueInicial.current?.id === lugarEnfocado.id;
    const duracion = primerEnfoque.current ? 0 : prefiereMenosMovimiento() ? 0 : 1200;
    primerEnfoque.current = false;
    if (yaColocado) return;
    // Se mantiene dibujando mientras dura el viaje de cámara, y un poco más.
    despertar.current(duracion + SIESTA_MS);
    g.pointOfView(
      { lat: lugarEnfocado.coordenadas.lat, lng: lugarEnfocado.coordenadas.lng, altitude: ALTITUD_DESTINO },
      duracion,
    );
  }, [lugarEnfocado]);

  // Mientras el catálogo responde, el globo gira despacio. Es la única señal de que algo
  // está pasando: sin ella parece que la búsqueda no ha salido.
  useEffect(() => {
    girar.current(buscando);
    mantenerDespierto.current(buscando);
    return () => {
      girar.current(false);
      mantenerDespierto.current(false);
    };
  }, [buscando]);

  return <div ref={contenedor} className="globo" aria-hidden="true" />;
}

function colorDePunto(): string {
  return MARFIL;
}

function radioDePunto(): number {
  return 0.22;
}

function etiquetaDePunto(punto: Punto): string {
  return `<div class="globo__etiqueta">${escapar(punto.emisora.nombre)}<small>según el catálogo</small></div>`;
}

function etiquetaDeLugar(lugar: Lugar): string {
  return `<div class="globo__etiqueta">${escapar(lugar.nombre)}<small>${escapar(lugar.pais)}</small></div>`;
}

function sinAcentos(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}
