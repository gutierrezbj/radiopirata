import { describe, expect, it } from 'vitest';
import type { Lugar } from '../src/tipos';
import { buscarLugares, lugarAlAzar, lugarExacto } from '../src/util/lugares';

const lugares: Lugar[] = [
  { id: 'tokio', nombre: 'Tokio', pais: 'Japón', codigoPais: 'JP', coordenadas: { lat: 35.7, lng: 139.7 }, alias: ['Tokyo', '東京'], zonaHoraria: 'Asia/Tokyo' },
  { id: 'osaka', nombre: 'Osaka', pais: 'Japón', codigoPais: 'JP', coordenadas: { lat: 34.7, lng: 135.5 }, alias: ['Osaka'], zonaHoraria: 'Asia/Tokyo' },
  { id: 'lisboa', nombre: 'Lisboa', pais: 'Portugal', codigoPais: 'PT', coordenadas: { lat: 38.7, lng: -9.1 }, alias: ['Lisbon'], zonaHoraria: 'Europe/Lisbon' },
  { id: 'oporto', nombre: 'Oporto', pais: 'Portugal', codigoPais: 'PT', coordenadas: { lat: 41.1, lng: -8.6 }, alias: ['Porto'], zonaHoraria: 'Europe/Lisbon' },
];

describe('buscarLugares', () => {
  it('encuentra por nombre, alias y país sin importar acentos ni mayúsculas', () => {
    expect(buscarLugares('TOKYO', lugares)[0]?.id).toBe('tokio');
    expect(buscarLugares('lisbon', lugares)[0]?.id).toBe('lisboa');
    expect(buscarLugares('japon', lugares).map((l) => l.id)).toEqual(['osaka', 'tokio']);
    expect(buscarLugares('Opor', lugares)[0]?.id).toBe('oporto');
  });

  it('no devuelve nada con textos muy cortos o desconocidos', () => {
    expect(buscarLugares('t', lugares)).toEqual([]);
    expect(buscarLugares('atlantida', lugares)).toEqual([]);
  });
});

describe('lugarExacto', () => {
  it('solo resuelve cuando el texto es exactamente una ciudad o su alias', () => {
    expect(lugarExacto('Tokio', lugares)?.id).toBe('tokio');
    expect(lugarExacto('tokyo', lugares)?.id).toBe('tokio');
    expect(lugarExacto('Lisbon', lugares)?.id).toBe('lisboa');
  });

  it('no adivina ante un texto parcial, un país o algo ambiguo', () => {
    expect(lugarExacto('Tok', lugares)).toBeNull();
    expect(lugarExacto('Japón', lugares)).toBeNull();
    expect(lugarExacto('jazz', lugares)).toBeNull();
    const repetidos: Lugar[] = [
      { ...lugares[0]!, id: 'uno', nombre: 'Santiago' },
      { ...lugares[1]!, id: 'dos', nombre: 'Santiago' },
    ];
    expect(lugarExacto('Santiago', repetidos)).toBeNull();
  });
});

describe('lugarAlAzar', () => {
  it('elige dentro de los disponibles', () => {
    expect(lugarAlAzar(lugares, () => 0)?.id).toBe('tokio');
    expect(lugarAlAzar(lugares, () => 0.99)?.id).toBe('oporto');
    expect(lugarAlAzar([], () => 0)).toBeNull();
  });
});
