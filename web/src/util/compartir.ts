import type { Emisora } from '../tipos';
import { formatear } from './ruta';

export type ResultadoCompartir = 'compartido' | 'copiado' | 'manual';

export function enlaceDeEmisora(emisora: Emisora, origen = window.location.origin): string {
  return `${origen}${formatear({ tipo: 'emisora', id: emisora.id })}`;
}

/**
 * Comparte el enlace de una emisora con lo que tenga el dispositivo: la hoja del sistema en móvil,
 * el portapapeles en escritorio. Si nada de eso está disponible, se devuelve `manual` para que la
 * interfaz enseñe el enlace y la persona lo copie a mano. Nunca se queda en nada sin avisar.
 */
export async function compartirEmisora(emisora: Emisora): Promise<ResultadoCompartir> {
  const url = enlaceDeEmisora(emisora);
  const texto = `${emisora.nombre} en RadioPirata`;
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: 'RadioPirata', text: texto, url });
      return 'compartido';
    } catch (e) {
      // Si la persona cierra la hoja de compartir no hay nada más que hacer.
      if (e instanceof DOMException && e.name === 'AbortError') return 'compartido';
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copiado';
  } catch {
    return 'manual';
  }
}
