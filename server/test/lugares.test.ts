import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buscarLugares, cargarCiudades, normalizar } from '../src/lugares.js';
import type { Ciudad } from '../src/tipos.js';

const ciudades = cargarCiudades();

function ficheroTemporal(contenido: unknown): string {
  const carpeta = mkdtempSync(join(tmpdir(), 'radiopirata-'));
  const ruta = join(carpeta, 'ciudades.json');
  writeFileSync(ruta, JSON.stringify(contenido), 'utf8');
  return ruta;
}

describe('cargarCiudades', () => {
  it('carga el índice real con identificadores únicos y coordenadas dentro de rango', () => {
    expect(ciudades.length).toBeGreaterThan(50);
    expect(new Set(ciudades.map((c) => c.id)).size).toBe(ciudades.length);
    for (const c of ciudades) {
      expect(Math.abs(c.coordenadas.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(c.coordenadas.lng)).toBeLessThanOrEqual(180);
      expect(c.alias.length).toBeGreaterThan(0);
      expect(c.codigoPais).toMatch(/^[A-Z]{2}$/);
    }
  });

  it('incluye los tres destinos verificados de E1 con el mismo identificador', () => {
    for (const id of ['tokio', 'caracas', 'lisboa']) {
      expect(ciudades.find((c) => c.id === id)).toBeDefined();
    }
  });

  it('rechaza un índice con entradas mal formadas, versión distinta o identificadores repetidos', () => {
    const buena = { id: 'x', nombre: 'X', pais: 'P', codigoPais: 'PT', coordenadas: { lat: 1, lng: 2 }, alias: ['x'] };
    expect(() => cargarCiudades(ficheroTemporal({ version: 2, ciudades: [buena] }))).toThrow(/inválido/);
    expect(() => cargarCiudades(ficheroTemporal({ version: 1, ciudades: [{ ...buena, codigoPais: 'PRT' }] }))).toThrow(
      /mal formadas/,
    );
    expect(() => cargarCiudades(ficheroTemporal({ version: 1, ciudades: [{ ...buena, coordenadas: { lat: 99, lng: 0 } }] }))).toThrow(
      /mal formadas/,
    );
    expect(() => cargarCiudades(ficheroTemporal({ version: 1, ciudades: [buena, buena] }))).toThrow(/repetidos/);
  });
});

describe('buscarLugares', () => {
  it('resuelve por nombre en español, por alias local y sin acentos ni mayúsculas', () => {
    expect(buscarLugares('Tokio', ciudades)[0]?.id).toBe('tokio');
    expect(buscarLugares('tokyo', ciudades)[0]?.id).toBe('tokio');
    expect(buscarLugares('SAO PAULO', ciudades)[0]?.id).toBe('sao-paulo');
    expect(buscarLugares('rio de janeiro', ciudades)[0]?.id).toBe('rio-de-janeiro');
    expect(buscarLugares('köln', ciudades)[0]?.id).toBe('colonia');
  });

  it('prefiere el nombre exacto a una coincidencia parcial', () => {
    const lista: Ciudad[] = [
      { id: 'lima-otra', nombre: 'Limassol', pais: 'Chipre', codigoPais: 'CY', coordenadas: { lat: 34.7, lng: 33 }, alias: [] },
      { id: 'lima', nombre: 'Lima', pais: 'Perú', codigoPais: 'PE', coordenadas: { lat: -12, lng: -77 }, alias: [] },
    ];
    expect(buscarLugares('lima', lista)[0]?.id).toBe('lima');
  });

  it('también encuentra por país y devuelve varias ciudades de ese país', () => {
    const porPais = buscarLugares('Brasil', ciudades);
    expect(porPais.length).toBeGreaterThanOrEqual(3);
    expect(porPais.every((c) => c.codigoPais === 'BR')).toBe(true);
  });

  it('no devuelve nada con textos demasiado cortos o desconocidos, y respeta el límite', () => {
    expect(buscarLugares('a', ciudades)).toEqual([]);
    expect(buscarLugares('', ciudades)).toEqual([]);
    expect(buscarLugares('ciudadinventadaquenoexiste', ciudades)).toEqual([]);
    expect(buscarLugares('san', ciudades, 2).length).toBeLessThanOrEqual(2);
  });
});

describe('normalizar', () => {
  it('quita acentos, espacios sobrantes y mayúsculas', () => {
    expect(normalizar('  São Paulo ')).toBe('sao paulo');
    expect(normalizar('ZÚRICH')).toBe('zurich');
  });
});
