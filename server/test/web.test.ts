import type { Server } from 'node:http';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { crearApp } from '../src/app.js';
import { Catalogo } from '../src/catalogo.js';
import { cargarCiudades } from '../src/lugares.js';
import { ClienteRadioBrowser } from '../src/radioBrowser.js';
import { cargarSeleccion } from '../src/seleccion.js';

let servidor: Server;
let base = '';

beforeAll(async () => {
  // Un build de la web de mentira, con lo justo para comprobar que se inyecta la tarjeta.
  const dist = mkdtempSync(join(tmpdir(), 'radiopirata-web-'));
  mkdirSync(join(dist, 'assets'));
  writeFileSync(join(dist, 'assets', 'app-abc123.js'), 'console.log(1)', 'utf8');
  writeFileSync(
    join(dist, 'index.html'),
    '<!doctype html><html lang="es"><head><meta name="description" content="x" /><title>RadioPirata — ¿Dónde escuchamos hoy?</title></head><body><div id="raiz"></div></body></html>',
    'utf8',
  );
  const cliente = new ClienteRadioBrowser({
    userAgent: 'x',
    timeoutMs: 50,
    fetchFn: (async () => {
      throw new Error('sin red en pruebas');
    }) as unknown as typeof fetch,
    descubrir: async () => ['nadie.test'],
  });
  const catalogo = new Catalogo(cargarSeleccion(), cliente, { ttlMs: 1000, max: 10 }, cargarCiudades());
  const app = crearApp({ catalogo, webDist: dist });
  await new Promise<void>((resolver) => {
    servidor = app.listen(0, () => resolver());
  });
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolver) => servidor.close(() => resolver()));
});

describe('Web servida con tarjeta', () => {
  it('sirve la página con el título general en la raíz y sin caché', async () => {
    const r = await fetch(`${base}/`);
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toBe('no-cache');
    const html = await r.text();
    expect(html).toContain('<title>RadioPirata — ¿Dónde escuchamos hoy?</title>');
    expect(html).toContain('property="og:site_name"');
  });

  it('pone el nombre del lugar en el título y en la tarjeta de un enlace a una ciudad', async () => {
    const html = await (await fetch(`${base}/?lugar=caracas`)).text();
    expect(html).toContain('<title>Caracas, Venezuela · RadioPirata</title>');
    expect(html).toContain('content="Caracas, Venezuela · RadioPirata"');
    expect(html).toMatch(/og:url" content="http:\/\/127\.0\.0\.1:\d+\/\?lugar=caracas"/);
  });

  it('pone la emisora comprobada en la tarjeta sin necesitar red', async () => {
    const html = await (await fetch(`${base}/?emisora=cc461784-3150-4a34-81c5-2116fe024740`)).text();
    expect(html).toContain('TSF Rádio Notícias en RadioPirata');
  });

  it('con una emisora desconocida y el catálogo caído, sirve la página con la tarjeta general', async () => {
    const r = await fetch(`${base}/?emisora=aaaaaaaa-0000-0000-0000-00000000000a`);
    expect(r.status).toBe(200);
    expect(await r.text()).toContain('<title>RadioPirata — ¿Dónde escuchamos hoy?</title>');
  });

  it('sirve los ficheros con hash como inmutables', async () => {
    const r = await fetch(`${base}/assets/app-abc123.js`);
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toContain('immutable');
  });
});
