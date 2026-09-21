import { describe, expect, it } from 'vitest';
import { fraseHora, horaLocal, horaLocalNumerica, momentoDelDia } from '../src/util/hora';

const instante = new Date('2026-09-21T02:14:00Z');

describe('horaLocal', () => {
  it('da la hora de allí con la zona de cada ciudad', () => {
    expect(horaLocal('America/Caracas', instante)).toBe('22:14');
    expect(horaLocal('Asia/Tokyo', instante)).toBe('11:14');
    expect(horaLocal('Europe/Madrid', instante)).toBe('04:14');
    expect(horaLocalNumerica('America/Caracas', instante)).toBe(22);
  });

  it('no inventa nada si la zona no existe', () => {
    expect(horaLocal('Marte/Olympus', instante)).toBeNull();
    expect(horaLocalNumerica('Marte/Olympus', instante)).toBeNull();
    expect(fraseHora('Marte/Olympus', instante)).toBeNull();
  });
});

describe('momentoDelDia', () => {
  it('describe la hora con las palabras de todos los días', () => {
    expect(momentoDelDia(3)).toBe('de madrugada');
    expect(momentoDelDia(9)).toBe('por la mañana');
    expect(momentoDelDia(13)).toBe('a mediodía');
    expect(momentoDelDia(17)).toBe('por la tarde');
    expect(momentoDelDia(22)).toBe('por la noche');
  });
});

describe('fraseHora', () => {
  it('junta la hora y el momento en una frase', () => {
    expect(fraseHora('America/Caracas', instante)).toBe('Allí son las 22:14, por la noche.');
    expect(fraseHora('Europe/Madrid', instante)).toBe('Allí son las 04:14, de madrugada.');
  });
});
