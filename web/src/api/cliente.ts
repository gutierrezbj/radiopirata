import type { Emisora, RespuestaBusqueda, RespuestaDestinos, RespuestaLugar, RespuestaLugares } from '../tipos';

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

export function obtenerLugares(signal?: AbortSignal): Promise<RespuestaLugares> {
  return pedir<RespuestaLugares>('/api/lugares', signal);
}

export function obtenerEmisorasDeLugar(lugarId: string, signal?: AbortSignal): Promise<RespuestaLugar> {
  return pedir<RespuestaLugar>(`/api/lugares/${encodeURIComponent(lugarId)}/emisoras`, signal);
}

export function buscar(
  consulta: string,
  pagina = 1,
  pais?: string | undefined,
  signal?: AbortSignal,
): Promise<RespuestaBusqueda> {
  const p = new URLSearchParams({ q: consulta, pagina: String(pagina) });
  if (pais) p.set('pais', pais);
  return pedir<RespuestaBusqueda>(`/api/buscar?${p.toString()}`, signal);
}

export function obtenerEmisora(id: string, signal?: AbortSignal): Promise<{ emisora: Emisora }> {
  return pedir<{ emisora: Emisora }>(`/api/emisoras/${encodeURIComponent(id)}`, signal);
}

/** Registra el inicio de una escucha. Se lanza y se olvida: nunca afecta a la reproducción. */
export function registrarClic(emisoraId: string): void {
  fetch(`/api/emisoras/${encodeURIComponent(emisoraId)}/clic`, { method: 'POST', keepalive: true }).catch(() => undefined);
}
