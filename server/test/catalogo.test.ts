import { describe, expect, it, vi } from 'vitest';
import { Catalogo, MAX_RESULTADOS, POR_PAGINA } from '../src/catalogo.js';
import type { ClienteRadioBrowser, EstacionRadioBrowser } from '../src/radioBrowser.js';
import type { Ciudad, Seleccion } from '../src/tipos.js';

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

const ciudades: Ciudad[] = [
  {
    id: 'lisboa',
    nombre: 'Lisboa',
    pais: 'Portugal',
    codigoPais: 'PT',
    coordenadas: { lat: 38.7, lng: -9.1 },
    alias: ['Lisboa', 'Lisbon'],
    zonaHoraria: 'Europe/Lisbon',
  },
  {
    id: 'oporto',
    nombre: 'Oporto',
    pais: 'Portugal',
    codigoPais: 'PT',
    coordenadas: { lat: 41.1, lng: -8.6 },
    alias: ['Porto'],
    zonaHoraria: 'Europe/Lisbon',
  },
];

function estacion(parcial: Partial<EstacionRadioBrowser> & { stationuuid: string }): EstacionRadioBrowser {
  return {
    name: `Emisora ${parcial.stationuuid}`,
    url: '',
    url_resolved: `https://ejemplo.test/${parcial.stationuuid}.mp3`,
    homepage: '',
    country: 'Portugal',
    countrycode: 'PT',
    state: 'Lisboa',
    language: 'portuguese',
    tags: 'jazz',
    codec: 'MP3',
    bitrate: 128,
    hls: 0,
    votes: 1,
    geo_lat: null,
    geo_long: null,
    ...parcial,
  };
}

interface DobleCliente {
  porUuids?: (uuids: string[]) => Promise<EstacionRadioBrowser[]>;
  buscar?: (parametros: Record<string, string>, limite?: number) => Promise<EstacionRadioBrowser[]>;
  paises?: () => Promise<Array<{ name: string; stationcount: number }>>;
  registrarClic?: (uuid: string) => Promise<void>;
}

function clienteFalso(partes: DobleCliente) {
  return {
    porUuids: vi.fn(partes.porUuids ?? (async () => [])),
    buscar: vi.fn(partes.buscar ?? (async () => [])),
    paises: vi.fn(partes.paises ?? (async () => [])),
    registrarClic: vi.fn(partes.registrarClic ?? (async () => undefined)),
  } as unknown as ClienteRadioBrowser;
}

function crear(partes: DobleCliente, max = 20) {
  const cliente = clienteFalso(partes);
  return { cliente, catalogo: new Catalogo(seleccion, cliente, { ttlMs: 10_000, max }, ciudades) };
}

describe('Catalogo — selección verificada', () => {
  it('refresca desde el catálogo, marca las emisoras como verificadas y cachea', async () => {
    const { cliente, catalogo } = crear({
      porUuids: async () => [estacion({ stationuuid: '11111111-2222-3333-4444-555555555555', name: 'Fresca' })],
    });
    const r1 = await catalogo.emisorasDe('lisboa');
    expect(r1?.origen).toBe('catalogo');
    expect(r1?.emisoras[0]?.nombre).toBe('Fresca');
    expect(r1?.emisoras[0]?.verificada).toBe(true);
    await catalogo.emisorasDe('lisboa');
    expect(cliente.porUuids).toHaveBeenCalledTimes(1);
  });

  it('usa la copia local con fecha cuando el catálogo falla, y no la deja cacheada', async () => {
    let falla = true;
    const { catalogo } = crear({
      porUuids: async () => {
        if (falla) throw new Error('caído');
        return [estacion({ stationuuid: '11111111-2222-3333-4444-555555555555', name: 'Fresca' })];
      },
    });
    const r = await catalogo.emisorasDe('lisboa');
    expect(r?.origen).toBe('copia-local');
    expect(r?.emisoras[0]?.nombre).toBe('Local');
    expect(r?.nota).toContain('2026-09-20');

    falla = false;
    expect((await catalogo.emisorasDe('lisboa'))?.origen).toBe('catalogo');
  });

  it('devuelve undefined para destinos desconocidos', async () => {
    const { catalogo } = crear({});
    expect(await catalogo.emisorasDe('marte')).toBeUndefined();
  });
});

