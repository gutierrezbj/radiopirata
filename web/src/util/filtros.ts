import type { Emisora } from '../tipos';
import { normalizar } from './entorno';

export interface Filtro {
  etiqueta: string;
  cuantas: number;
}

/**
 * Estilos que de verdad están en la lista que se está viendo, de más a menos frecuentes.
 * Solo se ofrecen los que agrupan más de una emisora: un filtro que deja una sola no filtra nada.
 */
export function filtrosDe(emisoras: Emisora[], max = 8): Filtro[] {
  const cuenta = new Map<string, { etiqueta: string; cuantas: number }>();
  for (const emisora of emisoras) {
    const vistas = new Set<string>();
    for (const bruta of emisora.etiquetas) {
      const clave = normalizar(bruta);
      if (clave.length < 2 || clave.length > 24 || vistas.has(clave)) continue;
      vistas.add(clave);
      const previa = cuenta.get(clave);
      if (previa) previa.cuantas += 1;
      else cuenta.set(clave, { etiqueta: clave, cuantas: 1 });
    }
  }
  return [...cuenta.values()]
    .filter((f) => f.cuantas > 1)
    .sort((a, b) => b.cuantas - a.cuantas || a.etiqueta.localeCompare(b.etiqueta, 'es'))
    .slice(0, max);
}

export function filtrarPorEtiqueta(emisoras: Emisora[], etiqueta: string | null): Emisora[] {
  if (etiqueta === null) return emisoras;
  return emisoras.filter((e) => e.etiquetas.some((t) => normalizar(t) === etiqueta));
}
