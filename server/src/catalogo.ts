import { CacheAcotada } from './cache.js';
import { buscarLugares } from './lugares.js';
import { aEmisora, ClienteRadioBrowser, estacionReproducible, fusionarEstaciones } from './radioBrowser.js';
import type { Ciudad, Destino, Emisora, Seleccion } from './tipos.js';

export interface RespuestaEmisoras {
  destino: Destino;
  emisoras: Emisora[];
  /** `catalogo` si vienen refrescadas de Radio Browser; `copia-local` si se usó la copia con fecha. */
  origen: 'catalogo' | 'copia-local';
  copiaLocalDel: string;
  nota: string;
}

export interface RespuestaLugar {
  lugar: Ciudad;
  emisoras: Emisora[];
  verificadas: number;
  delCatalogo: number;
  nota: string;
}

export interface RespuestaBusqueda {
  consulta: string;
  lugares: Ciudad[];
  emisoras: Emisora[];
  pagina: number;
  porPagina: number;
  total: number;
  hayMas: boolean;
  /** Cuántas emisoras reproducibles aportó cada tipo de consulta al catálogo (pueden solaparse). */
  fuentes: { nombre: number; etiqueta: number; pais: number };
  /** Cierto si alguna de las tres consultas al catálogo falló y el resultado está incompleto. */
  parcial: boolean;
  nota: string;
}

type EnCache =
  | { clase: 'destino'; valor: RespuestaEmisoras }
  | { clase: 'lugar'; valor: RespuestaLugar }
  | { clase: 'busqueda'; valor: RespuestaBusqueda }
  | { clase: 'emisora'; valor: Emisora | null };

/** Tope de resultados que puede devolver una búsqueda, por mucho que el catálogo tenga más. */
export const MAX_RESULTADOS = 120;
export const POR_PAGINA = 24;
/** Emisoras que se piden al catálogo por cada consulta antes de fusionar. */
const POR_CONSULTA = 60;
/** Alias del índice que se usan para preguntar por un lugar. */
const MAX_ALIAS = 3;

/**
 * Catálogo de RadioPirata. Envuelve Radio Browser con caché acotada y resuelve lugares
 * con el índice propio. Nunca inventa emisoras, ciudades ni coordenadas: lo que no consta
 * en el catálogo se dice, no se rellena.
 */
export class Catalogo {
  private readonly cache: CacheAcotada<EnCache>;

  constructor(
    private readonly seleccion: Seleccion,
    private readonly cliente: ClienteRadioBrowser,
    cache: { ttlMs: number; max: number },
    private readonly ciudades: Ciudad[] = [],
  ) {
    this.cache = new CacheAcotada(cache.ttlMs, cache.max);
  }

  // --- Selección verificada de E1 ---

  destinos(): Destino[] {
    return this.seleccion.destinos;
  }

  destino(id: string): Destino | undefined {
    return this.seleccion.destinos.find((d) => d.id === id);
  }

  emisoraLocal(id: string): Emisora | undefined {
    return this.seleccion.emisoras.find((e) => e.id === id);
  }

  get generadaEl(): string {
    return this.seleccion.generadaEl;
  }

  async emisorasDe(destinoId: string): Promise<RespuestaEmisoras | undefined> {
    const destino = this.destino(destinoId);
    if (!destino) return undefined;
    const clave = `destino:${destinoId}`;
    const enCache = this.cache.get(clave);
    if (enCache?.clase === 'destino') return enCache.valor;

    const locales = this.seleccion.emisoras.filter((e) => e.destinoId === destinoId);
    let respuesta: RespuestaEmisoras;
    try {
      const frescas = await this.cliente.porUuids(locales.map((e) => e.id));
      const porId = new Map(frescas.map((f) => [f.stationuuid, f]));
      const emisoras = locales.map((local) => {
        const fresca = porId.get(local.id);
        const convertida = fresca ? aEmisora(fresca, destinoId) : null;
        return { ...(convertida ?? local), verificada: true };
      });
      respuesta = {
        destino,
        emisoras,
        origen: 'catalogo',
        copiaLocalDel: this.seleccion.generadaEl,
        nota: 'Selección verificada a mano y refrescada desde Radio Browser.',
      };
    } catch {
      // La copia local no se cachea: en cuanto el catálogo vuelva, queremos datos frescos.
      return {
        destino,
        emisoras: locales.map((e) => ({ ...e, verificada: true })),
        origen: 'copia-local',
        copiaLocalDel: this.seleccion.generadaEl,
        nota: `Radio Browser no ha respondido; se muestra la copia local del ${this.seleccion.generadaEl.slice(0, 10)}.`,
      };
    }
    this.cache.set(clave, { clase: 'destino', valor: respuesta });
    return respuesta;
  }