describe('Catalogo — lugares', () => {
  it('pone primero las verificadas y luego las del catálogo, sin repetir', async () => {
    const { cliente, catalogo } = crear({
      buscar: async () => [
        estacion({ stationuuid: '11111111-2222-3333-4444-555555555555' }), // ya está como verificada
        estacion({ stationuuid: 'aaaaaaaa-0000-0000-0000-000000000001', votes: 9 }),
      ],
    });
    const r = await catalogo.emisorasDeLugar('lisboa');
    expect(r?.verificadas).toBe(1);
    expect(r?.delCatalogo).toBe(1);
    expect(r?.emisoras.map((e) => e.id)).toEqual([
      '11111111-2222-3333-4444-555555555555',
      'aaaaaaaa-0000-0000-0000-000000000001',
    ]);
    expect(r?.emisoras[0]?.verificada).toBe(true);
    expect(r?.emisoras[1]?.verificada).toBeUndefined();
    // Una consulta por alias del índice, con el código de país del propio índice.
    expect(cliente.buscar).toHaveBeenCalledTimes(2);
    expect(vi.mocked(cliente.buscar).mock.calls[0]?.[0]).toMatchObject({ countrycode: 'PT', state: 'Lisboa' });
  });

  it('no rellena con emisoras del país cuando el lugar no tiene ninguna', async () => {
    const { catalogo } = crear({ buscar: async () => [] });
    const r = await catalogo.emisorasDeLugar('oporto');
    expect(r?.emisoras).toEqual([]);
    expect(r?.nota).toMatch(/no sitúa ninguna emisora/);
  });

  it('descarta señales que no se pueden reproducir aquí (HLS o sin HTTPS)', async () => {
    const { catalogo } = crear({
      buscar: async () => [
        estacion({ stationuuid: 'aaaaaaaa-0000-0000-0000-00000000000a', url_resolved: 'https://x.test/live.m3u8' }),
        estacion({ stationuuid: 'aaaaaaaa-0000-0000-0000-00000000000b', url_resolved: 'http://x.test/stream' }),
        estacion({ stationuuid: 'aaaaaaaa-0000-0000-0000-00000000000c', hls: 1 }),
        estacion({ stationuuid: 'aaaaaaaa-0000-0000-0000-00000000000d' }),
      ],
    });
    const r = await catalogo.emisorasDeLugar('oporto');
    expect(r?.emisoras.map((e) => e.id)).toEqual(['aaaaaaaa-0000-0000-0000-00000000000d']);
  });

  it('avisa cuando el catálogo no responde para ese lugar', async () => {
    const { catalogo } = crear({
      buscar: async () => {
        throw new Error('caído');
      },
    });
    const r = await catalogo.emisorasDeLugar('oporto');
    expect(r?.emisoras).toEqual([]);
    expect(r?.nota).toMatch(/no ha respondido/);
  });

  it('sigue dando las comprobadas a mano cuando el catálogo falla, y lo dice', async () => {
    const { catalogo } = crear({
      buscar: async () => {
        throw new Error('caído');
      },
    });
    const r = await catalogo.emisorasDeLugar('lisboa');
    expect(r?.verificadas).toBe(1);
    expect(r?.nota).toMatch(/comprobadas a mano.*no ha respondido/);
  });

  it('no guarda en caché un fallo del catálogo: al siguiente intento vuelve a preguntar', async () => {
    let falla = true;
    const { cliente, catalogo } = crear({
      buscar: async () => {
        if (falla) throw new Error('caído');
        return [estacion({ stationuuid: 'aaaaaaaa-0000-0000-0000-00000000000a' })];
      },
    });
    expect((await catalogo.emisorasDeLugar('oporto'))?.emisoras).toEqual([]);
    falla = false;
    expect((await catalogo.emisorasDeLugar('oporto'))?.emisoras).toHaveLength(1);
    // Y una vez va bien, sí se cachea.
    await catalogo.emisorasDeLugar('oporto');
    expect(vi.mocked(cliente.buscar).mock.calls.length).toBe(2);
  });

  it('devuelve undefined para lugares fuera del índice', async () => {
    const { catalogo } = crear({});
    expect(await catalogo.emisorasDeLugar('atlantida')).toBeUndefined();
  });
});

