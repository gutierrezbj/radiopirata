import type { Emisora } from '../tipos';

export interface Vecinas {
  anterior: Emisora | null;
  siguiente: Emisora | null;
}

/**
 * Emisora anterior y siguiente dentro de una lista. Sin dar la vuelta: en los extremos
 * no hay más, y la interfaz desactiva el botón en vez de saltar al otro lado.
 * Cambian de emisora, nunca de canción: una radio en directo no tiene pistas que pasar.
 */
export function vecinas(lista: Emisora[], actualId: string | null): Vecinas {
  if (actualId === null) return { anterior: null, siguiente: null };
  const i = lista.findIndex((e) => e.id === actualId);
  if (i === -1) return { anterior: null, siguiente: null };
  return { anterior: lista[i - 1] ?? null, siguiente: lista[i + 1] ?? null };
}

/**
 * Lista desde la que se eligió lo que suena ahora. Se fija al empezar a escuchar, así que
 * anterior/siguiente siguen recorriendo esa lista aunque después se navegue a otro lugar.
 */
class Cola {
  private lista: Emisora[] = [];
  private readonly oyentes = new Set<() => void>();

  fijar(lista: Emisora[]): void {
    this.lista = lista;
    for (const oyente of this.oyentes) oyente();
  }

  suscribir = (oyente: () => void): (() => void) => {
    this.oyentes.add(oyente);
    return () => this.oyentes.delete(oyente);
  };

  instantanea = (): Emisora[] => this.lista;
}

export const cola = new Cola();
