function entero(nombre: string, porDefecto: number): number {
  const bruto = process.env[nombre];
  if (bruto === undefined || bruto === '') return porDefecto;
  const n = Number(bruto);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`${nombre} debe ser un entero positivo`);
  return n;
}

export const config = {
  puerto: entero('PORT', 3001),
  webDist: process.env['WEB_DIST'] ?? '../web/dist',
  userAgent: process.env['RADIO_BROWSER_USER_AGENT'] ?? 'RadioPirata/0.1 (+https://github.com/gutierrezbj/radiopirata)',
  timeoutMs: entero('RADIO_BROWSER_TIMEOUT_MS', 6000),
  cacheTtlMs: entero('CACHE_TTL_MS', 15 * 60 * 1000),
  cacheMax: entero('CACHE_MAX', 200),
};