describe('Catalogo — búsqueda', () => {
  it('consulta nombre, etiqueta y país, fusiona sin repetir y ordena por votos', async () => {
    const { cliente, catalogo } = crear({
      buscar: async (p) => {
        if (p['name']) return [estacion({ stationuuid: 'aaaaaaaa-0000-0000-0000-00000000000a', votes: 5 })];
        if (p['tag']) return [estacion({ stationuuid: 'aaaaaaaa-0000-0000-0000-00000000000b', votes: 50 })];
        return [estacion({ stationuuid: 'aaaaaaaa-0000-0000-0000-00000000000a', votes: 5 })];
      },
    });
    const r = await catalogo.buscar('jazz', 1);
    expect(vi.mocked(cliente.buscar).mock.calls.map((c) => Object.keys(c[0])[0])).toEqual(['name', 'tag', 'country']);
    expect(r.emisoras.map((e) => e.id)).toEqual([
      'aaaaaaaa-0000-0000-0000-00000000000b',
      'aaaaaaaa-0000-0000-0000-00000000000a',
    ]);
    expect(r.total).toBe(2);
    expect(r.fuentes).toEqual({ nombre: 1, etiqueta: 1, pais: 1 });
    expect(r.parcial).toBe(false);
  });

  it('añade los lugares del índice propio que coinciden con el texto', async () => {
    const { catalogo } = crear({ buscar: async () => [] });
    const r = await catalogo.buscar('lisbon', 1);
    expect(r.lugares.map((l) => l.id)).toEqual(['lisboa']);
  });

  it('sigue respondiendo, marcado como parcial, si una de las consultas falla', async () => {
    const { catalogo } = crear({
      buscar: async (p) => {
        if (p['tag']) throw new Error('caído');
        return [estacion({ stationuuid: 'aaaaaaaa-0000-0000-0000-00000000000a' })];
      },
    });
    const r = await catalogo.buscar('jazz', 1);
    expect(r.parcial).toBe(true);
    expect(r.emisoras).toHaveLength(1);
    expect(r.nota).toMatch(/puede faltar/);
  });

  it('falla solo si fallan las tres consultas', async () => {
    const { catalogo } = crear({
      buscar: async () => {
        throw new Error('caído');
      },
    });
    await expect(catalogo.buscar('jazz', 1)).rejects.toThrow();
  });

  it('pagina en memoria, limita el total y no vuelve a llamar al catálogo', async () => {
    const muchas = Array.from({ length: 200 }, (_, i) =>
      estacion({ stationuuid: `aaaaaaaa-0000-0000-0000-${String(i).padStart(12, '0')}`, votes: 200 - i }),
    );
    const { cliente, catalogo } = crear({ buscar: async (p) => (p['name'] ? muchas : []) });
    const p1 = await catalogo.buscar('jazz', 1);
    expect(p1.emisoras).toHaveLength(POR_PAGINA);
    expect(p1.total).toBe(MAX_RESULTADOS);
    expect(p1.hayMas).toBe(true);
    const p5 = await catalogo.buscar('jazz', 5);
    expect(p5.emisoras).toHaveLength(MAX_RESULTADOS - POR_PAGINA * 4);
    expect(p5.hayMas).toBe(false);
    expect(p1.emisoras[0]?.id).not.toBe(p5.emisoras[0]?.id);
    expect(cliente.buscar).toHaveBeenCalledTimes(3);
  });

  it('no distingue mayúsculas para la caché de una misma búsqueda', async () => {
    const { cliente, catalogo } = crear({ buscar: async () => [] });
    await catalogo.buscar('Jazz', 1);
    await catalogo.buscar('jazz', 1);
    expect(cliente.buscar).toHaveBeenCalledTimes(3);
  });

  it('busca el país por código ISO cuando se indica, porque el catálogo no entiende «Japón»', async () => {
    const { cliente, catalogo } = crear({ buscar: async () => [] });
    await catalogo.buscar('Japón', 1, 'JP');
    expect(vi.mocked(cliente.buscar).mock.calls[2]?.[0]).toEqual({ countrycode: 'JP' });
    // Y esa búsqueda se cachea aparte de la misma consulta sin país.
    await catalogo.buscar('Japón', 1);
    expect(vi.mocked(cliente.buscar).mock.calls[5]?.[0]).toEqual({ country: 'Japón' });
  });

  it('quita del resultado la misma señal dada de alta varias veces', async () => {
    const { catalogo } = crear({
      buscar: async (p) =>
        p['name']
          ? [
              estacion({ stationuuid: 'aaaaaaaa-0000-0000-0000-00000000000a', url_resolved: 'https://x.test/uno', votes: 5 }),
              estacion({ stationuuid: 'aaaaaaaa-0000-0000-0000-00000000000b', url_resolved: 'https://X.test/uno', votes: 4 }),
              estacion({ stationuuid: 'aaaaaaaa-0000-0000-0000-00000000000c', url_resolved: 'https://x.test/dos', votes: 3 }),
            ]
          : [],
    });
    const r = await catalogo.buscar('repetida', 1);
    expect(r.emisoras.map((e) => e.id)).toEqual([
      'aaaaaaaa-0000-0000-0000-00000000000a',
      'aaaaaaaa-0000-0000-0000-00000000000c',
    ]);
  });
});

