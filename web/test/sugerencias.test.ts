import { describe, expect, it } from 'vitest';
import type { Lugar, Pais } from '../src/tipos';
import { sugerencias } from '../src/util/sugerencias';

const lugares: Lugar[] = [
  { id: 'paris', nombre: 'París', pais: 'Francia', codigoPais: 'FR', coordenadas: { lat: 48.8, lng: 2.3 }, alias: ['Paris'], zonaHoraria: 'Europe/Paris' },
  { id: 'tokio', nombre: 'Tokio', pais: 'Japón', codigoPais: 'JP', coordenadas: { lat: 35.7, lng: 139.7 }, alias: ['Tokyo'], zonaHoraria: 'Asia/Tokyo' },
  { id: 'mexico', nombre: 'Ciudad de México', pais: 'México', codigoPais: 'MX', coordenadas: { lat: 19.4, lng: -99.1 }, alias: ['CDMX'], zonaHoraria: 'America/Mexico_City' },
];

const paises: Pais[] = [
  { codigo: 'FR', emisoras: 1200 },
  { codigo: 'JP', emisoras: 800 },
  { codigo: 'MX', emisoras: 900 },
  { codigo: 'PT', emisoras: 300 },
];

describe('sugerencias', () => {
  it('propone el país al escribir solo el principio del nombre', () => {
    const lista = sugerencias('fra', lugares, paises);
    expect(lista.some((s) => s.tipo === 'pais' && s.texto === 'Francia')).toBe(true);
  });

  it('no pide acentos: «mexico» y «japon» encuentran lo mismo que con tilde', () => {
    expect(sugerencias('mexico', lugares, paises).map((s) => s.texto)).toContain('Ciudad de México');
    expect(sugerencias('MÉXICO', lugares, paises).map((s) => s.texto)).toContain('Ciudad de México');
    expect(sugerencias('japon', lugares, paises).map((s) => s.texto)).toContain('Japón');
  });

  it('pone las ciudades del índice antes que los países', () => {
    const lista = sugerencias('paris', lugares, paises);
    expect(lista[0]?.tipo).toBe('lugar');
    expect(lista[0]?.texto).toBe('París');
  });

  it('dice cuántas emisoras tiene cada país y lleva su código', () => {
    const francia = sugerencias('francia', lugares, paises).find((s) => s.tipo === 'pais');
    expect(francia?.detalle).toContain('emisoras');
    expect(francia?.tipo === 'pais' && francia.codigo).toBe('FR');
  });

  it('calla con menos de dos letras y cuando no hay nada parecido', () => {
    expect(sugerencias('f', lugares, paises)).toEqual([]);
    expect(sugerencias('atlantida', lugares, paises)).toEqual([]);
  });

  it('nunca devuelve más de lo que se le pide', () => {
    expect(sugerencias('a', lugares, paises, 3).length).toBeLessThanOrEqual(3);
    expect(sugerencias('ia', lugares, paises, 2).length).toBeLessThanOrEqual(2);
  });

  it('funciona sin países: el índice propio basta', () => {
    expect(sugerencias('tok', lugares, []).map((s) => s.texto)).toEqual(['Tokio']);
  });
});
