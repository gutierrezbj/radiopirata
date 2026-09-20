import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AlmacenLocal, MAX_FAVORITAS, MAX_RECIENTES, sanearEmisora, VERSION } from '../src/almacen/local';
import type { Emisora } from '../src/tipos';

class AlmacenFalso implements Storage {
  private datos = new Map<string, string>();
  fallaAlEscribir = false;
  fallaAlLeer = false;

  get length(): number {
    return this.datos.size;
  }
  clear(): void {
    this.datos.clear();
  }
  key(i: number): string | null {
    return [...this.datos.keys()][i] ?? null;
  }
  getItem(clave: string): string | null {
    if (this.fallaAlLeer) throw new DOMException('bloqueado', 'SecurityError');
    return this.datos.get(clave) ?? null;
  }
  setItem(clave: string, valor: string): void {
    if (this.fallaAlEscribir) throw new DOMException('cuota', 'QuotaExceededError');
    this.datos.set(clave, valor);
  }
  removeItem(clave: string): void {
    this.datos.delete(clave);
  }
  bruto(clave: string): string | null {
    return this.datos.get(clave) ?? null;
  }
}

function emisora(id: string, extra: Partial<Emisora> = {}): Emisora {
  return {
    id,
    nombre: `Emisora ${id}`,
    destinoId: '',
    pais: 'Portugal',
    codigoPais: 'PT',
    idioma: 'portuguese',
    etiquetas: ['jazz'],
    url: `https://ejemplo.test/${id}`,
    web: null,
    codec: 'MP3',
    bitrate: 128,
    coordenadas: null,
    ubicacionSegunCatalogo: 'Lisboa',
    ...extra,
  };
}

let almacenamiento: AlmacenFalso;

beforeEach(() => {
  almacenamiento = new AlmacenFalso();
});

describe('sanearEmisora', () => {
  it('acepta una emisora completa y recorta lo que sobra', () => {
    const limpia = sanearEmisora({ ...emisora('a'), nombre: '  Nombre  ', etiquetas: new Array(30).fill('pop') });
    expect(limpia?.nombre).toBe('Nombre');
    expect(limpia?.etiquetas).toHaveLength(12);
  });

  it('rechaza lo que no sirve para reproducir ni identificar', () => {
    expect(sanearEmisora(null)).toBeNull();
    expect(sanearEmisora('texto')).toBeNull();
    expect(sanearEmisora({ ...emisora('a'), id: '' })).toBeNull();
    expect(sanearEmisora({ ...emisora('a'), nombre: '   ' })).toBeNull();
    expect(sanearEmisora({ ...emisora('a'), url: 'http://inseguro.test/a' })).toBeNull();
    expect(sanearEmisora({ ...emisora('a'), url: 'javascript:alert(1)' })).toBeNull();
  });

  it('descarta coordenadas y web que no son de fiar, sin tirar el resto', () => {
    const rara = sanearEmisora({ ...emisora('a'), coordenadas: { lat: 'x', lng: 2 }, web: 'http://web.test' });
    expect(rara?.coordenadas).toBeNull();
    expect(rara?.web).toBeNull();
    const buena = sanearEmisora({ ...emisora('a'), coordenadas: { lat: 1, lng: 2 }, web: 'https://web.test' });
    expect(buena?.coordenadas).toEqual({ lat: 1, lng: 2 });
    expect(buena?.web).toBe('https://web.test');
  });
});

