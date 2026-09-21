import { describe, expect, it } from 'vitest';
import { _fijarRutaParaPruebas, analizar, claveDeRuta, formatear, huboNavegacion, navegar, type Ruta } from '../src/util/ruta';

const UUID = 'cc461784-3150-4a34-81c5-2116fe024740';

describe('analizar', () => {
  it('entiende cada vista de la aplicación', () => {
    expect(analizar('')).toEqual({ tipo: 'inicio' });
    expect(analizar('?lugar=tokio')).toEqual({ tipo: 'lugar', id: 'tokio' });
    expect(analizar('?q=jazz')).toEqual({ tipo: 'busqueda', q: 'jazz' });
    expect(analizar('?vista=favoritas')).toEqual({ tipo: 'favoritas' });
    expect(analizar('?vista=recientes')).toEqual({ tipo: 'recientes' });
    expect(analizar(`?emisora=${UUID}`)).toEqual({ tipo: 'emisora', id: UUID });
  });

  it('trata como inicio lo que no reconoce, en vez de romperse', () => {
    expect(analizar('?lugar=NO_VALIDO')).toEqual({ tipo: 'inicio' });
    expect(analizar('?lugar=../../etc')).toEqual({ tipo: 'inicio' });
    expect(analizar('?emisora=no-es-uuid')).toEqual({ tipo: 'inicio' });
    expect(analizar('?q=a')).toEqual({ tipo: 'inicio' });
    expect(analizar('?vista=loquesea')).toEqual({ tipo: 'inicio' });
  });

  it('entiende las vistas de noticias: elegir país y país concreto', () => {
    expect(analizar('?vista=noticias')).toEqual({ tipo: 'paises' });
    expect(analizar('?noticias=ve')).toEqual({ tipo: 'noticias', pais: 'VE' });
    expect(analizar('?noticias=VEN')).toEqual({ tipo: 'inicio' });
    expect(formatear({ tipo: 'noticias', pais: 'VE' })).toBe('/?noticias=VE');
    expect(formatear({ tipo: 'paises' })).toBe('/?vista=noticias');
  });

  it('entiende la búsqueda por código de país y descarta un código mal escrito', () => {
    expect(analizar('?q=Jap%C3%B3n&pais=jp')).toEqual({ tipo: 'busqueda', q: 'Japón', pais: 'JP' });
    expect(analizar('?q=Jap%C3%B3n&pais=JPN')).toEqual({ tipo: 'busqueda', q: 'Japón' });
  });

  it('limpia el texto buscado y lo limita en longitud', () => {
    expect(analizar('?q=%20%20jazz%20%20suave%20')).toEqual({ tipo: 'busqueda', q: 'jazz suave' });
    const largo = analizar(`?q=${'x'.repeat(200)}`);
    expect(largo.tipo === 'busqueda' && largo.q.length).toBe(60);
  });

  it('acepta el identificador de emisora en mayúsculas y lo normaliza', () => {
    expect(analizar(`?emisora=${UUID.toUpperCase()}`)).toEqual({ tipo: 'emisora', id: UUID });
  });

  it('da prioridad a la emisora compartida sobre el resto de parámetros', () => {
    expect(analizar(`?lugar=tokio&emisora=${UUID}`)).toEqual({ tipo: 'emisora', id: UUID });
  });
});

describe('formatear', () => {
  it('genera enlaces limpios y reversibles', () => {
    const rutas: Ruta[] = [
      { tipo: 'inicio' },
      { tipo: 'lugar', id: 'sao-paulo' },
      { tipo: 'busqueda', q: 'jazz suave' },
      { tipo: 'busqueda', q: 'Portugal', pais: 'PT' },
      { tipo: 'favoritas' },
      { tipo: 'recientes' },
      { tipo: 'emisora', id: UUID },
      { tipo: 'paises' },
      { tipo: 'noticias', pais: 'VE' },
    ];
    for (const ruta of rutas) {
      const url = formatear(ruta);
      const vuelta = analizar(url.slice(url.indexOf('?')));
      expect(vuelta).toEqual(ruta);
    }
  });

  it('codifica el texto para que no rompa la dirección', () => {
    expect(formatear({ tipo: 'busqueda', q: 'rock & roll' })).toBe('/?q=rock%20%26%20roll');
    expect(claveDeRuta({ tipo: 'lugar', id: 'tokio' })).toBe('/?lugar=tokio');
  });
});

describe('huboNavegacion', () => {
  it('distingue abrir un enlace de navegar dentro de la aplicación', () => {
    _fijarRutaParaPruebas({ tipo: 'inicio' });
    expect(huboNavegacion()).toBe(false);
    // Navegar al mismo sitio no cuenta como navegar.
    navegar({ tipo: 'inicio' });
    expect(huboNavegacion()).toBe(false);
    navegar({ tipo: 'lugar', id: 'tokio' });
    expect(huboNavegacion()).toBe(true);
    _fijarRutaParaPruebas({ tipo: 'inicio' });
    expect(huboNavegacion()).toBe(false);
  });
});
