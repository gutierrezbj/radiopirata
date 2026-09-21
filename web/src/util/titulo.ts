import type { Lugar } from '../tipos';
import type { Ruta } from './ruta';

export const TITULO_BASE = 'RadioPirata — ¿Dónde escuchamos hoy?';

/**
 * Nombre de la vista actual. Sirve para el título de la pestaña y para anunciar el cambio
 * a quien navega con lector de pantalla, que si no se quedaría sin saber que la página cambió.
 */
export function nombreDeVista(ruta: Ruta, lugares: Lugar[]): string {
  switch (ruta.tipo) {
    case 'inicio':
      return 'Inicio';
    case 'lugar': {
      const lugar = lugares.find((l) => l.id === ruta.id);
      return lugar ? `${lugar.nombre}, ${lugar.pais}` : 'Lugar';
    }
    case 'busqueda':
      return `Búsqueda: ${ruta.q}`;
    case 'favoritas':
      return 'Mis favoritas';
    case 'recientes':
      return 'Recientes';
    case 'emisora':
      return 'Emisora compartida';
  }
}

export function tituloDeRuta(ruta: Ruta, lugares: Lugar[]): string {
  return ruta.tipo === 'inicio' ? TITULO_BASE : `${nombreDeVista(ruta, lugares)} · RadioPirata`;
}
