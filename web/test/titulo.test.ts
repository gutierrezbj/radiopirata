import { describe, expect, it } from 'vitest';
import type { Lugar } from '../src/tipos';
import { nombreDeVista, TITULO_BASE, tituloDeRuta } from '../src/util/titulo';

const lugares: Lugar[] = [
  { id: 'tokio', nombre: 'Tokio', pais: 'Japón', codigoPais: 'JP', coordenadas: { lat: 35.7, lng: 139.7 }, alias: [] },
];

describe('nombreDeVista', () => {
  it('describe cada vista con palabras, no con una ruta', () => {
    expect(nombreDeVista({ tipo: 'inicio' }, lugares)).toBe('Inicio');
    expect(nombreDeVista({ tipo: 'lugar', id: 'tokio' }, lugares)).toBe('Tokio, Japón');
    expect(nombreDeVista({ tipo: 'busqueda', q: 'jazz' }, lugares)).toBe('Búsqueda: jazz');
    expect(nombreDeVista({ tipo: 'favoritas' }, lugares)).toBe('Mis favoritas');
    expect(nombreDeVista({ tipo: 'recientes' }, lugares)).toBe('Recientes');
    expect(nombreDeVista({ tipo: 'emisora', id: 'x' }, lugares)).toBe('Emisora compartida');
  });

  it('no se rompe si el índice todavía no ha cargado', () => {
    expect(nombreDeVista({ tipo: 'lugar', id: 'tokio' }, [])).toBe('Lugar');
  });
});

describe('tituloDeRuta', () => {
  it('deja el título completo en el inicio y nombra la vista en el resto', () => {
    expect(tituloDeRuta({ tipo: 'inicio' }, lugares)).toBe(TITULO_BASE);
    expect(tituloDeRuta({ tipo: 'lugar', id: 'tokio' }, lugares)).toBe('Tokio, Japón · RadioPirata');
    expect(tituloDeRuta({ tipo: 'favoritas' }, lugares)).toBe('Mis favoritas · RadioPirata');
  });
});
