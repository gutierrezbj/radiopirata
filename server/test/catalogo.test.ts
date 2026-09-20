import { describe, expect, it, vi } from 'vitest';
import { Catalogo } from '../src/catalogo.js';
import type { ClienteRadioBrowser, EstacionRadioBrowser } from '../src/radioBrowser.js';
import type { Seleccion } from '../src/tipos.js';

const seleccion: Seleccion = {
  version: 1,
  generadaEl: '2026-09-20T10:00:00.000Z',
  fuente: 'prueba',
  destinos: [{ id: 'lisboa', nombre: 'Lisboa', pais: 'Portugal', alias: ['lisbon'], coordenadas: { lat: 38.7, lng: -9.1 } }],
  emisoras: [
    {
      id: '11111111-2222-3333-4444-555555555555',
      nombre: 'Local',
      destinoId: 'lisboa',
      pais: 'Portugal',
      codigoPais: 'PT',
      idioma: 'portuguese',
      etiquetas: [],
      url: 'https://local.test/stream',
      web: null,
      codec: 'MP3',
      bitrate: 128,
      coordenadas: null,
      ubicacionSegunCatalogo: 'Lisboa',
    },
  ],
};

function clienteFalso(porUuids: () => Promise<EstacionRadioBrowser[]>, clic = async () => undefined) {
  return { porUuids: vi.fn(porUuids), registrarClic: vi.fn(clic) } as unknown as ClienteRadioBrowser;
}

describe('Catalogo', () => {
  it('refresca desde Radio Browser y cachea la respuesta', async () => {
    const cliente = clienteFalso(async () => [
      {
        stationuuid: '11111111-2222-3333-4444-555555555555',
        name: 'Fresca',
        url: '',
        url_resolved: 'https://fresca.test/stream',
        homepage: '',
        country: 'Portugal',
        countrycode: 'PT',
        state: 'Lisboa',
        language: 'portuguese',
        tags: '',
        codec: 'MP3',
        bitrate: 128,
        hls: 0,
        geo_lat: null,
        geo_long: null,
      },
    ]);
    const catalogo = new Catalogo(seleccion, cliente, { ttlMs: 10_000, max: 10 });
    const r1 = await catalogo.emisorasDe('lisboa');
    expect(r1?.origen).toBe('catalogo');
    expect(r1?.emisoras[0]?.nombre).toBe('Fresca');
    await catalogo.emisorasDe('lisboa');
    expect(cliente.porUuids).toHaveBeenCalledTimes(1);
  });

  it('usa la copia local con fecha cuando Radio Browser falla', async () => {
    const cliente = clienteFalso(async () => {
      throw new Error('caído');
    });
    const catalogo = new Catalogo(seleccion, cliente, { ttlMs: 10_000, max: 10 });
    const r = await catalogo.emisorasDe('lisboa');
    expect(r?.origen).toBe('copia-local');
    expect(r?.emisoras[0]?.nombre).toBe('Local');
    expect(r?.nota).toContain('2026-09-20');
  });

  it('conserva la copia local de una emisora que el catálogo ya no devuelve', async () => {
    const cliente = clienteFalso(async () => []);
    const catalogo = new Catalogo(seleccion, cliente, { ttlMs: 10_000, max: 10 });
    const r = await catalogo.emisorasDe('lisboa');
    expect(r?.origen).toBe('catalogo');
    expect(r?.emisoras).toHaveLength(1);
    expect(r?.emisoras[0]?.url).toBe('https://local.test/stream');
  });

  it('devuelve undefined para destinos desconocidos', async () => {
    const catalogo = new Catalogo(seleccion, clienteFalso(async () => []), { ttlMs: 10, max: 1 });
    expect(await catalogo.emisorasDe('marte')).toBeUndefined();
  });

  it('solo registra clics de emisoras de la selección y no propaga fallos', async () => {
    const cliente = clienteFalso(
      async () => [],
      async () => {
        throw new Error('caído');
      },
    );
    const catalogo = new Catalogo(seleccion, cliente, { ttlMs: 10, max: 1 });
    expect(await catalogo.registrarClic('00000000-0000-0000-0000-000000000000')).toBe('no-registrado');
    expect(cliente.registrarClic).not.toHaveBeenCalled();
    expect(await catalogo.registrarClic('11111111-2222-3333-4444-555555555555')).toBe('no-registrado');
    expect(cliente.registrarClic).toHaveBeenCalledTimes(1);
  });
});
