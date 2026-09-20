import { CacheAcotada } from './cache.js';
import { aEmisora, ClienteRadioBrowser } from './radioBrowser.js';
import type { Destino, Emisora, Seleccion } from './tipos.js';

export interface RespuestaEmisoras {
  destino: Destino;
  emisoras: Emisora[];
  /** `catalogo` si vienen refrescadas de Radio Browser; `copia-local` si se usó la copia con fecha. */
  origen: 'catalogo' | 'copia-local';
  copiaLocalDel: string;
  nota: string;
}

/**
 * Catálogo de E1: una selección pequeña y verificada. Los datos se refrescan desde Radio Browser
 * (URL resuelta, etiquetas, coordenadas) con caché acotada, y se cae a la copia local con fecha
 * si el proveedor no responde. Nunca se inventan emisoras ni coordenadas.
 */
export class Catalogo {
  private readonly cache: CacheAcotada<RespuestaEmisoras>;

  constructor(
    private readonly seleccion: Seleccion,
    private readonly cliente: ClienteRadioBrowser,
    cache: { ttlMs: number; max: number },
  ) {
    this.cache = new CacheAcotada(cache.ttlMs, cache.max);
  }

  destinos(): Destino[] {
    return this.seleccion.destinos;
  }

  destino(id: string): Destino | undefined {
    return this.seleccion.destinos.find((d) => d.id === id);
  }

  emisoraLocal(id: string): Emisora | undefined {
    return this.seleccion.emisoras.find((e) => e.id === id);
  }

  async emisorasDe(destinoId: string): Promise<RespuestaEmisoras | undefined> {
    const destino = this.destino(destinoId);
    if (!destino) return undefined;
    const clave = `emisoras:${destinoId}`;
    const enCache = this.cache.get(clave);
    if (enCache) return enCache;

    const locales = this.seleccion.emisoras.filter((e) => e.destinoId === destinoId);
    let respuesta: RespuestaEmisoras;
    try {
      const frescas = await this.cliente.porUuids(locales.map((e) => e.id));
      const porId = new Map(frescas.map((f) => [f.stationuuid, f]));
      const emisoras = locales.map((local) => {
        const fresca = porId.get(local.id);
        const convertida = fresca ? aEmisora(fresca, destinoId) : null;
        return convertida ?? local;
      });
      respuesta = {
        destino,
        emisoras,
        origen: 'catalogo',
        copiaLocalDel: this.seleccion.generadaEl,
        nota: 'Selección pequeña de E1 refrescada desde Radio Browser.',
      };
    } catch {
      respuesta = {
        destino,
        emisoras: locales,
        origen: 'copia-local',
        copiaLocalDel: this.seleccion.generadaEl,
        nota: `Radio Browser no ha respondido; se muestra la copia local del ${this.seleccion.generadaEl.slice(0, 10)}.`,
      };
    }
    this.cache.set(clave, respuesta);
    return respuesta;
  }

  async registrarClic(id: string): Promise<'registrado' | 'no-registrado'> {
    if (!this.emisoraLocal(id)) return 'no-registrado';
    try {
      await this.cliente.registrarClic(id);
      return 'registrado';
    } catch {
      return 'no-registrado';
    }
  }
}
