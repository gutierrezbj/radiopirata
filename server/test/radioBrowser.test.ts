import { describe, expect, it, vi } from 'vitest';
import { aEmisora, ClienteRadioBrowser, type EstacionRadioBrowser } from '../src/radioBrowser.js';

function respuestaJson(datos: unknown, status = 200): Response {
  return new Response(JSON.stringify(datos), { status, headers: { 'content-type': 'application/json' } });
}

const registro: EstacionRadioBrowser = {
  stationuuid: '11111111-2222-3333-4444-555555555555',
  name: '  Emisora de prueba ',
  url: 'https://ejemplo.test/stream',
  url_resolved: 'https://ejemplo.test/stream.mp3',
  homepage: 'https://ejemplo.test',
  country: 'Portugal',
  countrycode: 'PT',
  state: 'Lisboa',
  language: 'portuguese',
  tags: 'pop, noticias ,,rock',
  codec: 'MP3',
  bitrate: 128,
  hls: 0,
  geo_lat: 38.7,
  geo_long: -9.1,
};

describe('ClienteRadioBrowser', () => {
  it('cambia de servidor cuando el primero falla y envía el User-Agent', async () => {
    const urls: string[] = [];
    const fetchFn = vi.fn(async (entrada: string | URL | Request, init?: RequestInit) => {
      const url = String(entrada);
      urls.push(url);
      expect((init?.headers as Record<string, string>)['User-Agent']).toBe('RadioPirata/test');
      if (url.startsWith('https://caido.test')) return respuestaJson({ error: 'no' }, 503);
      return respuestaJson([registro]);
    }) as unknown as typeof fetch;

    const cliente = new ClienteRadioBrowser({
      userAgent: 'RadioPirata/test',
      timeoutMs: 1000,
      fetchFn,
      descubrir: async () => ['caido.test', 'vivo.test'],
    });
    const resultado = await cliente.porUuids([registro.stationuuid]);
    expect(resultado).toHaveLength(1);
    expect(urls[0]).toContain('https://caido.test/json/stations/byuuid?uuids=');
    expect(urls[1]).toContain('https://vivo.test/json/stations/byuuid?uuids=');

    // El servidor caído queda al final: la siguiente petición va directa al vivo.
    urls.length = 0;
    await cliente.porUuids([registro.stationuuid]);
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain('https://vivo.test/');
  });

  it('falla de forma controlada cuando ningún servidor responde', async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error('red caída');
    }) as unknown as typeof fetch;
    const cliente = new ClienteRadioBrowser({
      userAgent: 'x',
      timeoutMs: 1000,
      fetchFn,
      descubrir: async () => ['a.test', 'b.test'],
    });
    await expect(cliente.porUuids(['u'])).rejects.toThrow(/ningún servidor/);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('aborta por timeout y pasa al siguiente servidor', async () => {
    vi.useFakeTimers();
    try {
      const fetchFn = vi.fn((entrada: string | URL | Request, init?: RequestInit) => {
        const url = String(entrada);
        if (url.startsWith('https://lento.test')) {
          return new Promise<Response>((_resolver, rechazar) => {
            init?.signal?.addEventListener('abort', () => rechazar(new DOMException('abortado', 'AbortError')));
          });
        }
        return Promise.resolve(respuestaJson([]));
      }) as unknown as typeof fetch;
      const cliente = new ClienteRadioBrowser({
        userAgent: 'x',
        timeoutMs: 50,
        fetchFn,
        descubrir: async () => ['lento.test', 'rapido.test'],
      });
      const promesa = cliente.porUuids(['u']);
      await vi.advanceTimersByTimeAsync(60);
      await expect(promesa).resolves.toEqual([]);
      expect(fetchFn).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('usa la lista de respaldo si el descubrimiento DNS falla', async () => {
    const fetchFn = vi.fn(async () => respuestaJson([])) as unknown as typeof fetch;
    const cliente = new ClienteRadioBrowser({
      userAgent: 'x',
      timeoutMs: 1000,
      fetchFn,
      descubrir: async () => {
        throw new Error('sin DNS');
      },
      servidoresRespaldo: ['respaldo.test'],
    });
    await cliente.porUuids(['u']);
    expect(String((fetchFn as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]?.[0])).toContain('https://respaldo.test/');
  });

  it('limita el número de UUID por consulta', async () => {
    const cliente = new ClienteRadioBrowser({ userAgent: 'x', timeoutMs: 10, descubrir: async () => ['a.test'] });
    await expect(cliente.porUuids(new Array(51).fill('u'))).rejects.toThrow(/50/);
    await expect(cliente.porUuids([])).resolves.toEqual([]);
  });
});

describe('aEmisora', () => {
  it('conserva los campos útiles, recorta etiquetas y coordenadas reales', () => {
    const e = aEmisora(registro, 'lisboa');
    expect(e).not.toBeNull();
    expect(e?.nombre).toBe('Emisora de prueba');
    expect(e?.url).toBe('https://ejemplo.test/stream.mp3');
    expect(e?.etiquetas).toEqual(['pop', 'noticias', 'rock']);
    expect(e?.coordenadas).toEqual({ lat: 38.7, lng: -9.1 });
    expect(e?.ubicacionSegunCatalogo).toBe('Lisboa');
    expect(e?.web).toBe('https://ejemplo.test');
  });

  it('no inventa coordenadas cuando el catálogo no las tiene', () => {
    const e = aEmisora({ ...registro, geo_lat: null, geo_long: null }, 'lisboa');
    expect(e?.coordenadas).toBeNull();
  });

  it('descarta URLs con esquemas no admitidos o credenciales', () => {
    expect(aEmisora({ ...registro, url_resolved: 'javascript:alert(1)', url: '' }, 'x')).toBeNull();
    expect(aEmisora({ ...registro, url_resolved: 'https://usuario:clave@ejemplo.test/a' }, 'x')).toBeNull();
    expect(aEmisora({ ...registro, url_resolved: '', url: 'ftp://ejemplo.test/a' }, 'x')).toBeNull();
    const conWebRara = aEmisora({ ...registro, homepage: 'data:text/html,hola' }, 'x');
    expect(conWebRara?.web).toBeNull();
  });
});
