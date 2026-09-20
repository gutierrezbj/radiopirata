import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { crearApp } from '../src/app.js';
import { Catalogo } from '../src/catalogo.js';
import { ClienteRadioBrowser } from '../src/radioBrowser.js';
import { cargarSeleccion } from '../src/seleccion.js';

let servidor: Server;
let base = '';

beforeAll(async () => {
  const cliente = new ClienteRadioBrowser({
    userAgent: 'x',
    timeoutMs: 100,
    fetchFn: (async () => {
      throw new Error('sin red en pruebas');
    }) as unknown as typeof fetch,
    descubrir: async () => ['nadie.test'],
  });
  const catalogo = new Catalogo(cargarSeleccion(), cliente, { ttlMs: 1000, max: 10 });
  const app = crearApp({ catalogo });
  await new Promise<void>((resolver) => {
    servidor = app.listen(0, () => resolver());
  });
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolver) => servidor.close(() => resolver()));
});

describe('API', () => {
  it('lista los tres destinos de E1 y avisa del alcance', async () => {
    const r = await fetch(`${base}/api/destinos`);
    expect(r.status).toBe(200);
    const datos = (await r.json()) as { destinos: Array<{ id: string }>; nota: string };
    expect(datos.destinos.map((d) => d.id).sort()).toEqual(['caracas', 'lisboa', 'tokio']);
    expect(datos.nota).toMatch(/Tokio, Caracas y Lisboa/);
  });

  it('sirve la copia local cuando Radio Browser no responde', async () => {
    const r = await fetch(`${base}/api/destinos/lisboa/emisoras`);
    expect(r.status).toBe(200);
    const datos = (await r.json()) as { origen: string; emisoras: Array<{ url: string }> };
    expect(datos.origen).toBe('copia-local');
    expect(datos.emisoras.length).toBeGreaterThan(0);
    for (const e of datos.emisoras) expect(e.url.startsWith('https://')).toBe(true);
  });

  it('valida identificadores y responde 404 a destinos desconocidos', async () => {
    expect((await fetch(`${base}/api/destinos/../etc/emisoras`)).status).toBe(404);
    expect((await fetch(`${base}/api/destinos/MAYUSCULAS/emisoras`)).status).toBe(400);
    expect((await fetch(`${base}/api/destinos/marte/emisoras`)).status).toBe(404);
    expect((await fetch(`${base}/api/emisoras/no-es-uuid/clic`, { method: 'POST' })).status).toBe(400);
    expect((await fetch(`${base}/api/otra`)).status).toBe(404);
  });

  it('no falla el clic aunque el proveedor esté caído', async () => {
    const r = await fetch(`${base}/api/emisoras/cc461784-3150-4a34-81c5-2116fe024740/clic`, { method: 'POST' });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ resultado: 'no-registrado' });
  });
});
