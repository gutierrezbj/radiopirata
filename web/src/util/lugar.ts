import type { Emisora } from '../tipos';

let nombresRegion: Intl.DisplayNames | null | undefined;

/** Nombre del país en español a partir del código ISO; si no se puede, el texto del catálogo. */
export function nombrePais(codigo: string, respaldo: string): string {
  if (nombresRegion === undefined) {
    try {
      nombresRegion = new Intl.DisplayNames(['es'], { type: 'region' });
    } catch {
      nombresRegion = null;
    }
  }
  if (!nombresRegion || !/^[A-Z]{2}$/i.test(codigo)) return respaldo;
  try {
    return nombresRegion.of(codigo.toUpperCase()) ?? respaldo;
  } catch {
    return respaldo;
  }
}

/** «Ciudad según el catálogo, País». La ciudad es la que declara Radio Browser, no una comprobación propia. */
export function lugarDeEmisora(emisora: Emisora): string {
  const pais = nombrePais(emisora.codigoPais, emisora.pais);
  const ciudad = emisora.ubicacionSegunCatalogo.trim();
  if (!ciudad) return pais;
  const ciudadBonita = ciudad.charAt(0).toUpperCase() + ciudad.slice(1);
  return `${ciudadBonita}, ${pais}`;
}
