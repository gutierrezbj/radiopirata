import { useSyncExternalStore } from 'react';

export type Ruta =
  | { tipo: 'inicio' }
  | { tipo: 'lugar'; id: string }
  /** `pais` es el código ISO de dos letras: el catálogo busca países por código, no por su nombre en español. */
  | { tipo: 'busqueda'; q: string; pais?: string }
  | { tipo: 'favoritas' }
  | { tipo: 'recientes' }
  | { tipo: 'emisora'; id: string };

const ID_LUGAR = /^[a-z0-9-]{1,32}$/;
const CODIGO_PAIS = /^[A-Za-z]{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_CONSULTA = 60;

/** Lee la ruta de una cadena de consulta. Lo que no se entiende se trata como el inicio. */
export function analizar(busqueda: string): Ruta {
  const p = new URLSearchParams(busqueda);
  const emisora = p.get('emisora');
  if (emisora !== null && UUID.test(emisora)) return { tipo: 'emisora', id: emisora.toLowerCase() };
  const lugar = p.get('lugar');
  if (lugar !== null && ID_LUGAR.test(lugar)) return { tipo: 'lugar', id: lugar };
  const q = p.get('q');
  if (q !== null) {
    const limpio = q.replace(/\s+/g, ' ').trim().slice(0, MAX_CONSULTA);
    if (limpio.length >= 2) {
      const pais = p.get('pais');
      return pais !== null && CODIGO_PAIS.test(pais)
        ? { tipo: 'busqueda', q: limpio, pais: pais.toUpperCase() }
        : { tipo: 'busqueda', q: limpio };
    }
  }
  const vista = p.get('vista');
  if (vista === 'favoritas') return { tipo: 'favoritas' };
  if (vista === 'recientes') return { tipo: 'recientes' };
  return { tipo: 'inicio' };
}

export function formatear(ruta: Ruta): string {
  switch (ruta.tipo) {
    case 'lugar':
      return `/?lugar=${encodeURIComponent(ruta.id)}`;
    case 'busqueda':
      return ruta.pais
        ? `/?q=${encodeURIComponent(ruta.q)}&pais=${encodeURIComponent(ruta.pais)}`
        : `/?q=${encodeURIComponent(ruta.q)}`;
    case 'favoritas':
      return '/?vista=favoritas';
    case 'recientes':
      return '/?vista=recientes';
    case 'emisora':
      return `/?emisora=${encodeURIComponent(ruta.id)}`;
    case 'inicio':
      return '/';
  }
}

/** Clave estable para saber si dos rutas son la misma sin comparar objetos. */
export function claveDeRuta(ruta: Ruta): string {
  return formatear(ruta);
}

let actual: Ruta = typeof window === 'undefined' ? { tipo: 'inicio' } : analizar(window.location.search);
const oyentes = new Set<() => void>();
let navegaciones = 0;

/**
 * ¿Ha navegado ya la persona dentro de la aplicación?
 * Sirve para mover el foco al cambiar de vista sin robárselo a quien acaba de abrir un enlace.
 */
export function huboNavegacion(): boolean {
  return navegaciones > 0;
}

function avisar(): void {
  for (const oyente of oyentes) oyente();
}

export function navegar(ruta: Ruta, reemplazar = false): void {
  const destino = formatear(ruta);
  if (claveDeRuta(actual) === destino) return;
  actual = ruta;
  navegaciones++;
  if (reemplazar) window.history.replaceState(null, '', destino);
  else window.history.pushState(null, '', destino);
  avisar();
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    actual = analizar(window.location.search);
    navegaciones++;
    avisar();
  });
}

function suscribir(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

function instantanea(): Ruta {
  return actual;
}

export function useRuta(): Ruta {
  return useSyncExternalStore(suscribir, instantanea, instantanea);
}

/** Solo para pruebas: reinicia la ruta interna sin tocar el historial. */
export function _fijarRutaParaPruebas(ruta: Ruta, conNavegacion = false): void {
  actual = ruta;
  navegaciones = conNavegacion ? 1 : 0;
  avisar();
}
