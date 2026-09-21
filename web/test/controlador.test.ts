import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ControladorAudio, sintoniaDe, type ElementoAudio } from '../src/audio/controlador';
import type { Emisora } from '../src/tipos';

/** Doble de HTMLAudioElement: cada play() devuelve una promesa que la prueba resuelve o rechaza a mano. */
class AudioFalso implements ElementoAudio {
  src = '';
  volume = 1;
  muted = false;
  preload = '';
  error: { code: number } | null = null;
  readyState = 0;
  pausas = 0;
  cargas = 0;
  pendientes: Array<{ src: string; resolver: () => void; rechazar: (e: Error) => void }> = [];
  private oyentes = new Map<string, Set<() => void>>();

  play(): Promise<void> {
    return new Promise<void>((resolver, rechazar) => {
      this.pendientes.push({ src: this.src, resolver, rechazar });
    });
  }
  pause(): void {
    this.pausas++;
  }
  load(): void {
    this.cargas++;
  }
  removeAttribute(nombre: string): void {
    if (nombre === 'src') this.src = '';
  }
  addEventListener(tipo: string, oyente: () => void): void {
    if (!this.oyentes.has(tipo)) this.oyentes.set(tipo, new Set());
    this.oyentes.get(tipo)!.add(oyente);
  }
  removeEventListener(tipo: string, oyente: () => void): void {
    this.oyentes.get(tipo)?.delete(oyente);
  }
  emitir(tipo: string): void {
    for (const o of this.oyentes.get(tipo) ?? []) o();
  }
  /** Resuelve la promesa de play() pendiente para una URL y emite `playing`, como haría el navegador. */
  async empiezaASonar(src: string): Promise<void> {
    const p = this.pendientes.find((x) => x.src === src);
    if (!p) throw new Error(`no hay play() pendiente para ${src}`);
    p.resolver();
    await Promise.resolve();
    if (this.src === src) this.emitir('playing');
  }
  async rechaza(src: string, nombre: string): Promise<void> {
    const p = this.pendientes.find((x) => x.src === src);
    if (!p) throw new Error(`no hay play() pendiente para ${src}`);
    const e = new Error(nombre);
    e.name = nombre;
    p.rechazar(e);
    await Promise.resolve();
    await Promise.resolve();
  }
}

function emisora(id: string): Emisora {
  return {
    id,
    nombre: `Emisora ${id}`,
    destinoId: 'lisboa',
    pais: 'Portugal',
    codigoPais: 'PT',
    idioma: 'portuguese',
    etiquetas: [],
    url: `https://ejemplo.test/${id}`,
    web: null,
    codec: 'MP3',
    bitrate: 128,
    coordenadas: null,
    ubicacionSegunCatalogo: 'Lisboa',
  };
}

const A = emisora('a');
const B = emisora('b');
const C = emisora('c');

let el: AudioFalso;
let controlador: ControladorAudio;
let empezadas: string[];

beforeEach(() => {
  vi.useFakeTimers();
  el = new AudioFalso();
  empezadas = [];
  controlador = new ControladorAudio(el, { tiempoEsperaMs: 1000, alEmpezar: (e) => empezadas.push(e.id), ventana: null });
});

afterEach(() => {
  controlador.destruir();
  vi.useRealTimers();
});

