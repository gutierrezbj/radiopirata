import { describe, expect, it } from 'vitest';
import type { Emisora } from '../src/tipos';
import { filtrarPorEtiqueta, filtrosDe } from '../src/util/filtros';

function emisora(id: string, etiquetas: string[]): Emisora {
  return {
    id,
    nombre: id,
    destinoId: '',
    pais: 'Portugal',
    codigoPais: 'PT',
    idioma: '',
    etiquetas,
    url: `https://ejemplo.test/${id}`,
    web: null,
    codec: 'MP3',
    bitrate: 128,
    coordenadas: null,
    ubicacionSegunCatalogo: '',
  };
}

const lista = [
  emisora('a', ['Jazz', 'news']),
  emisora('b', ['jazz', 'Pop']),
  emisora('c', ['POP', 'rock']),
  emisora('d', ['pop']),
  emisora('e', ['clásica']),
];

describe('filtrosDe', () => {
  it('cuenta estilos sin distinguir mayúsculas y los ordena por frecuencia', () => {
    expect(filtrosDe(lista)).toEqual([
      { etiqueta: 'pop', cuantas: 3 },
      { etiqueta: 'jazz', cuantas: 2 },
    ]);
  });

  it('no ofrece filtros que dejarían una sola emisora', () => {
    const etiquetas = filtrosDe(lista).map((f) => f.etiqueta);
    expect(etiquetas).not.toContain('news');
    expect(etiquetas).not.toContain('rock');
    expect(filtrosDe([emisora('x', ['unica'])])).toEqual([]);
  });

  it('no cuenta dos veces la misma etiqueta repetida en una emisora', () => {
    expect(filtrosDe([emisora('a', ['pop', 'Pop', 'POP']), emisora('b', ['pop'])])).toEqual([{ etiqueta: 'pop', cuantas: 2 }]);
  });

  it('respeta el máximo de filtros que se muestran', () => {
    const muchas = Array.from({ length: 20 }, (_, i) => emisora(`e${i}`, [`estilo${i % 10}`, `estilo${i % 10}`]));
    const repetidas = [...muchas, ...muchas.map((e, i) => emisora(`r${i}`, e.etiquetas))];
    expect(filtrosDe(repetidas, 3)).toHaveLength(3);
  });

  it('ignora etiquetas vacías o desmesuradas', () => {
    const rara = emisora('x', ['a', 'x'.repeat(40), 'pop']);
    expect(filtrosDe([rara, emisora('y', ['pop'])])).toEqual([{ etiqueta: 'pop', cuantas: 2 }]);
  });
});

describe('filtrarPorEtiqueta', () => {
  it('devuelve la lista entera sin filtro y solo las que encajan con uno', () => {
    expect(filtrarPorEtiqueta(lista, null)).toHaveLength(5);
    expect(filtrarPorEtiqueta(lista, 'pop').map((e) => e.id)).toEqual(['b', 'c', 'd']);
    expect(filtrarPorEtiqueta(lista, 'clasica').map((e) => e.id)).toEqual(['e']);
    expect(filtrarPorEtiqueta(lista, 'inexistente')).toEqual([]);
  });
});
