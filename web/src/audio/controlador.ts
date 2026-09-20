import type { Emisora } from '../tipos';

export type EstadoReproduccion = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export type CodigoError = 'autoplay' | 'tiempo' | 'senal' | 'formato' | 'red';

export interface ErrorAudio {
  codigo: CodigoError;
  mensaje: string;
}

export interface EstadoAudio {
  estado: EstadoReproduccion;
  emisora: Emisora | null;
  error: ErrorAudio | null;
  volumen: number;
  silenciado: boolean;
  /** Falso en navegadores que ignoran `volume` (iOS): el control se oculta. */
  puedeVolumen: boolean;
}

/** Subconjunto de HTMLAudioElement que usa el controlador; permite un doble en pruebas. */
export interface ElementoAudio {
  src: string;
  volume: number;
  muted: boolean;
  preload: string;
  error: { code: number } | null;
  play(): Promise<void>;
  pause(): void;
  load(): void;
  removeAttribute(nombre: string): void;
  addEventListener(tipo: string, oyente: () => void): void;
  removeEventListener(tipo: string, oyente: () => void): void;
}

export interface OpcionesControlador {
  /** Tiempo máximo esperando a que empiece a sonar antes de declarar error. */
  tiempoEsperaMs?: number;
  /** Se llama una vez por selección cuando la reproducción es efectiva. */
  alEmpezar?: (emisora: Emisora) => void;
  /** Ventana o equivalente para escuchar `online`/`offline`; opcional en pruebas. */
  ventana?: Pick<Window, 'addEventListener' | 'removeEventListener'> | null;
}

const MENSAJES: Record<CodigoError, string> = {
  autoplay: 'El navegador ha bloqueado el inicio automático. Pulsa reproducir para escuchar.',
  tiempo: 'La emisora tarda demasiado en responder.',
  senal: 'La señal se ha cortado o no está disponible ahora mismo.',
  formato: 'Este navegador no puede reproducir esta señal.',
  red: 'Sin conexión. Cuando vuelva, reintenta o elige otra emisora.',
};

const MEDIA_ERR_SRC_NOT_SUPPORTED = 4;

/**
 * Único controlador de audio de la aplicación. Envuelve un solo elemento de audio persistente
 * y garantiza que solo la última selección puede alterar el estado: cada `seleccionar` incrementa
 * una generación, y cualquier evento o promesa de una generación anterior se ignora.
 */
export class ControladorAudio {
  private generacion = 0;
  private empezoGeneracion = -1;
  private temporizador: ReturnType<typeof setTimeout> | null = null;
  private estadoActual: EstadoAudio;
  private readonly oyentes = new Set<() => void>();
  private readonly tiempoEsperaMs: number;
  private readonly alEmpezar: ((emisora: Emisora) => void) | undefined;
  private readonly ventana: OpcionesControlador['ventana'];

  constructor(
    private readonly el: ElementoAudio,
    opciones: OpcionesControlador = {},
  ) {
    this.tiempoEsperaMs = opciones.tiempoEsperaMs ?? 15_000;
    this.alEmpezar = opciones.alEmpezar;
    this.ventana = opciones.ventana ?? (typeof window !== 'undefined' ? window : null);
    el.preload = 'none';
    const puedeVolumen = detectarVolumen(el);
    this.estadoActual = {
      estado: 'idle',
      emisora: null,
      error: null,
      volumen: el.volume,
      silenciado: el.muted,
      puedeVolumen,
    };
    el.addEventListener('playing', this.enPlaying);
    el.addEventListener('waiting', this.enWaiting);
    el.addEventListener('pause', this.enPause);
    el.addEventListener('ended', this.enEnded);
    el.addEventListener('error', this.enError);
    this.ventana?.addEventListener('offline', this.enOffline);
  }

  /** Para pruebas o desmontaje; en la app el controlador vive tanto como la página. */
  destruir(): void {
    this.detener();
    this.el.removeEventListener('playing', this.enPlaying);
    this.el.removeEventListener('waiting', this.enWaiting);
    this.el.removeEventListener('pause', this.enPause);
    this.el.removeEventListener('ended', this.enEnded);
    this.el.removeEventListener('error', this.enError);
    this.ventana?.removeEventListener('offline', this.enOffline);
    this.oyentes.clear();
  }

  // --- Suscripción (compatible con useSyncExternalStore) ---

  suscribir = (oyente: () => void): (() => void) => {
    this.oyentes.add(oyente);
    return () => this.oyentes.delete(oyente);
  };

  instantanea = (): EstadoAudio => this.estadoActual;

  private fijar(parcial: Partial<EstadoAudio>): void {
    this.estadoActual = { ...this.estadoActual, ...parcial };
    for (const oyente of this.oyentes) oyente();
  }

  // --- Acciones ---

