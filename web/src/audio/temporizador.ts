export interface EstadoTemporizador {
  activo: boolean;
  /** Instante en que se apaga, en milisegundos desde 1970. */
  terminaEn: number | null;
  restanteMs: number;
}

export const OPCIONES_MINUTOS = [15, 30, 45, 60] as const;

/**
 * Temporizador para dormirse con la radio puesta. Cuenta contra un instante fijo, no
 * contra ticks: si el navegador ralentiza los temporizadores en segundo plano, el apagado
 * llega igual a su hora en cuanto vuelve a mirar el reloj.
 */
export class Temporizador {
  private estado: EstadoTemporizador = { activo: false, terminaEn: null, restanteMs: 0 };
  private tic: ReturnType<typeof setInterval> | null = null;
  private readonly oyentes = new Set<() => void>();

  constructor(
    private readonly alTerminar: () => void,
    private readonly ahora: () => number = () => Date.now(),
  ) {}

  suscribir = (oyente: () => void): (() => void) => {
    this.oyentes.add(oyente);
    return () => this.oyentes.delete(oyente);
  };

  instantanea = (): EstadoTemporizador => this.estado;

  programar(minutos: number): void {
    if (!Number.isFinite(minutos) || minutos <= 0) return;
    this.detenerTic();
    const terminaEn = this.ahora() + minutos * 60_000;
    this.fijar({ activo: true, terminaEn, restanteMs: minutos * 60_000 });
    this.tic = setInterval(() => this.comprobar(), 1000);
  }

  cancelar(): void {
    this.detenerTic();
    this.fijar({ activo: false, terminaEn: null, restanteMs: 0 });
  }

  /** Mira el reloj: actualiza lo que queda y, si ya es la hora, apaga. */
  comprobar(): void {
    if (!this.estado.activo || this.estado.terminaEn === null) return;
    const restanteMs = Math.max(0, this.estado.terminaEn - this.ahora());
    if (restanteMs === 0) {
      this.cancelar();
      this.alTerminar();
      return;
    }
    this.fijar({ restanteMs });
  }

  private detenerTic(): void {
    if (this.tic !== null) {
      clearInterval(this.tic);
      this.tic = null;
    }
  }

  private fijar(parcial: Partial<EstadoTemporizador>): void {
    this.estado = { ...this.estado, ...parcial };
    for (const oyente of this.oyentes) oyente();
  }
}

/** «28 min» o «45 s», para el reproductor. */
export function textoRestante(ms: number): string {
  const segundos = Math.ceil(ms / 1000);
  if (segundos >= 60) return `${Math.ceil(segundos / 60)} min`;
  return `${segundos} s`;
}