describe('AlmacenLocal', () => {
  it('empieza vacío y disponible cuando no hay nada guardado', () => {
    const almacen = new AlmacenLocal(almacenamiento);
    expect(almacen.instantanea()).toEqual({ favoritas: [], recientes: [], disponible: true });
  });

  it('guarda favoritas con esquema versionado y las recupera en la siguiente sesión', () => {
    const almacen = new AlmacenLocal(almacenamiento);
    almacen.alternarFavorita(emisora('a'));
    expect(JSON.parse(almacenamiento.bruto('radiopirata') ?? '{}')).toMatchObject({ version: VERSION });

    const otraSesion = new AlmacenLocal(almacenamiento);
    expect(otraSesion.instantanea().favoritas.map((e) => e.id)).toEqual(['a']);
    expect(otraSesion.esFavorita('a')).toBe(true);
  });

  it('alternar quita la que ya estaba y avisa a quien escucha', () => {
    const almacen = new AlmacenLocal(almacenamiento);
    const oyente = vi.fn();
    const cancelar = almacen.suscribir(oyente);
    almacen.alternarFavorita(emisora('a'));
    almacen.alternarFavorita(emisora('a'));
    expect(almacen.instantanea().favoritas).toEqual([]);
    expect(oyente).toHaveBeenCalledTimes(2);
    cancelar();
    almacen.alternarFavorita(emisora('b'));
    expect(oyente).toHaveBeenCalledTimes(2);
  });

  it('pone lo último escuchado delante, sin repetir, y guarda como mucho veinte', () => {
    const almacen = new AlmacenLocal(almacenamiento);
    for (let i = 0; i < MAX_RECIENTES + 5; i++) almacen.registrarReciente(emisora(`e${i}`));
    const recientes = almacen.instantanea().recientes;
    expect(recientes).toHaveLength(MAX_RECIENTES);
    expect(recientes[0]?.id).toBe(`e${MAX_RECIENTES + 4}`);

    almacen.registrarReciente(emisora('e5'));
    const despues = almacen.instantanea().recientes;
    expect(despues[0]?.id).toBe('e5');
    expect(despues.filter((e) => e.id === 'e5')).toHaveLength(1);
  });

  it('limita el número de favoritas guardadas', () => {
    const almacen = new AlmacenLocal(almacenamiento);
    for (let i = 0; i < MAX_FAVORITAS + 3; i++) almacen.alternarFavorita(emisora(`f${i}`));
    expect(almacen.instantanea().favoritas).toHaveLength(MAX_FAVORITAS);
  });

  it('olvida las recientes cuando se le pide', () => {
    const almacen = new AlmacenLocal(almacenamiento);
    almacen.registrarReciente(emisora('a'));
    almacen.olvidarRecientes();
    expect(almacen.instantanea().recientes).toEqual([]);
  });
});

describe('AlmacenLocal — datos que no se pueden usar', () => {
  it('descarta entradas inválidas o repetidas sin perder las buenas', () => {
    almacenamiento.setItem(
      'radiopirata',
      JSON.stringify({
        version: VERSION,
        favoritas: [emisora('a'), null, { id: 'b' }, { ...emisora('c'), url: 'http://x' }, emisora('a'), emisora('d')],
        recientes: 'esto no es una lista',
      }),
    );
    const almacen = new AlmacenLocal(almacenamiento);
    expect(almacen.instantanea().favoritas.map((e) => e.id)).toEqual(['a', 'd']);
    expect(almacen.instantanea().recientes).toEqual([]);
    expect(almacen.instantanea().disponible).toBe(true);
  });

  it('empieza de cero ante un esquema de otra versión o un JSON roto', () => {
    almacenamiento.setItem('radiopirata', JSON.stringify({ version: 99, favoritas: [emisora('a')] }));
    expect(new AlmacenLocal(almacenamiento).instantanea().favoritas).toEqual([]);

    almacenamiento.setItem('radiopirata', '{esto no es json');
    const almacen = new AlmacenLocal(almacenamiento);
    expect(almacen.instantanea()).toMatchObject({ favoritas: [], recientes: [], disponible: true });
    // Y sigue pudiendo guardar encima.
    almacen.alternarFavorita(emisora('a'));
    expect(almacen.instantanea().favoritas).toHaveLength(1);
  });
});

describe('AlmacenLocal — cuando el navegador no deja guardar', () => {
  it('se marca como no disponible si falla la escritura y no finge que guardó', () => {
    const almacen = new AlmacenLocal(almacenamiento);
    almacenamiento.fallaAlEscribir = true;
    almacen.alternarFavorita(emisora('a'));
    expect(almacen.instantanea().disponible).toBe(false);
    // A partir de aquí no se acepta nada más, para que la interfaz pueda esconder los controles.
    almacen.alternarFavorita(emisora('b'));
    almacen.registrarReciente(emisora('c'));
    expect(almacen.instantanea().favoritas.map((e) => e.id)).toEqual(['a']);
    expect(almacen.instantanea().recientes).toEqual([]);
  });

  it('se marca como no disponible si ni siquiera se puede leer', () => {
    almacenamiento.fallaAlLeer = true;
    expect(new AlmacenLocal(almacenamiento).instantanea().disponible).toBe(false);
  });

  it('funciona sin almacenamiento ninguno', () => {
    const almacen = new AlmacenLocal(null);
    expect(almacen.instantanea().disponible).toBe(false);
    almacen.alternarFavorita(emisora('a'));
    expect(almacen.instantanea().favoritas).toEqual([]);
  });
});
