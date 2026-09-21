import { describe, expect, it } from 'vitest';
import { elevacionSolar, esDeNoche, posicionDelSol, puntoSubsolar } from '../src/util/sol';

describe('puntoSubsolar', () => {
  it('en el equinoccio de marzo el sol está sobre el ecuador', () => {
    const { lat } = puntoSubsolar(new Date('2026-03-20T14:46:00Z'));
    expect(Math.abs(lat)).toBeLessThan(1);
  });

  it('en el solsticio de junio está sobre el trópico de Cáncer y en diciembre sobre el de Capricornio', () => {
    expect(puntoSubsolar(new Date('2026-06-21T08:24:00Z')).lat).toBeCloseTo(23.4, 0);
    expect(puntoSubsolar(new Date('2026-12-21T20:50:00Z')).lat).toBeCloseTo(-23.4, 0);
  });

  it('a mediodía UTC está cerca de Greenwich y seis horas después sobre América', () => {
    expect(Math.abs(puntoSubsolar(new Date('2026-09-21T12:00:00Z')).lng)).toBeLessThan(5);
    expect(puntoSubsolar(new Date('2026-09-21T18:00:00Z')).lng).toBeCloseTo(-90, -1);
  });
});

describe('esDeNoche', () => {
  it('a medianoche en Tokio es de noche y a mediodía en Madrid es de día', () => {
    // 15:00 UTC son las 00:00 en Tokio; 12:00 UTC son las 14:00 en Madrid en septiembre.
    expect(esDeNoche(35.68, 139.65, new Date('2026-09-21T15:00:00Z'))).toBe(true);
    expect(esDeNoche(40.42, -3.7, new Date('2026-09-21T12:00:00Z'))).toBe(false);
  });

  it('en Caracas a las tres de la madrugada es de noche', () => {
    // Caracas va cuatro horas por detrás de UTC: 07:00 UTC son las 03:00 allí.
    expect(esDeNoche(10.48, -66.9, new Date('2026-09-21T07:00:00Z'))).toBe(true);
    expect(elevacionSolar(10.48, -66.9, new Date('2026-09-21T07:00:00Z'))).toBeLessThan(-6);
  });

  it('siempre es de noche en algún sitio del mundo', () => {
    const ahora = new Date('2026-09-21T10:30:00Z');
    const puntos = [
      [35.68, 139.65],
      [40.42, -3.7],
      [-33.87, 151.21],
      [10.48, -66.9],
      [64.15, -21.94],
    ];
    expect(puntos.some(([lat, lng]) => esDeNoche(lat as number, lng as number, ahora))).toBe(true);
    expect(puntos.every(([lat, lng]) => esDeNoche(lat as number, lng as number, ahora))).toBe(false);
  });
});

describe('posicionDelSol', () => {
  it('coloca el sol a la distancia pedida y sobre el hemisferio iluminado', () => {
    const p = posicionDelSol(new Date('2026-09-21T12:00:00Z'), 500);
    expect(Math.hypot(p.x, p.y, p.z)).toBeCloseTo(500, 5);
    // A mediodía UTC el sol está sobre longitud 0: en el eje z positivo con estos ejes.
    expect(p.z).toBeGreaterThan(400);
  });
});
