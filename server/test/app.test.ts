import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { crearApp } from '../src/app.js';
import { Catalogo } from '../src/catalogo.js';
import { cargarCiudades } from '../src/lugares.js';
import { ClienteRadioBrowser } from '../src/radioBrowser.js';
import { cargarSeleccion } from '../src/seleccion.js';

let servidor: Server;
let base = '';

beforeAll(async () => {
  // Cliente sin red: así las pruebas comprueban el comportamiento cuando el catálogo no responde.
  const cliente = new ClienteRadioBrowser({
    userAgent: 'x',
    timeoutMs: 100,
    fetchFn: (async () => {
      throw new Error('sin red en pruebas');
    }) as unknown as typeof fetch,
    descubrir: async () => ['nadie.test'],
  });
  const catalogo = new Catalogo(cargarSeleccion(), cliente, { ttlMs: 1000, max: 50 }, cargarCiudades());
  const app = crearApp({ catalogo });
  await new Promise<void>((resolver) => {
    servidor = app.listen(0, () => resolver());
  });
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolver) => servidor.close(() => resolver()));
});

describe('API — destinos verificados', () => {
  it('lista los destinos verificados con la fecha de la comprobación', async () => {
    const r = await fetch(`${base}/api/destinos`);
    expect(r.status).toBe(200);
    const datos = (await r.json()) as { destinos: Array<{ id: string }>; verificadasEl: string };
    expect(datos.destinos.map((d) => d.id).sort()).toEqual(['caracas', 'lisboa', 'tokio']);
    expect(datos.verificadasEl).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  it('sirve la copia local cuando el catálogo no responde', async () => {
    const r = await fetch(`${base}/api/destinos/lisboa/emisoras`);
    expect(r.status).toBe(200);
    const datos = (await r.json()) as { origen: string; emisoras: Array<{ url: string; verificada?: boolean }> };
    expect(datos.origen).toBe('copia-local');
    expect(datos.emisoras.length).toBeGreaterThan(0);
    for (const e of datos.emisoras) {
      expect(e.url.startsWith('https://')).toBe(true);
      expect(e.verificada).toBe(true);
    }
  });
});

describe('API — lugares', () => {
  it('sirve el índice propio de ciudades y avisa de para qué son las coordenadas', async () => {
    const r = await fetch(`${base}/api/lugares`);
    expect(r.status).toBe(200);
    const datos = (await r.json()) as { lugares: Array<{ id: string }>; nota: string };
    expect(datos.lugares.length).toBeGreaterThan(50);
    expect(datos.nota).toMatch(/no son la ubicación de cada emisora/);
  });

  it('devuelve las verificadas de un lugar aunque el catálogo esté caído', async () => {
    const r = await fetch(`${base}/api/lugares/tokio/emisoras`);
    expect(r.status).toBe(200);
    const datos = (await r.json()) as { verificadas: number; delCatalogo: number; emisoras: unknown[]; nota: string };
    expect(datos.verificadas).toBeGreaterThan(0);
    expect(datos.delCatalogo).toBe(0);
    expect(datos.emisoras).toHaveLength(datos.verificadas);
  });

  it('valida el identificador y responde 404 a lugares fuera del índice', async () => {
    expect((await fetch(`${base}/api/lugares/MAYUSCULAS/emisoras`)).status).toBe(400);
    expect((await fetch(`${base}/api/lugares/atlantida/emisoras`)).status).toBe(404);
  });
});

describe('API — búsqueda', () => {
  it('rechaza consultas demasiado cortas, demasiado largas o sin texto', async () => {
    expect((await fetch(`${base}/api/buscar`)).status).toBe(400);
    expect((await fetch(`${base}/api/buscar?q=a`)).status).toBe(400);
    expect((await fetch(`${base}/api/buscar?q=${'x'.repeat(61)}`)).status).toBe(400);
  });

  it('rechaza páginas fuera del rango que el servidor sirve', async () => {
    expect((await fetch(`${base}/api/buscar?q=jazz&pagina=0`)).status).toBe(400);
    expect((await fetch(`${base}/api/buscar?q=jazz&pagina=99`)).status).toBe(400);
    expect((await fetch(`${base}/api/buscar?q=jazz&pagina=dos`)).status).toBe(400);
  });

  it('devuelve 502 cuando el catálogo no responde a ninguna consulta', async () => {
    const r = await fetch(`${base}/api/buscar?q=jazz`);
    expect(r.status).toBe(502);
    expect((await r.json()) as { error: string }).toHaveProperty('error');
  });
});

describe('API — emisoras', () => {
  it('devuelve una emisora de la selección verificada por su identificador', async () => {
    const r = await fetch(`${base}/api/emisoras/cc461784-3150-4a34-81c5-2116fe024740`);
    expect(r.status).toBe(200);
    const datos = (await r.json()) as { emisora: { nombre: string; verificada?: boolean } };
    expect(datos.emisora.nombre).toMatch(/TSF/);
    expect(datos.emisora.verificada).toBe(true);
  });

  it('valida el identificador y avisa si el catálogo no responde', async () => {
    expect((await fetch(`${base}/api/emisoras/no-es-uuid`)).status).toBe(400);
    expect((await fetch(`${base}/api/emisoras/aaaaaaaa-0000-0000-0000-00000000000a`)).status).toBe(502);
  });

  it('no falla el clic aunque el proveedor esté caído', async () => {
    const r = await fetch(`${base}/api/emisoras/cc461784-3150-4a34-81c5-2116fe024740/clic`, { method: 'POST' });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ resultado: 'no-registrado' });
    expect((await fetch(`${base}/api/emisoras/no-es-uuid/clic`, { method: 'POST' })).status).toBe(400);
  });
});

describe('API — rutas desconocidas', () => {
  it('responde 404 en JSON bajo /api y no filtra rutas del sistema de archivos', async () => {
    expect((await fetch(`${base}/api/otra`)).status).toBe(404);
    expect((await fetch(`${base}/api/destinos/../etc/emisoras`)).status).toBe(404);
  });
});
