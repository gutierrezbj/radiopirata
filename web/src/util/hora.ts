/**
 * Qué hora es en otro sitio. Se apoya en la zona horaria IANA de cada ciudad del índice
 * y en lo que el propio navegador sabe de husos horarios; si no sabe esa zona, no se inventa.
 */
export type MomentoDelDia = 'de madrugada' | 'por la mañana' | 'a mediodía' | 'por la tarde' | 'por la noche';

export function horaLocal(zona: string, fecha: Date = new Date()): string | null {
  try {
    return new Intl.DateTimeFormat('es', { timeZone: zona, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(fecha);
  } catch {
    return null;
  }
}

export function horaLocalNumerica(zona: string, fecha: Date = new Date()): number | null {
  try {
    const partes = new Intl.DateTimeFormat('es', { timeZone: zona, hour: 'numeric', hourCycle: 'h23' }).formatToParts(fecha);
    const hora = partes.find((p) => p.type === 'hour')?.value;
    const n = hora === undefined ? NaN : Number(hora);
    return Number.isInteger(n) && n >= 0 && n <= 23 ? n : null;
  } catch {
    return null;
  }
}

export function momentoDelDia(hora: number): MomentoDelDia {
  if (hora < 6) return 'de madrugada';
  if (hora < 12) return 'por la mañana';
  if (hora < 15) return 'a mediodía';
  if (hora < 20) return 'por la tarde';
  return 'por la noche';
}

/** La hora de quien escucha, con el huso de su propio navegador. */
export function horaAqui(fecha: Date = new Date()): string {
  return new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(fecha);
}

/** «11:50» → ['1', '1', '5', '0']. Lo que no sea dígito se descarta. */
export function digitosDeHora(hora: string): string[] {
  return hora.split('').filter((c) => c >= '0' && c <= '9');
}

/** «Allí son las 22:14, por la noche.» Null si el navegador no conoce la zona. */
export function fraseHora(zona: string, fecha: Date = new Date()): string | null {
  const hora = horaLocal(zona, fecha);
  const numero = horaLocalNumerica(zona, fecha);
  if (hora === null || numero === null) return null;
  return `Allí son las ${hora}, ${momentoDelDia(numero)}.`;
}