  /** Selecciona y empieza a reproducir una emisora. Invalida cualquier selección anterior. */
  seleccionar(emisora: Emisora): void {
    const g = ++this.generacion;
    this.limpiarTemporizador();
    this.el.pause();
    this.el.src = emisora.url;
    this.el.load();
    this.fijar({ estado: 'loading', emisora, error: null });
    this.temporizador = setTimeout(() => {
      if (g !== this.generacion) return;
      this.vaciarElemento();
      this.fijar({ estado: 'error', error: { codigo: 'tiempo', mensaje: MENSAJES.tiempo } });
    }, this.tiempoEsperaMs);

    let promesa: Promise<void>;
    try {
      promesa = this.el.play();
    } catch (e) {
      promesa = Promise.reject(e);
    }
    promesa.catch((e: unknown) => {
      if (g !== this.generacion) return;
      const nombre = e instanceof Error ? e.name : '';
      if (nombre === 'AbortError') return; // sustituida por otra carga: la ignoramos
      this.limpiarTemporizador();
      if (nombre === 'NotAllowedError') {
        this.fijar({ estado: 'error', error: { codigo: 'autoplay', mensaje: MENSAJES.autoplay } });
        return;
      }
      if (nombre === 'NotSupportedError') {
        this.vaciarElemento();
        this.fijar({ estado: 'error', error: { codigo: 'formato', mensaje: MENSAJES.formato } });
        return;
      }
      this.vaciarElemento();
      this.fijar({ estado: 'error', error: { codigo: 'senal', mensaje: MENSAJES.senal } });
    });
  }

  pausar(): void {
    if (this.estadoActual.estado !== 'playing' && this.estadoActual.estado !== 'loading') return;
    this.limpiarTemporizador();
    this.el.pause();
    this.fijar({ estado: 'paused', error: null });
  }

  /** Vuelve al directo: en radio en vivo no hay nada guardado, así que se reconecta la señal. */
  reanudar(): void {
    const { emisora } = this.estadoActual;
    if (!emisora) return;
    this.seleccionar(emisora);
  }

  reintentar(): void {
    this.reanudar();
  }

  alternar(): void {
    const { estado } = this.estadoActual;
    if (estado === 'playing' || estado === 'loading') this.pausar();
    else this.reanudar();
  }

  detener(): void {
    this.generacion++;
    this.limpiarTemporizador();
    this.vaciarElemento();
    this.fijar({ estado: 'idle', emisora: null, error: null });
  }

  fijarVolumen(valor: number): void {
    const v = Math.min(1, Math.max(0, valor));
    this.el.volume = v;
    this.fijar({ volumen: v, silenciado: v === 0 ? this.estadoActual.silenciado : false });
    if (v > 0 && this.el.muted) {
      this.el.muted = false;
      this.fijar({ silenciado: false });
    }
  }

  silenciar(valor: boolean): void {
    this.el.muted = valor;
    this.fijar({ silenciado: valor });
  }

  // --- Eventos del elemento ---

  private enPlaying = (): void => {
    const { estado, emisora } = this.estadoActual;
    if (estado !== 'loading' && estado !== 'playing') return;
    this.limpiarTemporizador();
    this.fijar({ estado: 'playing', error: null });
    if (emisora && this.empezoGeneracion !== this.generacion) {
      this.empezoGeneracion = this.generacion;
      this.alEmpezar?.(emisora);
    }
  };

  private enWaiting = (): void => {
    if (this.estadoActual.estado !== 'playing') return;
    this.fijar({ estado: 'loading' });
    const g = this.generacion;
    this.limpiarTemporizador();
    this.temporizador = setTimeout(() => {
      if (g !== this.generacion || this.estadoActual.estado !== 'loading') return;
      this.vaciarElemento();
      this.fijar({ estado: 'error', error: { codigo: 'tiempo', mensaje: MENSAJES.tiempo } });
    }, this.tiempoEsperaMs);
  };

  private enPause = (): void => {
    // Pausas iniciadas por el sistema (p. ej. otra app en móvil). Las nuestras ya cambiaron el estado.
    if (this.estadoActual.estado === 'playing') this.fijar({ estado: 'paused' });
  };

  private enEnded = (): void => {
    if (this.estadoActual.estado === 'idle' || this.estadoActual.estado === 'error') return;
    this.limpiarTemporizador();
    this.fijar({ estado: 'error', error: { codigo: 'senal', mensaje: MENSAJES.senal } });
  };

  private enError = (): void => {
    if (this.estadoActual.estado === 'idle' || this.estadoActual.estado === 'error') return;
    this.limpiarTemporizador();
    const codigo: CodigoError = this.el.error?.code === MEDIA_ERR_SRC_NOT_SUPPORTED ? 'formato' : 'senal';
    this.fijar({ estado: 'error', error: { codigo, mensaje: MENSAJES[codigo] } });
  };

  private enOffline = (): void => {
    if (this.estadoActual.estado !== 'playing' && this.estadoActual.estado !== 'loading') return;
    this.limpiarTemporizador();
    this.el.pause();
    this.fijar({ estado: 'error', error: { codigo: 'red', mensaje: MENSAJES.red } });
  };

  // --- Utilidades ---

  private vaciarElemento(): void {
    this.el.pause();
    this.el.removeAttribute('src');
    this.el.load();
  }

  private limpiarTemporizador(): void {
    if (this.temporizador !== null) {
      clearTimeout(this.temporizador);
      this.temporizador = null;
    }
  }
}

function detectarVolumen(el: ElementoAudio): boolean {
  try {
    const original = el.volume;
    el.volume = 0.5;
    const cambia = el.volume === 0.5;
    el.volume = original;
    return cambia;
  } catch {
    return false;
  }
}

export { MENSAJES as MENSAJES_ERROR_AUDIO };