describe('Catalogo — países y noticias', () => {
  it('lista los países con emisoras y descarta códigos raros o vacíos', async () => {
    const { cliente, catalogo } = crear({
      paises: async () => [
        { name: 'VE', stationcount: 199 },
        { name: 'PT', stationcount: 371 },
        { name: 'The Democratic Republic Of The Congo', stationcount: 3 },
        { name: 'XX', stationcount: 0 },
      ],
    });
    expect(await catalogo.paises()).toEqual([
      { codigo: 'VE', emisoras: 199 },
      { codigo: 'PT', emisoras: 371 },
    ]);
    await catalogo.paises();
    expect(cliente.paises).toHaveBeenCalledTimes(1);
  });

  it('se queda con las informativas por etiqueta o por nombre, en varios idiomas', async () => {
    const { cliente, catalogo } = crear({
      buscar: async (p) =>
        p['tag']
          ? [estacion({ stationuuid: 'aaaaaaaa-0000-0000-0000-00000000000e', name: 'Radio Etiquetada', tags: 'news', votes: 1 })]
          : [
              estacion({ stationuuid: 'aaaaaaaa-0000-0000-0000-00000000000a', name: 'Unión Radio', tags: 'noticias,talk', votes: 50 }),
              estacion({ stationuuid: 'aaaaaaaa-0000-0000-0000-00000000000b', name: 'BandNews FM', tags: '', votes: 40 }),
              estacion({ stationuuid: 'aaaaaaaa-0000-0000-0000-00000000000c', name: 'Pop Hits', tags: 'pop,hits', votes: 90 }),
              estacion({ stationuuid: 'aaaaaaaa-0000-0000-0000-00000000000d', name: 'Deutschlandfunk', tags: 'nachrichten', votes: 30 }),
            ],
    });
    const r = await catalogo.noticias('VE');
    expect(r.emisoras.map((e) => e.nombre)).toEqual(['Unión Radio', 'BandNews FM', 'Deutschlandfunk', 'Radio Etiquetada']);
    expect(r.pais).toBe('Venezuela');
    expect(r.nota).toMatch(/4 emisoras.*No están comprobadas/);
    expect(vi.mocked(cliente.buscar).mock.calls[0]?.[0]).toEqual({ countrycode: 'VE' });
    expect(vi.mocked(cliente.buscar).mock.calls[1]?.[0]).toEqual({ countrycode: 'VE', tag: 'news' });
  });

  it('sugiere una ciudad del índice para enfocar el globo, si el país tiene alguna', async () => {
    const { catalogo } = crear({ buscar: async () => [] });
    expect((await catalogo.noticias('PT')).lugarSugerido?.id).toBe('lisboa');
    expect((await catalogo.noticias('VE')).lugarSugerido).toBeNull();
  });

  it('con un fallo parcial responde igualmente pero no guarda en caché', async () => {
    let falla = true;
    const { cliente, catalogo } = crear({
      buscar: async (p) => {
        if (p['tag'] && falla) throw new Error('caído');
        return [estacion({ stationuuid: 'aaaaaaaa-0000-0000-0000-00000000000a', name: 'Noticias 1', tags: 'news' })];
      },
    });
    const r1 = await catalogo.noticias('PT');
    expect(r1.parcial).toBe(true);
    expect(r1.emisoras).toHaveLength(1);
    falla = false;
    const r2 = await catalogo.noticias('PT');
    expect(r2.parcial).toBe(false);
    await catalogo.noticias('PT');
    expect(vi.mocked(cliente.buscar).mock.calls.length).toBe(4);
  });

  it('falla solo si fallan las dos consultas, y explica el vacío con honestidad', async () => {
    const caido = crear({
      buscar: async () => {
        throw new Error('caído');
      },
    });
    await expect(caido.catalogo.noticias('PT')).rejects.toThrow();
    const vacio = crear({ buscar: async () => [] });
    expect((await vacio.catalogo.noticias('PT')).nota).toMatch(/no tiene emisoras informativas de Portugal/);
  });
});

