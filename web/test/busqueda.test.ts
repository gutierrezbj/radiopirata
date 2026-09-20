import { describe, expect, it } from 'vitest';
import type { Destino } from '../src/tipos';
import { destinoAlAzar, resolverDestino } from '../src/util/busqueda';

const destinos: Destino[] = [
  { id: 'tokio', nombre: 'Tokio', pais: 'Japón', alias: ['tokyo', '東京'], coordenadas: { lat: 35.7, lng: 139.7 } },
  { id: 'caracas', nombre: 'Caracas', pais: 'Venezuela', alias: [], coordenadas: { lat: 10.5, lng: -66.9 } },
  { id: 'lisboa', nombre: 'Lisboa', pais: 'Portugal', alias: ['lisbon'], coordenadas: { lat: 38.7, lng: -9.1 } },
];

describe('resolverDestino', () => {
  it('encuentra por nombre, alias y país sin importar acentos ni mayúsculas', () => {
    expect(resolverDestino('TOKYO', destinos)?.id).toBe('tokio');
    expect(resolverDestino('lisbon', destinos)?.id).toBe('lisboa');
    expect(resolverDestino('Lisb', destinos)?.id).toBe('lisboa');
    expect(resolverDestino('japon', destinos)?.id).toBe('tokio');
    expect(resolverDestino('  caracas ', destinos)?.id).toBe('caracas');
  });

  it('devuelve null para destinos que aún no existen o textos demasiado cortos', () => {
    expect(resolverDestino('Madrid', destinos)).toBeNull();
    expect(resolverDestino('t', destinos)).toBeNull();
    expect(resolverDestino('', destinos)).toBeNull();
  });
});

describe('destinoAlAzar', () => {
  it('elige dentro de los disponibles', () => {
    expect(destinoAlAzar(destinos, () => 0)?.id).toBe('tokio');
    expect(destinoAlAzar(destinos, () => 0.99)?.id).toBe('lisboa');
    expect(destinoAlAzar([], () => 0)).toBeNull();
  });
});
