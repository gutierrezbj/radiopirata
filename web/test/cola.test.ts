import { describe, expect, it, vi } from 'vitest';
import { cola, vecinas } from '../src/audio/cola';
import type { Emisora } from '../src/tipos';

function emisora(id: string): Emisora {
  return {
    id,
    nombre: `Emisora ${id}`,
    destinoId: '',
    pais: 'Portugal',
    codigoPais: 'PT',
    idioma: '',
    etiquetas: [],
    url: `https://ejemplo.test/${id}`,
    web: null,
    codec: 'MP3',
    bitrate: 128,
    coordenadas: null,
    ubicacionSegunCatalogo: '',
  };
}

const lista = [emisora('a'), emisora('b'), emisora('c')];

describe('vecinas', () => {
  it('encuentra la anterior y la siguiente dentro de la lista', () => {
    const { anterior, siguiente } = vecinas(lista, 'b');
    expect(anterior?.id).toBe('a');
    expect(siguiente?.id).toBe('c');
  });

  it('no da la vuelta en los extremos', () => {
    expect(vecinas(lista, 'a').anterior).toBeNull();
    expect(vecinas(lista, 'a').siguiente?.id).toBe('b');
    expect(vecinas(lista, 'c').siguiente).toBeNull();
  });

  it('no propone nada si la emisora no está en la lista o no hay ninguna sonando', () => {
    expect(vecinas(lista, 'z')).toEqual({ anterior: null, siguiente: null });
    expect(vecinas(lista, null)).toEqual({ anterior: null, siguiente: null });
    expect(vecinas([], 'a')).toEqual({ anterior: null, siguiente: null });
  });

  it('con una sola emisora no hay recorrido', () => {
    expect(vecinas([emisora('a')], 'a')).toEqual({ anterior: null, siguiente: null });
  });
});

describe('cola', () => {
  it('guarda la lista desde la que se eligió y avisa a quien escucha', () => {
    const oyente = vi.fn();
    const cancelar = cola.suscribir(oyente);
    cola.fijar(lista);
    expect(cola.instantanea()).toBe(lista);
    expect(oyente).toHaveBeenCalledTimes(1);
    cancelar();
    cola.fijar([]);
    expect(oyente).toHaveBeenCalledTimes(1);
  });
});
