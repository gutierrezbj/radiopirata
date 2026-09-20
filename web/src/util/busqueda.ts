import type { Destino } from '../tipos';
import { normalizar } from './entorno';

/**
 * Resuelve un texto libre a uno de los destinos disponibles (nombre o alias).
 * Devuelve null si no coincide: la primera versión no busca en todo el mundo.
 */
export function resolverDestino(texto: string, destinos: Destino[]): Destino | null {
  const consulta = normalizar(texto);
  if (consulta.length < 2) return null;
  const exacto = destinos.find((d) => normalizar(d.nombre) === consulta || d.alias.some((a) => normalizar(a) === consulta));
  if (exacto) return exacto;
  const parcial = destinos.find(
    (d) =>
      normalizar(d.nombre).startsWith(consulta) ||
      d.alias.some((a) => normalizar(a).startsWith(consulta)) ||
      normalizar(d.pais).startsWith(consulta),
  );
  return parcial ?? null;
}

export function destinoAlAzar(destinos: Destino[], azar: () => number = Math.random): Destino | null {
  if (destinos.length === 0) return null;
  return destinos[Math.floor(azar() * destinos.length)] ?? null;
}