  // --- Índice propio de lugares ---

  lugares(): Ciudad[] {
    return this.ciudades;
  }

  lugar(id: string): Ciudad | undefined {
    return this.ciudades.find((c) => c.id === id);
  }

  /**
   * Emisoras de una ciudad del índice. Primero las verificadas a mano (si las hay para ese lugar)
   * y después las del catálogo que el propio catálogo sitúa en ese lugar. No se rellena con
   * emisoras del país: el país no prueba la ciudad.
   */
  async emisorasDeLugar(id: string): Promise<RespuestaLugar | undefined> {
    const lugar = this.lugar(id);
    if (!lugar) return undefined;
    const clave = `lugar:${id}`;
    const enCache = this.cache.get(clave);
    if (enCache?.clase === 'lugar') return enCache.valor;

    const verificadas = this.seleccion.emisoras
      .filter((e) => e.destinoId === id)
      .map((e) => ({ ...e, verificada: true }));
    const yaEstan = new Set(verificadas.map((e) => e.id));

    const consultas = lugar.alias.slice(0, MAX_ALIAS).map((alias) =>
      this.cliente.buscar({ countrycode: lugar.codigoPais, state: alias }, POR_CONSULTA),
    );
    const resultados = await Promise.allSettled(consultas);
    const listas = resultados.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
    const fallaronTodas = listas.length === 0 && consultas.length > 0;

    const delCatalogo = fusionarEstaciones(listas, MAX_RESULTADOS)
      .filter(estacionReproducible)
      .flatMap((e) => {
        const emisora = aEmisora(e, id);
        return emisora && !yaEstan.has(emisora.id) ? [emisora] : [];
      });

    const respuesta: RespuestaLugar = {
      lugar,
      emisoras: [...verificadas, ...delCatalogo],
      verificadas: verificadas.length,
      delCatalogo: delCatalogo.length,
      nota: notaDeLugar(lugar, verificadas.length, delCatalogo.length, fallaronTodas),
    };
    // Un fallo pasajero del catálogo no se guarda: si no, la ciudad se quedaría vacía un cuarto de hora.
    if (!fallaronTodas) this.cache.set(clave, { clase: 'lugar', valor: respuesta });
    return respuesta;
  }

  // --- Búsqueda del catálogo ---

  /**
   * Busca por nombre, etiqueta y país a la vez, y resuelve lugares con el índice propio.
   * `codigoPais` permite pedir un país por su código ISO, que es lo que el catálogo entiende:
   * buscar «Japón» por nombre no devolvería nada porque ahí el país se llama «Japan».
   */
  async buscar(consulta: string, pagina: number, codigoPais?: string): Promise<RespuestaBusqueda> {
    const q = consulta.trim();
    const clave = `busqueda:${q.toLowerCase()}|${codigoPais ?? ''}`;
    const enCache = this.cache.get(clave);
    const completa =
      enCache?.clase === 'busqueda'
        ? enCache.valor
        : await this.buscarEnCatalogo(q, codigoPais).then((valor) => {
            this.cache.set(clave, { clase: 'busqueda', valor });
            return valor;
          });
    return paginar(completa, pagina);
  }

