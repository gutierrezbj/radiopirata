import type { Emisora } from '../tipos';

export const CLAVE = 'radiopirata';
export const VERSION = 1;
export const MAX_FAVORITAS = 200;
export const MAX_RECIENTES = 20;

export interface DatosAlmacen {
  favoritas: Emisora[];
  recientes: Emisora[];
  /** Falso si el navegador no deja guardar (modo privado, cuota llena, almacenamiento bloqueado). */
  disponible: boolean;
}

interface Guardado {
  version: number;
  favoritas: unknown;
  recientes: unknown;
}

/**
 * Deja una emisora en un estado seguro para guardarla o para leerla de vuelta.
 * Devuelve null si le falta lo imprescindible: sin identificador o sin URL reproducible no sirve de nada.
 */
export function sanearEmisora(valor: unknown): Emisora | null {
  if (typeof valor !== 'object' || valor === null) return null;
  const v = valor as Record<string, unknown>;
  const id = typeof v['id'] === 'string' ? v['id'].trim() : '';
  const nombre = typeof v['nombre'] === 'string' ? v['nombre'].trim() : '';
  const url = typeof v['url'] === 'string' ? v['url'] : '';
  if (id.length === 0 || id.length > 64 || nombre.length === 0 || !url.startsWith('https://')) return null;

  const coords = v['coordenadas'];
  const lat = typeof coords === 'object' && coords !== null ? (coords as Record<string, unknown>)['lat'] : undefined;
  const lng = typeof coords === 'object' && coords !== null ? (coords as Record<string, unknown>)['lng'] : undefined;
  const coordenadas =
    typeof lat === 'number' && Number.isFinite(lat) && typeof lng === 'number' && Number.isFinite(lng) ? { lat, lng } : null;

  const texto = (clave: string): string => (typeof v[clave] === 'string' ? (v[clave] as string) : '');
  const etiquetas = Array.isArray(v['etiquetas'])
    ? v['etiquetas'].filter((t): t is string => typeof t === 'string' && t.length > 0).slice(0, 12)
    : [];

  return {
    id,
    nombre: nombre.slice(0, 200),
    destinoId: texto('destinoId'),
    pais: texto('pais'),
    codigoPais: texto('codigoPais'),
    idioma: texto('idioma'),
    etiquetas,
    url,
    web: typeof v['web'] === 'string' && v['web'].startsWith('https://') ? v['web'] : null,
    codec: texto('codec'),
    bitrate: typeof v['bitrate'] === 'number' && Number.isFinite(v['bitrate']) ? v['bitrate'] : 0,
    coordenadas,
    ubicacionSegunCatalogo: texto('ubicacionSegunCatalogo'),
    ...(v['verificada'] === true ? { verificada: true as const } : {}),
  };
}

function lista(valor: unknown, max: number): Emisora[] {
  if (!Array.isArray(valor)) return [];
  const vistas = new Set<string>();
  const salida: Emisora[] = [];
  for (const bruto of valor) {
    const emisora = sanearEmisora(bruto);
    if (!emisora || vistas.has(emisora.id)) continue;
    vistas.add(emisora.id);
    salida.push(emisora);
    if (salida.length >= max) break;
  }
  return salida;
}

/**
 * Favoritas y recientes en el propio navegador, con esquema versionado.
 * Nada sale de este dispositivo. Si el almacenamiento falla o los datos están corruptos,
 * la aplicación sigue funcionando: se marca como no disponible y la interfaz esconde lo que no funcionaría.
 */
export class AlmacenLocal {
  private datos: DatosAlmacen = { favoritas: [], recientes: [], disponible: false };
  private readonly oyentes = new Set<() => void>();

  constructor(
    private readonly almacenamiento: Storage | null,
    private readonly clave = CLAVE,
  ) {
    this.datos = this.leer();
  }

  private leer(): DatosAlmacen {
    if (!this.almacenamiento) return { favoritas: [], recientes: [], disponible: false };
    let bruto: string | null;
    try {
      bruto = this.almacenamiento.getItem(this.clave);
    } catch {
      return { favoritas: [], recientes: [], disponible: false };
    }
    if (bruto === null) return { favoritas: [], recientes: [], disponible: true };
    try {
      const datos = JSON.parse(bruto) as Guardado;
      // Un esquema de otra versión no se intenta adivinar: se empieza de cero sin romper nada.
      if (datos?.version !== VERSION) return { favoritas: [], recientes: [], disponible: true };
      return {
        favoritas: lista(datos.favoritas, MAX_FAVORITAS),
        recientes: lista(datos.recientes, MAX_RECIENTES),
        disponible: true,
      };
    } catch {
      return { favoritas: [], recientes: [], disponible: true };
    }
  }

  private guardar(): void {
    if (!this.almacenamiento) return;
    try {
      const guardado: Guardado = {
        version: VERSION,
        favoritas: this.datos.favoritas,
        recientes: this.datos.recientes,
      };
      this.almacenamiento.setItem(this.clave, JSON.stringify(guardado));
      if (!this.datos.disponible) this.datos = { ...this.datos, disponible: true };
    } catch {
      // Cuota llena o almacenamiento bloqueado: lo decimos en vez de fingir que se guardó.
      this.datos = { ...this.datos, disponible: false };
    }
  }

  private cambiar(parcial: Partial<DatosAlmacen>): void {
    this.datos = { ...this.datos, ...parcial };
    this.guardar();
    for (const oyente of this.oyentes) oyente();
  }

  suscribir = (oyente: () => void): (() => void) => {
    this.oyentes.add(oyente);
    return () => this.oyentes.delete(oyente);
  };

  instantanea = (): DatosAlmacen => this.datos;

  esFavorita(id: string): boolean {
    return this.datos.favoritas.some((e) => e.id === id);
  }

  alternarFavorita(emisora: Emisora): void {
    if (!this.datos.disponible) return;
    const limpia = sanearEmisora(emisora);
    if (!limpia) return;
    const favoritas = this.esFavorita(limpia.id)
      ? this.datos.favoritas.filter((e) => e.id !== limpia.id)
      : [limpia, ...this.datos.favoritas].slice(0, MAX_FAVORITAS);
    this.cambiar({ favoritas });
  }

  /** Se llama cuando una emisora empieza a sonar de verdad, no al navegar. */
  registrarReciente(emisora: Emisora): void {
    if (!this.datos.disponible) return;
    const limpia = sanearEmisora(emisora);
    if (!limpia) return;
    const recientes = [limpia, ...this.datos.recientes.filter((e) => e.id !== limpia.id)].slice(0, MAX_RECIENTES);
    this.cambiar({ recientes });
  }

  olvidarRecientes(): void {
    this.cambiar({ recientes: [] });
  }
}

function almacenamientoUtilizable(): Storage | null {
  try {
    const s = window.localStorage;
    const prueba = `${CLAVE}.prueba`;
    s.setItem(prueba, '1');
    s.removeItem(prueba);
    return s;
  } catch {
    return null;
  }
}

export const almacen = new AlmacenLocal(typeof window === 'undefined' ? null : almacenamientoUtilizable());
