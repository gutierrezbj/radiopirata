import { describe, expect, it } from 'vitest';
import type { Emisora } from '../src/tipos';
import { lugarDeEmisora, nombrePais } from '../src/util/lugar';

const base: Emisora = {
  id: 'x',
  nombre: 'Prueba',
  destinoId: 'caracas',
  pais: 'Bolivarian Republic Of Venezuela',
  codigoPais: 'VE',
  idioma: '',
  etiquetas: [],
  url: 'https://ejemplo.test/a',
  web: null,
  codec: 'MP3',
  bitrate: 128,
  coordenadas: null,
  ubicacionSegunCatalogo: 'Caracas',
};

describe('lugar', () => {
  it('traduce el país por código ISO y usa la ciudad que declara el catálogo', () => {
    expect(nombrePais('VE', 'lo que sea')).toBe('Venezuela');
    expect(nombrePais('JP', 'Japan')).toBe('Japón');
    expect(lugarDeEmisora(base)).toBe('Caracas, Venezuela');
    expect(lugarDeEmisora({ ...base, codigoPais: 'JP', ubicacionSegunCatalogo: 'tokyo' })).toBe('Tokyo, Japón');
  });

  it('no inventa ciudad si el catálogo no la da y cae al texto original con códigos raros', () => {
    expect(lugarDeEmisora({ ...base, ubicacionSegunCatalogo: '  ' })).toBe('Venezuela');
    expect(nombrePais('', 'Original')).toBe('Original');
    expect(nombrePais('ZZZ', 'Original')).toBe('Original');
  });
});
