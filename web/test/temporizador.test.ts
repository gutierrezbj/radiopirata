import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Temporizador, textoRestante } from '../src/audio/temporizador';

let reloj: number;
let apagados: number;
let temporizador: Temporizador;

beforeEach(() => {
  vi.useFakeTimers();
  reloj = 1_000_000;
  apagados = 0;
  temporizador = new Temporizador(
    () => {
      apagados++;
    },
    () => reloj,
  );
});

afterEach(() => {
  temporizador.cancelar();
  vi.useRealTimers();
});

function pasan(ms: number): void {
  reloj += ms;
  vi.advanceTimersByTime(ms);
}

describe('Temporizador', () => {
  it('empieza apagado y se programa en minutos', () => {
    expect(temporizador.instantanea()).toEqual({ activo: false, terminaEn: null, restanteMs: 0 });
    temporizador.programar(30);
    expect(temporizador.instantanea()).toMatchObject({ activo: true, restanteMs: 30 * 60_000, terminaEn: reloj + 30 * 60_000 });
  });

  it('va descontando y apaga justo a su hora, una sola vez', () => {
    temporizador.programar(1);
    pasan(30_000);
    expect(temporizador.instantanea().restanteMs).toBe(30_000);
    expect(apagados).toBe(0);
    pasan(30_000);
    expect(apagados).toBe(1);
    expect(temporizador.instantanea().activo).toBe(false);
    pasan(60_000);
    expect(apagados).toBe(1);
  });

  it('apaga igualmente si el navegador se saltó los ticks: cuenta contra la hora, no contra los ticks', () => {
    temporizador.programar(10);
    // El reloj salta diez minutos de golpe, como una pestaña dormida, y solo llega un tick.
    reloj += 10 * 60_000;
    temporizador.comprobar();
    expect(apagados).toBe(1);
  });

  it('cancelar lo deja como estaba y ya no apaga', () => {
    temporizador.programar(1);
    temporizador.cancelar();
    pasan(120_000);
    expect(apagados).toBe(0);
    expect(temporizador.instantanea().activo).toBe(false);
  });

  it('programar de nuevo sustituye al anterior', () => {
    temporizador.programar(1);
    pasan(30_000);
    temporizador.programar(2);
    pasan(90_000);
    expect(apagados).toBe(0);
    pasan(30_000);
    expect(apagados).toBe(1);
  });

  it('ignora duraciones que no tienen sentido', () => {
    temporizador.programar(0);
    temporizador.programar(-5);
    temporizador.programar(Number.NaN);
    expect(temporizador.instantanea().activo).toBe(false);
  });

  it('avisa a quien escucha en cada cambio', () => {
    const oyente = vi.fn();
    temporizador.suscribir(oyente);
    temporizador.programar(1);
    pasan(1000);
    expect(oyente).toHaveBeenCalledTimes(2);
  });
});

describe('textoRestante', () => {
  it('redondea hacia arriba para no decir «0 min» con medio minuto por delante', () => {
    expect(textoRestante(28 * 60_000)).toBe('28 min');
    expect(textoRestante(61_000)).toBe('2 min');
    expect(textoRestante(45_000)).toBe('45 s');
    expect(textoRestante(500)).toBe('1 s');
  });
});
