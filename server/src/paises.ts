import type { Ciudad } from './tipos.js';

let nombres: Intl.DisplayNames | null | undefined;

/**
 * Nombre de un país en español. Primero el del índice propio, que está curado; si el país
 * no tiene ciudad en el índice, el que sabe Node; y si nada de eso, el propio código.
 */
export function nombreDePais(codigo: string, ciudades: Ciudad[]): string {
  const delIndice = ciudades.find((c) => c.codigoPais === codigo)?.pais;
  if (delIndice) return delIndice;
  if (nombres === undefined) {
    try {
      nombres = new Intl.DisplayNames(['es'], { type: 'region' });
    } catch {
      nombres = null;
    }
  }
  try {
    return nombres?.of(codigo) ?? codigo;
  } catch {
    return codigo;
  }
}
