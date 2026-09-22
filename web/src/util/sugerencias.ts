import type { Lugar, Pais } from '../tipos';
import { normalizar } from './entorno';
import { nombrePais } from './lugar';
import { buscarLugares } from './lugares';

export type Sugerencia =
  | { tipo: 'lugar'; clave: string; texto: string; detalle: string; lugar: Lugar }
  | { tipo: 'pais'; clave: string; texto: string; detalle: string; codigo: string; nombre: string };

/** Cuántas emisoras tiene el país, en español y con separador de millares. */
function cuantas(emisoras: number): string {
  return `${emisoras.toLocaleString('es')} ${emisoras === 1 ? 'emisora' : 'emisoras'}`;
}

/**
 * Lo que se ofrece mientras se escribe: primero las ciudades del índice propio, que llevan
 * a un sitio comprobado, y después los países del catálogo. Escribir «fra» propone Francia.
 *
 * Todo se compara sin acentos y sin mayúsculas, así que «mexico» encuentra «México» y
 * «Japon» encuentra «Japón»: nadie tiene que pelearse con el teclado.
 */
export function sugerencias(texto: string, lugares: Lugar[], paises: Pais[], max = 6): Sugerencia[] {
  const q = normalizar(texto);
  if (q.length < 2) return [];

  const deLugares: Sugerencia[] = buscarLugares(texto, lugares, max).map((lugar) => ({
    tipo: 'lugar',
    clave: `lugar:${lugar.id}`,
    texto: lugar.nombre,
    detalle: lugar.pais,
    lugar,
  }));

  const puntuados: Array<{ sugerencia: Sugerencia; peso: number; emisoras: number }> = [];
  for (const pais of paises) {
    const nombre = nombrePais(pais.codigo, pais.codigo);
    const comparable = normalizar(nombre);
    const peso = comparable === q ? 0 : normalizar(pais.codigo) === q ? 1 : comparable.startsWith(q) ? 2 : comparable.includes(q) ? 3 : -1;
    if (peso < 0) continue;
    puntuados.push({
      peso,
      emisoras: pais.emisoras,
      sugerencia: {
        tipo: 'pais',
        clave: `pais:${pais.codigo}`,
        texto: nombre,
        detalle: cuantas(pais.emisoras),
        codigo: pais.codigo,
        nombre,
      },
    });
  }
  const dePaises = puntuados
    .sort((a, b) => a.peso - b.peso || b.emisoras - a.emisoras || a.sugerencia.texto.localeCompare(b.sugerencia.texto, 'es'))
    .map((p) => p.sugerencia);

  // Las ciudades mandan, pero siempre se reserva sitio para un par de países: si escribes
  // «fra» y solo hubiera ciudades francesas, Francia entera seguiría siendo la respuesta buena.
  const huecoLugares = Math.min(deLugares.length, Math.max(max - Math.min(dePaises.length, 2), 0));
  return [...deLugares.slice(0, huecoLugares), ...dePaises].slice(0, max);
}
