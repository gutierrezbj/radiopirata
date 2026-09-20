/** Caché en memoria con caducidad y número máximo de entradas (se descarta la más antigua). */
export class CacheAcotada<V> {
  private readonly entradas = new Map<string, { valor: V; caduca: number }>();

  constructor(
    private readonly ttlMs: number,
    private readonly max: number,
    private readonly ahora: () => number = () => Date.now(),
  ) {
    if (ttlMs <= 0 || max <= 0) throw new Error('ttlMs y max deben ser positivos');
  }

  get(clave: string): V | undefined {
    const e = this.entradas.get(clave);
    if (!e) return undefined;
    if (e.caduca <= this.ahora()) {
      this.entradas.delete(clave);
      return undefined;
    }
    return e.valor;
  }

  set(clave: string, valor: V): void {
    if (this.entradas.has(clave)) this.entradas.delete(clave);
    this.entradas.set(clave, { valor, caduca: this.ahora() + this.ttlMs });
    while (this.entradas.size > this.max) {
      const primera = this.entradas.keys().next().value;
      if (primera === undefined) break;
      this.entradas.delete(primera);
    }
  }

  get tamano(): number {
    return this.entradas.size;
  }

  limpiar(): void {
    this.entradas.clear();
  }
}