describe('Catalogo — emisora suelta y clic', () => {
  it('devuelve una emisora de la selección sin tocar la red', async () => {
    const { cliente, catalogo } = crear({});
    const e = await catalogo.emisora('11111111-2222-3333-4444-555555555555');
    expect(e?.verificada).toBe(true);
    expect(cliente.porUuids).not.toHaveBeenCalled();
  });

  it('pide al catálogo una emisora desconocida y cachea también que no existe', async () => {
    const { cliente, catalogo } = crear({ porUuids: async () => [] });
    expect(await catalogo.emisora('aaaaaaaa-0000-0000-0000-00000000000a')).toBeUndefined();
    expect(await catalogo.emisora('aaaaaaaa-0000-0000-0000-00000000000a')).toBeUndefined();
    expect(cliente.porUuids).toHaveBeenCalledTimes(1);
  });

  it('no devuelve una emisora que no se puede reproducir aquí', async () => {
    const { catalogo } = crear({
      porUuids: async () => [estacion({ stationuuid: 'aaaaaaaa-0000-0000-0000-00000000000a', url_resolved: 'http://x.test/s' })],
    });
    expect(await catalogo.emisora('aaaaaaaa-0000-0000-0000-00000000000a')).toBeUndefined();
  });

  it('registra el clic de cualquier emisora del catálogo y no propaga fallos', async () => {
    const { cliente, catalogo } = crear({});
    expect(await catalogo.registrarClic('aaaaaaaa-0000-0000-0000-00000000000a')).toBe('registrado');
    expect(cliente.registrarClic).toHaveBeenCalledWith('aaaaaaaa-0000-0000-0000-00000000000a');

    const caido = crear({
      registrarClic: async () => {
        throw new Error('caído');
      },
    });
    expect(await caido.catalogo.registrarClic('aaaaaaaa-0000-0000-0000-00000000000a')).toBe('no-registrado');
  });
});
