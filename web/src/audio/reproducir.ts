import type { Emisora } from '../tipos';
import { cola } from './cola';
import { audio } from './instancia';

/**
 * Punto único para empezar a escuchar. Además de seleccionar la emisora, recuerda la lista
 * desde la que se eligió para que anterior/siguiente tengan un recorrido definido.
 */
export function reproducirDesde(emisora: Emisora, lista: Emisora[]): void {
  cola.fijar(lista);
  audio.seleccionar(emisora);
}
