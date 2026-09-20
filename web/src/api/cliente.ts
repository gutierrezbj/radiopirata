import type { RespuestaDestinos, RespuestaEmisoras } from '../tipos';

export class ErrorApi extends Error {
  constructor(
    mensaje: string,
    readonly estado?: number,
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }
}

async function pedir<T>(ruta: string, signal?: AbortSignal): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(ruta, { signal, headers: { Accept: 'application/json' } });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new ErrorApi('No hay conexión con RadioPirata. Comprueba tu red e inténtalo de nuevo.');
  }
  let datos: unknown = null;
  try {
    datos = await respuesta.json();
  } catch {
    // cuerpo vacío o no JSON
  }
  if (!respuesta.ok) {
    const mensaje =
      datos && typeof datos === 'object' && 'error' in datos && typeof (datos as { error: unknown }).error === 'string'
        ? (datos as { error: string }).error
        : 'RadioPirata no ha podido responder.';
    throw new ErrorApi(mensaje, respuesta.status);
  }
  return datos as T;
}

export function obtenerDestinos(signal?: AbortSignal): Promise<RespuestaDestinos> {
  return pedir<RespuestaDestinos>('/api/destinos', signal);
}

export function obtenerEmisoras(destinoId: string, signal?: AbortSignal): Promise<RespuestaEmisoras> {
  return pedir<RespuestaEmisoras>(`/api/destinos/${encodeURIComponent(destinoId)}/emisoras`, signal);
}

/** Registra el inicio de una escucha. Se lanza y se olvida: nunca afecta a la reproducción. */
export function registrarClic(emisoraId: string): void {
  fetch(`/api/emisoras/${encodeURIComponent(emisoraId)}/clic`, { method: 'POST', keepalive: true }).catch(() => undefined);
}
