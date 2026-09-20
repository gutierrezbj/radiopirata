import { resolveSrv } from 'node:dns/promises';
import { urlDeAudioValida, urlWebValida } from './validacion.js';
import type { Emisora } from './tipos.js';

/** Registro de Radio Browser tal y como lo devuelve /json/stations/... (solo los campos que usamos). */
export interface EstacionRadioBrowser {
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  homepage: string;
  country: string;
  countrycode: string;
  state: string;
  language: string;
  tags: string;
  codec: string;
  bitrate: number;
  hls: number;
  geo_lat: number | null;
  geo_long: number | null;
}

export interface OpcionesRadioBrowser {
  userAgent: string;
  timeoutMs: number;
  /** Función de red inyectable para pruebas. */
  fetchFn?: typeof fetch;
  /** Descubrimiento de servidores inyectable para pruebas. */
  descubrir?: () => Promise<string[]>;
  /** Lista de respaldo si el descubrimiento DNS falla. */
  servidoresRespaldo?: string[];
}

export class ErrorRadioBrowser extends Error {
  constructor(
    mensaje: string,
    readonly causa?: unknown,
  ) {
    super(mensaje);
    this.name = 'ErrorRadioBrowser';
  }
}

const SRV = '_api._tcp.radio-browser.info';
const RESPALDO = ['de1.api.radio-browser.info', 'nl1.api.radio-browser.info', 'at1.api.radio-browser.info'];

/** Descubre servidores según la documentación de Radio Browser (registros SRV) y los baraja. */
export async function descubrirServidores(): Promise<string[]> {
  const registros = await resolveSrv(SRV);
  const nombres = registros.map((r) => r.name).filter((n) => n.length > 0);
  return barajar(nombres);
}

function barajar<T>(lista: T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = copia[i] as T;
    copia[i] = copia[j] as T;
    copia[j] = a;
  }
  return copia;
}

/**
 * Adaptador de Radio Browser: descubre servidores, aplica timeout por petición,
 * cambia de servidor ante fallo y limita los reintentos al número de servidores conocidos.
 */
export class ClienteRadioBrowser {
  private servidores: string[] = [];
  private readonly fetchFn: typeof fetch;
  private readonly descubrir: () => Promise<string[]>;
  private readonly respaldo: string[];

  constructor(private readonly opciones: OpcionesRadioBrowser) {
    this.fetchFn = opciones.fetchFn ?? fetch;
    this.descubrir = opciones.descubrir ?? descubrirServidores;
    this.respaldo = opciones.servidoresRespaldo ?? RESPALDO;
  }

  private async listaServidores(): Promise<string[]> {
    if (this.servidores.length > 0) return this.servidores;
    try {
      const encontrados = await this.descubrir();
      this.servidores = encontrados.length > 0 ? encontrados : barajar(this.respaldo);
    } catch {
      this.servidores = barajar(this.respaldo);
    }
    return this.servidores;
  }

  /** Rota el primer servidor al final tras un fallo. */
  private rotar(): void {
    const primero = this.servidores.shift();
    if (primero) this.servidores.push(primero);
  }

  private async peticion<T>(ruta: string): Promise<T> {
    const servidores = await this.listaServidores();
    const intentos = servidores.length;
    let ultimoError: unknown;
    for (let intento = 0; intento < intentos; intento++) {
      const host = servidores[0];
      const url = `https://${host}${ruta}`;
      const control = new AbortController();
      const temporizador = setTimeout(() => control.abort(), this.opciones.timeoutMs);
      try {
        const respuesta = await this.fetchFn(url, {
          headers: { 'User-Agent': this.opciones.userAgent, Accept: 'application/json' },
          signal: control.signal,
        });
        if (!respuesta.ok) throw new ErrorRadioBrowser(`HTTP ${respuesta.status} en ${host}`);
        return (await respuesta.json()) as T;
      } catch (e) {
        ultimoError = e;
        this.rotar();
      } finally {
        clearTimeout(temporizador);
      }
    }
    throw new ErrorRadioBrowser('Radio Browser no responde en ningún servidor conocido', ultimoError);
  }

  /** Consulta varias emisoras por UUID en una sola petición. Máximo 50 UUID. */
  async porUuids(uuids: string[]): Promise<EstacionRadioBrowser[]> {
    if (uuids.length === 0) return [];
    if (uuids.length > 50) throw new ErrorRadioBrowser('Máximo 50 UUID por consulta');
    const parametros = new URLSearchParams({ uuids: uuids.join(',') });
    return this.peticion<EstacionRadioBrowser[]>(`/json/stations/byuuid?${parametros.toString()}`);
  }

  /** Búsqueda limitada del catálogo, usada solo por los scripts de selección. */
  async buscar(parametros: Record<string, string>): Promise<EstacionRadioBrowser[]> {
    const p = new URLSearchParams({ hidebroken: 'true', limit: '50', ...parametros });
    return this.peticion<EstacionRadioBrowser[]>(`/json/stations/search?${p.toString()}`);
  }

  /**
   * Registra un clic (inicio de escucha) según el mecanismo documentado de Radio Browser.
   * Solo debe llamarse cuando el usuario empieza a escuchar, nunca al navegar.
   */
  async registrarClic(uuid: string): Promise<void> {
    await this.peticion<unknown>(`/json/url/${encodeURIComponent(uuid)}`);
  }
}

/** Convierte un registro de Radio Browser a nuestro modelo, descartando URLs no válidas. */
export function aEmisora(e: EstacionRadioBrowser, destinoId: string): Emisora | null {
  const url = e.url_resolved || e.url;
  if (!urlDeAudioValida(url)) return null;
  const tieneCoordenadas =
    typeof e.geo_lat === 'number' &&
    typeof e.geo_long === 'number' &&
    Number.isFinite(e.geo_lat) &&
    Number.isFinite(e.geo_long);
  return {
    id: e.stationuuid,
    nombre: e.name.trim(),
    destinoId,
    pais: e.country,
    codigoPais: e.countrycode,
    idioma: e.language,
    etiquetas: e.tags
      ? e.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 12)
      : [],
    url,
    web: urlWebValida(e.homepage) ? e.homepage : null,
    codec: e.codec,
    bitrate: Number.isFinite(e.bitrate) ? e.bitrate : 0,
    coordenadas: tieneCoordenadas ? { lat: e.geo_lat as number, lng: e.geo_long as number } : null,
    ubicacionSegunCatalogo: e.state?.trim() ?? '',
  };
}
