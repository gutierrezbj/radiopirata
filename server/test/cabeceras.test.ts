import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { crearApp } from '../src/app.js';
import { CSP } from '../src/cabeceras.js';
import { Catalogo } from '../src/catalogo.js';
import { cargarCiudades } from '../src/lugares.js';
import { ClienteRadioBrowser } from '../src/radioBrowser.js';
import { cargarSeleccion } from '../src/seleccion.js';

function crearServidor(hsts: boolean): Promise<{ servidor: Server; base: string }> {
  const cliente = new ClienteRadioBrowser({
    userAgent: 'x',
    timeoutMs: 50,
    fetchFn: (async () => {
      throw new Error('sin red en pruebas');
    }) as unknown as typeof fetch,
    descubrir: async () => ['nadie.test'],
  });
  const catalogo = new Catalogo(cargarSeleccion(), cliente, { ttlMs: 1000, max: 10 }, cargarCiudades());
  const app = crearApp({ catalogo, hsts });
  return new Promise((resolver) => {
    const servidor = app.listen(0, () =>
      resolver({ servidor, base: `http://127.0.0.1:${(servidor.address() as AddressInfo).port}` }),
    );
  });
}

let sinHsts: { servidor: Server; base: string };
let conHsts: { servidor: Server; base: string };

beforeAll(async () => {
  [sinHsts, conHsts] = await Promise.all([crearServidor(false), crearServidor(true)]);
});

afterAll(async () => {
  await Promise.all(
    [sinHsts, conHsts].map((s) => new Promise<void>((resolver) => s.servidor.close(() => resolver()))),
  );
});

describe('Cabeceras de seguridad', () => {
  it('envía la política de contenidos y las cabeceras defensivas', async () => {
    const r = await fetch(`${sinHsts.base}/api/salud`);
    expect(r.headers.get('content-security-policy')).toBe(CSP);
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    expect(r.headers.get('x-frame-options')).toBe('DENY');
    expect(r.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(r.headers.get('permissions-policy')).toContain('geolocation=()');
    expect(r.headers.get('x-powered-by')).toBeNull();
  });

  it('deja sonar audio de cualquier emisora HTTPS y nada más de fuera', () => {
    expect(CSP).toContain('media-src https:');
    expect(CSP).toContain("connect-src 'self'");
    expect(CSP).toContain("frame-ancestors 'none'");
  });

  it('no admite código de fuera aunque sí estilos en línea, que necesita el globo', () => {
    expect(CSP).toContain("script-src 'self'");
    expect(CSP).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(CSP).not.toContain('unsafe-eval');
    expect(CSP).toContain("style-src 'self' 'unsafe-inline'");
  });

  it('solo manda HSTS cuando se pide explícitamente', async () => {
    expect((await fetch(`${sinHsts.base}/api/salud`)).headers.get('strict-transport-security')).toBeNull();
    expect((await fetch(`${conHsts.base}/api/salud`)).headers.get('strict-transport-security')).toContain('max-age=31536000');
  });

  it('comprime las respuestas grandes cuando el navegador lo admite', async () => {
    const r = await fetch(`${sinHsts.base}/api/lugares`, { headers: { 'Accept-Encoding': 'gzip' } });
    expect(r.headers.get('content-encoding')).toBe('gzip');
    const datos = (await r.json()) as { lugares: unknown[] };
    expect(datos.lugares.length).toBeGreaterThan(50);
  });
});