describe('ControladorAudio', () => {
  it('pasa de idle a loading y a playing con una selección', async () => {
    expect(controlador.instantanea().estado).toBe('idle');
    controlador.seleccionar(A);
    expect(controlador.instantanea()).toMatchObject({ estado: 'loading', emisora: A, error: null });
    expect(el.src).toBe(A.url);
    await el.empiezaASonar(A.url);
    expect(controlador.instantanea().estado).toBe('playing');
    expect(empezadas).toEqual(['a']);
  });

  it('cambio rápido A → B → C: solo C queda activa y las respuestas atrasadas se ignoran', async () => {
    controlador.seleccionar(A);
    controlador.seleccionar(B);
    controlador.seleccionar(C);
    expect(el.src).toBe(C.url);
    expect(controlador.instantanea().emisora).toBe(C);

    // A y B responden tarde: no deben tocar el estado ni contar como escucha.
    await el.empiezaASonar(A.url);
    await el.rechaza(B.url, 'NotAllowedError');
    expect(controlador.instantanea()).toMatchObject({ estado: 'loading', emisora: C, error: null });
    expect(empezadas).toEqual([]);

    await el.empiezaASonar(C.url);
    expect(controlador.instantanea()).toMatchObject({ estado: 'playing', emisora: C });
    expect(empezadas).toEqual(['c']);
  });

  it('cada selección pausa la anterior antes de cargar la nueva: nunca suenan dos', () => {
    controlador.seleccionar(A);
    const pausasAntes = el.pausas;
    controlador.seleccionar(B);
    expect(el.pausas).toBeGreaterThan(pausasAntes);
    expect(el.cargas).toBe(2);
    expect(el.src).toBe(B.url);
  });

  it('un play() rechazado por autoplay produce un error comprensible y reintentable', async () => {
    controlador.seleccionar(A);
    await el.rechaza(A.url, 'NotAllowedError');
    const estado = controlador.instantanea();
    expect(estado.estado).toBe('error');
    expect(estado.error?.codigo).toBe('autoplay');
    expect(estado.error?.mensaje).toMatch(/Pulsa reproducir/);

    controlador.reintentar();
    expect(controlador.instantanea().estado).toBe('loading');
    await el.empiezaASonar(A.url);
    expect(controlador.instantanea().estado).toBe('playing');
  });

  it('declara error por espera excesiva si la emisora no empieza a sonar', () => {
    controlador.seleccionar(A);
    vi.advanceTimersByTime(999);
    expect(controlador.instantanea().estado).toBe('loading');
    vi.advanceTimersByTime(1);
    expect(controlador.instantanea()).toMatchObject({ estado: 'error', error: { codigo: 'tiempo' } });
    expect(el.src).toBe('');
  });

  it('el temporizador de una selección anterior no afecta a la nueva', async () => {
    controlador.seleccionar(A);
    vi.advanceTimersByTime(900);
    controlador.seleccionar(B);
    vi.advanceTimersByTime(200);
    expect(controlador.instantanea()).toMatchObject({ estado: 'loading', emisora: B });
    await el.empiezaASonar(B.url);
    expect(controlador.instantanea().estado).toBe('playing');
  });

  it('una señal caída durante la escucha pasa a error de señal', async () => {
    controlador.seleccionar(A);
    await el.empiezaASonar(A.url);
    el.error = { code: 2 };
    el.emitir('error');
    expect(controlador.instantanea()).toMatchObject({ estado: 'error', error: { codigo: 'senal' } });
  });

  it('un formato no admitido se distingue de una señal caída', () => {
    controlador.seleccionar(A);
    el.error = { code: 4 };
    el.emitir('error');
    expect(controlador.instantanea().error?.codigo).toBe('formato');
  });

  it('pausar y reanudar vuelve al directo recargando la señal', async () => {
    controlador.seleccionar(A);
    await el.empiezaASonar(A.url);
    controlador.pausar();
    expect(controlador.instantanea().estado).toBe('paused');
    const cargas = el.cargas;
    controlador.reanudar();
    expect(el.cargas).toBe(cargas + 1);
    expect(controlador.instantanea().estado).toBe('loading');
    await el.empiezaASonar(A.url);
    expect(controlador.instantanea().estado).toBe('playing');
    // Se registra una escucha por cada inicio efectivo, no por cada evento playing.
    el.emitir('playing');
    expect(empezadas).toEqual(['a', 'a']);
  });

  it('un corte de conexión detiene la escucha con un mensaje de red', async () => {
    const ventana = new EventTarget();
    const c = new ControladorAudio(new AudioFalso(), { ventana, tiempoEsperaMs: 1000 });
    c.seleccionar(A);
    ventana.dispatchEvent(new Event('offline'));
    expect(c.instantanea()).toMatchObject({ estado: 'error', error: { codigo: 'red' } });
    c.destruir();
  });

  it('un rebuffering prolongado también termina en error de tiempo', async () => {
    controlador.seleccionar(A);
    await el.empiezaASonar(A.url);
    el.emitir('waiting');
    expect(controlador.instantanea().estado).toBe('loading');
    vi.advanceTimersByTime(1000);
    expect(controlador.instantanea().error?.codigo).toBe('tiempo');
  });

  it('detener vacía el elemento y vuelve a idle', async () => {
    controlador.seleccionar(A);
    await el.empiezaASonar(A.url);
    controlador.detener();
    expect(controlador.instantanea()).toMatchObject({ estado: 'idle', emisora: null });
    expect(el.src).toBe('');
    // Eventos posteriores del elemento ya no cambian nada.
    el.emitir('error');
    expect(controlador.instantanea().estado).toBe('idle');
  });

  it('notifica a los suscriptores en cada cambio y deja de hacerlo al cancelar', () => {
    const oyente = vi.fn();
    const cancelar = controlador.suscribir(oyente);
    controlador.seleccionar(A);
    expect(oyente).toHaveBeenCalledTimes(1);
    cancelar();
    controlador.pausar();
    expect(oyente).toHaveBeenCalledTimes(1);
  });

  it('la sintonía sube con lo que el navegador va teniendo del audio', async () => {
    expect(controlador.instantanea().sintonia).toBe(0);

    controlador.seleccionar(A);
    expect(controlador.instantanea().sintonia).toBe(0.15);

    el.readyState = 1;
    el.emitir('loadedmetadata');
    expect(controlador.instantanea().sintonia).toBe(0.35);

    el.readyState = 2;
    el.emitir('loadeddata');
    expect(controlador.instantanea().sintonia).toBe(0.6);

    el.readyState = 3;
    el.emitir('canplay');
    expect(controlador.instantanea().sintonia).toBe(0.85);

    await el.empiezaASonar(A.url);
    expect(controlador.instantanea().sintonia).toBe(1);
  });

  it('la sintonía cae a cero si la señal falla y no se queda alta de la emisora anterior', async () => {
    controlador.seleccionar(A);
    el.readyState = 4;
    await el.empiezaASonar(A.url);
    expect(controlador.instantanea().sintonia).toBe(1);

    el.error = { code: 2 };
    el.emitir('error');
    expect(controlador.instantanea()).toMatchObject({ estado: 'error', sintonia: 0 });
  });

  it('en pausa la sintonía se queda a medias, ni apagada ni sonando', async () => {
    controlador.seleccionar(A);
    el.readyState = 4;
    await el.empiezaASonar(A.url);
    controlador.pausar();
    expect(controlador.instantanea().sintonia).toBe(0.5);
  });

  it('solo avisa cuando la aguja se mueve de verdad', () => {
    controlador.seleccionar(A);
    const oyente = vi.fn();
    controlador.suscribir(oyente);
    el.emitir('progress');
    expect(oyente).not.toHaveBeenCalled();
    el.readyState = 2;
    el.emitir('progress');
    expect(oyente).toHaveBeenCalledTimes(1);
  });

  it('volumen y silencio se reflejan en el elemento', () => {
    controlador.fijarVolumen(1.7);
    expect(el.volume).toBe(1);
    controlador.fijarVolumen(0.3);
    expect(controlador.instantanea().volumen).toBe(0.3);
    controlador.silenciar(true);
    expect(el.muted).toBe(true);
    controlador.fijarVolumen(0.5);
    expect(el.muted).toBe(false);
    expect(controlador.instantanea().silenciado).toBe(false);
  });
});
