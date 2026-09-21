import { describe, expect, it } from 'vitest';
import { sintoniaDe } from '../src/audio/controlador';
import { calidad } from '../src/componentes/DialSintonia';

describe('sintoniaDe', () => {
  it('traduce lo que el navegador tiene del audio a una escala de cero a uno', () => {
    expect(sintoniaDe('idle', 0)).toBe(0);
    expect(sintoniaDe('loading', 0)).toBe(0.15);
    expect(sintoniaDe('loading', 1)).toBe(0.35);
    expect(sintoniaDe('loading', 2)).toBe(0.6);
    expect(sintoniaDe('loading', 3)).toBe(0.85);
    expect(sintoniaDe('loading', 4)).toBe(0.85);
    expect(sintoniaDe('paused', 4)).toBe(0.5);
    expect(sintoniaDe('playing', 4)).toBe(1);
  });

  it('no da señal por buena solo porque haya datos: si falla, es cero', () => {
    expect(sintoniaDe('error', 4)).toBe(0);
  });

  it('nunca se sale de la escala', () => {
    for (const rs of [-1, 0, 1, 2, 3, 4, 99]) {
      for (const estado of ['idle', 'loading', 'playing', 'paused', 'error'] as const) {
        const v = sintoniaDe(estado, rs);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('calidad del dial', () => {
  it('va de rojo a ámbar y a verde según entra la señal', () => {
    expect(calidad(0.15, 'loading')).toBe('debil');
    expect(calidad(0.35, 'loading')).toBe('debil');
    expect(calidad(0.6, 'loading')).toBe('media');
    expect(calidad(0.85, 'loading')).toBe('media');
    expect(calidad(1, 'playing')).toBe('buena');
  });

  it('marca el fallo en rojo y el reposo en gris', () => {
    expect(calidad(0, 'error')).toBe('nula');
    expect(calidad(0.5, 'paused')).toBe('quieta');
    expect(calidad(0, 'idle')).toBe('quieta');
  });

  it('el verde solo aparece cuando de verdad está sonando', () => {
    expect(calidad(1, 'loading')).toBe('media');
    expect(calidad(1, 'error')).toBe('nula');
  });
});