  private async buscarEnCatalogo(q: string, codigoPais?: string): Promise<RespuestaBusqueda> {
    const [porNombre, porEtiqueta, porPais] = await Promise.allSettled([
      this.cliente.buscar({ name: q }, POR_CONSULTA),
      this.cliente.buscar({ tag: q }, POR_CONSULTA),
      this.cliente.buscar(codigoPais ? { countrycode: codigoPais } : { country: q }, POR_CONSULTA),
    ]);
    if (porNombre.status === 'rejected' && porEtiqueta.status === 'rejected' && porPais.status === 'rejected') {
      throw porNombre.reason instanceof Error ? porNombre.reason : new Error('El catálogo no ha respondido');
    }
    const reproducibles = (r: PromiseSettledResult<Awaited<ReturnType<ClienteRadioBrowser['buscar']>>>) =>
      r.status === 'fulfilled' ? r.value.filter(estacionReproducible) : [];

    const listas = [reproducibles(porNombre), reproducibles(porEtiqueta), reproducibles(porPais)];
    const emisoras = fusionarEstaciones(listas, MAX_RESULTADOS).flatMap((e) => {
      const emisora = aEmisora(e, '');
      return emisora ? [emisora] : [];
    });
    const parcial = [porNombre, porEtiqueta, porPais].some((r) => r.status === 'rejected');

    return {
      consulta: q,
      lugares: buscarLugares(q, this.ciudades),
      emisoras,
      pagina: 1,
      porPagina: POR_PAGINA,
      total: emisoras.length,
      hayMas: false,
      fuentes: {
        nombre: listas[0]?.length ?? 0,
        etiqueta: listas[1]?.length ?? 0,
        pais: listas[2]?.length ?? 0,
      },
      parcial,
      nota: notaDeBusqueda(emisoras.length, parcial),
    };
  }

  /** Una emisora concreta del catálogo, para abrir un enlace compartido. */
  async emisora(uuid: string): Promise<Emisora | undefined> {
    const local = this.emisoraLocal(uuid);
    if (local) return { ...local, verificada: true };
    const clave = `emisora:${uuid}`;
    const enCache = this.cache.get(clave);
    if (enCache?.clase === 'emisora') return enCache.valor ?? undefined;

    const [estacion] = await this.cliente.porUuids([uuid]);
    const emisora = estacion && estacionReproducible(estacion) ? aEmisora(estacion, '') : null;
    this.cache.set(clave, { clase: 'emisora', valor: emisora });
    return emisora ?? undefined;
  }

  /** Registra el inicio de una escucha en Radio Browser. Nunca falla hacia el cliente. */
  async registrarClic(id: string): Promise<'registrado' | 'no-registrado'> {
    try {
      await this.cliente.registrarClic(id);
      return 'registrado';
    } catch {
      return 'no-registrado';
    }
  }
}

function paginar(completa: RespuestaBusqueda, pagina: number): RespuestaBusqueda {
  const desde = (pagina - 1) * POR_PAGINA;
  const emisoras = completa.emisoras.slice(desde, desde + POR_PAGINA);
  return {
    ...completa,
    emisoras,
    pagina,
    total: completa.emisoras.length,
    hayMas: desde + emisoras.length < completa.emisoras.length,
  };
}

function notaDeLugar(lugar: Ciudad, verificadas: number, delCatalogo: number, fallo: boolean): string {
  if (fallo) {
    return verificadas > 0
      ? `${verificadas} comprobadas a mano. El catálogo no ha respondido ahora, así que falta el resto de ${lugar.nombre}.`
      : `El catálogo no ha respondido para ${lugar.nombre}. Vuelve a intentarlo en un momento.`;
  }
  if (verificadas + delCatalogo === 0) {
    return `El catálogo no sitúa ninguna emisora reproducible en ${lugar.nombre}. Prueba a buscar por ${lugar.pais} o por un estilo.`;
  }
  const partes: string[] = [];
  if (verificadas > 0) partes.push(`${verificadas} comprobadas a mano`);
  if (delCatalogo > 0) partes.push(`${delCatalogo} que el catálogo sitúa en ${lugar.nombre} o su región`);
  return `${partes.join(' y ')}. La ubicación es la que declara el catálogo, no una comprobación nuestra.`;
}

function notaDeBusqueda(total: number, parcial: boolean): string {
  if (total === 0) return 'No hemos encontrado emisoras reproducibles para esa búsqueda.';
  const base = `${total === MAX_RESULTADOS ? `Primeras ${MAX_RESULTADOS}` : total} emisoras por nombre, estilo o país.`;
  return parcial ? `${base} El catálogo ha fallado en parte, así que puede faltar alguna.` : base;
}
