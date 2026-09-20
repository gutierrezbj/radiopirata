const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ID_DESTINO = /^[a-z0-9-]{1,32}$/;

export function esUuid(valor: unknown): valor is string {
  return typeof valor === 'string' && UUID.test(valor);
}

export function esIdDestino(valor: unknown): valor is string {
  return typeof valor === 'string' && ID_DESTINO.test(valor);
}

/** Acepta solo URLs http(s) bien formadas, sin credenciales incrustadas ni longitud excesiva. */
export function urlDeAudioValida(valor: unknown): valor is string {
  if (typeof valor !== 'string' || valor.length === 0 || valor.length > 2048) return false;
  let u: URL;
  try {
    u = new URL(valor);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
  if (u.username || u.password) return false;
  return true;
}

export function urlWebValida(valor: unknown): valor is string {
  return urlDeAudioValida(valor);
}
