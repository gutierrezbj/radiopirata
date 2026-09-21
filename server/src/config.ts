function entero(nombre: string, porDefecto: number, minimo = 1): number {
  const bruto = process.env[nombre];
  if (bruto === undefined || bruto === '') return porDefecto;
  const n = Number(bruto);
  if (!Number.isInteger(n) || n < minimo) throw new Error(`${nombre} debe ser un entero mayor o igual que ${minimo}`);
  return n;
}

function booleano(nombre: string, porDefecto: boolean): boolean {
  const bruto = process.env[nombre];
  if (bruto === undefined || bruto === '') return porDefecto;
  if (['1', 'true', 'si', 'sí'].includes(bruto.toLowerCase())) return true;
  if (['0', 'false', 'no'].includes(bruto.toLowerCase())) return false;
  throw new Error(`${nombre} debe ser 1 o 0`);
}

export const config = {
  puerto: entero('PORT', 3001),
  webDist: process.env['WEB_DIST'] ?? '../web/dist',
  userAgent: process.env['RADIO_BROWSER_USER_AGENT'] ?? 'RadioPirata/0.1 (+https://github.com/gutierrezbj/radiopirata)',
  timeoutMs: entero('RADIO_BROWSER_TIMEOUT_MS', 6000),
  cacheTtlMs: entero('CACHE_TTL_MS', 15 * 60 * 1000),
  cacheMax: entero('CACHE_MAX', 200),
  /** Cuántos proxies hay por delante. Con nginx delante, 1. */
  proxiesDeConfianza: entero('TRUST_PROXY', 0, 0),
  /** Solo con HTTPS ya funcionando: si se activa antes, los navegadores no podrán entrar por http. */
  hsts: booleano('HSTS', false),
};
