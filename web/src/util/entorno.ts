export function hayWebGL(): boolean {
  try {
    const lienzo = document.createElement('canvas');
    return Boolean(lienzo.getContext('webgl2') ?? lienzo.getContext('webgl'));
  } catch {
    return false;
  }
}

export function prefiereMenosMovimiento(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Densidad de píxeles a la que dibujar el globo. En pantallas pequeñas o equipos modestos se
 * baja el listón: más allá de cierto punto no se nota la diferencia y sí se nota la batería.
 */
export function pixelRatioAdecuado(): number {
  if (typeof window === 'undefined') return 1;
  const dpr = window.devicePixelRatio || 1;
  const nucleos = navigator.hardwareConcurrency ?? 4;
  const modesto = nucleos <= 4 || window.innerWidth < 768;
  return Math.min(dpr, modesto ? 1.5 : 2);
}

/** Normaliza texto para comparar búsquedas: minúsculas y sin acentos. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}
