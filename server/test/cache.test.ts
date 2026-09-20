import { describe, expect, it } from 'vitest';
import { CacheAcotada } from '../src/cache.js';

describe('CacheAcotada', () => {
  it('devuelve el valor mientras no caduca y lo olvida después', () => {
    let reloj = 1000;
    const cache = new CacheAcotada<string>(100, 10, () => reloj);
    cache.set('a', 'uno');
    expect(cache.get('a')).toBe('uno');
    reloj = 1099;
    expect(cache.get('a')).toBe('uno');
    reloj = 1100;
    expect(cache.get('a')).toBeUndefined();
    expect(cache.tamano).toBe(0);
  });

  it('descarta la entrada más antigua al superar el máximo', () => {
    const cache = new CacheAcotada<number>(10_000, 2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    expect(cache.tamano).toBe(2);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
  });

  it('reescribir una clave la vuelve a colocar como la más reciente', () => {
    const cache = new CacheAcotada<number>(10_000, 2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('a', 11);
    cache.set('c', 3);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(11);
  });

  it('rechaza parámetros no positivos', () => {
    expect(() => new CacheAcotada(0, 1)).toThrow();
    expect(() => new CacheAcotada(1, 0)).toThrow();
  });
});
