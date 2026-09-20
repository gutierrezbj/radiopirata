import type { Lugar } from '../tipos';
import { normalizar } from './entorno';

/**
 * Resuelve texto libre contra el índice propio de ciudades que ya está en el navegador.
 * Misma escala de coincidencias que el servidor, para que escribir «Tokyo» lleve siempre al mismo sitio.
 */
export function buscarLugares(texto: string, lugares: Lugar[], limite = 6): Lugar[] {
  const q = normalizar(texto);
  if (q.length < 2) return [];
  const puntuados: Array<{ lugar: Lugar; peso: number }> = [];
  for (const lugar of lugares) {
    const nombre = normalizar(lugar.nombre);
    const alias = lugar.alias.map(normalizar);
    const pais = normalizar(lugar.pais);
    let peso = Number.POSITIVE_INFINITY;
    if (nombre === q) peso = 0;
    else if (alias.includes(q)) peso = 1;
    else if (nombre.startsWith(q)) peso = 2;
    else if (alias.some((a) => a.startsWith(q))) peso = 3;
    else if (pais === q) peso = 4;
    else if (pais.startsWith(q)) peso = 5;
    else if (nombre.includes(q)) peso = 6;
    if (Number.isFinite(peso)) puntuados.push({ lugar, peso });
  }
  return puntuados
    .sort((a, b) => a.peso - b.peso || a.lugar.nombre.localeCompare(b.lugar.nombre, 'es'))
    .slice(0, limite)
    .map((p) => p.lugar);
}

/**
 * Lugar al que llevar directamente al pulsar «Explorar»: solo cuando el texto es
 * exactamente el nombre o un alias de una ciudad. Si hay duda, se muestran resultados.
 */
export function lugarExacto(texto: string, lugares: Lugar[]): Lugar | null {
  const q = normalizar(texto);
  if (q.length < 2) return null;
  const coincide = lugares.filter((l) => normalizar(l.nombre) === q || l.alias.some((a) => normalizar(a) === q));
  return coincide.length === 1 ? (coincide[0] as Lugar) : null;
}

export function lugarAlAzar(lugares: Lugar[], azar: () => number = Math.random): Lugar | null {
  if (lugares.length === 0) return null;
  return lugares[Math.floor(azar() * lugares.length)] ?? null;
}
