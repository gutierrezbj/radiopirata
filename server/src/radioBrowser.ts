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
  votes?: number;
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

  /** Pone delante el servidor que acaba de responder, para empezar por él la próxima vez. */
  private preferir(host: string): void {
    if (this.servidores[0] === host) return;
    this.servidores = [host, ...this.servidores.filter((s) => s !== host)];
  }

  private async peticion<T>(ruta: string): Promise<T> {
    // Copia del orden actual: varias peticiones a la vez no deben quitarse servidores entre ellas.
    const servidores = [...(await this.listaServidores())];
    let ultimoError: unknown;
    for (const host of servidores) {
      const url = `https://${host}${ruta}`;
      const control = new AbortController();
      const temporizador = setTimeout(() => control.abort(), this.opciones.timeoutMs);
      try {
        const respuesta = await this.fetchFn(url, {
          headers: { 'User-Agent': this.opciones.userAgent, Accept: 'application/json' },
          signal: control.signal,
        });
        if (!respuesta.ok) throw new ErrorRadioBrowser(`HTTP ${respuesta.status} en ${host}`);
        const datos = (await respuesta.json()) as T;
        this.preferir(host);
        return datos;
      } catch (e) {
        ultimoError = e;
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

  /**
   * Búsqueda acotada del catálogo. Los parámetros los compone siempre el servidor a partir de
   * entrada ya validada; el cliente nunca puede indicar rutas ni hosts.
   */
  async buscar(parametros: Record<string, string>, limite = 50): Promise<EstacionRadioBrowser[]> {
    const p = new URLSearchParams({
      hidebroken: 'true',
      order: 'votes',
      reverse: 'true',
      limit: String(Math.min(Math.max(limite, 1), 200)),
      ...parametros,
    });
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

/**
 * Formatos que ningún navegador actual reproduce en un elemento de audio. Los que quedan fuera de
 * esta lista (MP3, AAC, OGG, FLAC, WAV…) se admiten; si alguno falla en un navegador concreto,
 * el reproductor lo dice con un mensaje claro en vez de callarse.
 */
const CODECS_IMPOSIBLES = new Set(['FLV', 'ASF', 'WMA', 'RA', 'RM', 'RTMP', 'DASH']);
const EXTENSIONES_IMPOSIBLES = ['.m3u8', '.mpd', '.asx', '.asf', '.wma', '.ram', '.flv', '.rm'];

/**
 * ¿Puede sonar esta señal en el navegador tal y como está montada RadioPirata?
 * Exigimos HTTPS (la web se sirve por HTTPS y el contenido mixto se bloquea) y descartamos HLS y
 * los formatos que el navegador no sabe abrir. Preferimos dejar fuera una emisora antes que
 * ofrecer un botón que falla.
 */
export function estacionReproducible(e: EstacionRadioBrowser): boolean {
  const url = e.url_resolved || e.url;
  if (!urlDeAudioValida(url) || !url.startsWith('https://')) return false;
  if (e.hls === 1) return false;
  if (CODECS_IMPOSIBLES.has((e.codec ?? '').trim().toUpperCase())) return false;
  const sinConsulta = (url.split('?')[0] ?? '').toLowerCase();
  return !EXTENSIONES_IMPOSIBLES.some((ext) => sinConsulta.endsWith(ext));
}

/**
 * Une varias listas del catálogo y ordena por votos. Quita repetidos por identificador y también
 * por señal: el catálogo tiene la misma emisora dada de alta varias veces, y en la lista sobra.
 */
export function fusionarEstaciones(listas: EstacionRadioBrowser[][], limite: number): EstacionRadioBrowser[] {
  const porId = new Map<string, EstacionRadioBrowser>();
  const señalesVistas = new Set<string>();
  for (const lista of listas) {
    for (const estacion of lista) {
      const señal = (estacion.url_resolved || estacion.url).trim().toLowerCase();
      if (porId.has(estacion.stationuuid) || señalesVistas.has(señal)) continue;
      porId.set(estacion.stationuuid, estacion);
      señalesVistas.add(señal);
    }
  }
  return [...porId.values()].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0)).slice(0, limite);
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
