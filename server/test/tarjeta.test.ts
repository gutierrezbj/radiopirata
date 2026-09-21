import { describe, expect, it, vi } from 'vitest';
import { Catalogo } from '../src/catalogo.js';
import { cargarCiudades } from '../src/lugares.js';
import type { ClienteRadioBrowser } from '../src/radioBrowser.js';
import { cargarSeleccion } from '../src/seleccion.js';
import { inyectarTarjeta, TARJETA_BASE, tarjetaDeRuta } from '../src/tarjeta.js';

const cliente = {
  porUuids: vi.fn(async () => []),
  buscar: vi.fn(async () => []),
  paises: vi.fn(async () => []),
  registrarClic: vi.fn(async () => undefined),
} as unknown as ClienteRadioBrowser;
const catalogo = new Catalogo(cargarSeleccion(), cliente, { ttlMs: 1000, max: 10 }, cargarCiudades());

const plantilla = `<!doctype html>
<html lang="es">
  <head>
    <meta name="description" content="Genérica" />
    <title>RadioPirata — ¿Dónde escuchamos hoy?</title>
  </head>
  <body></body>
</html>`;

describe('tarjetaDeRuta', () => {
  it('describe un lugar del índice sin tocar la red', async () => {
    const t = await tarjetaDeRuta({ lugar: 'tokio' }, catalogo);
    expect(t.titulo).toBe('Tokio, Japón · RadioPirata');
    expect(cliente.porUuids).not.toHaveBeenCalled();
  });

  it('describe una emisora comprobada con su lugar y su país en español', async () => {
    const t = await tarjetaDeRuta({ emisora: 'cc461784-3150-4a34-81c5-2116fe024740' }, catalogo);
    expect(t.titulo).toMatch(/^TSF Rádio Notícias en RadioPirata$/);
    expect(t.descripcion).toMatch(/Lisboa, Portugal/);
  });

  it('describe las noticias de un país aunque no tenga ciudad en el índice', async () => {
    expect((await tarjetaDeRuta({ noticias: 've' }, catalogo)).titulo).toBe('Noticias de Venezuela · RadioPirata');
    expect((await tarjetaDeRuta({ noticias: 'SA' }, catalogo)).titulo).toBe('Noticias de Arabia Saudí · RadioPirata');
  });

  it('cae a la tarjeta general con rutas raras, inválidas o desconocidas', async () => {
    expect(await tarjetaDeRuta({}, catalogo)).toEqual(TARJETA_BASE);
    expect(await tarjetaDeRuta({ lugar: 'atlantida' }, catalogo)).toEqual(TARJETA_BASE);
    expect(await tarjetaDeRuta({ lugar: '../etc' }, catalogo)).toEqual(TARJETA_BASE);
    expect(await tarjetaDeRuta({ emisora: 'no-uuid' }, catalogo)).toEqual(TARJETA_BASE);
    expect(await tarjetaDeRuta({ noticias: 'VEN' }, catalogo)).toEqual(TARJETA_BASE);
    expect(await tarjetaDeRuta({ q: ['a', 'b'] }, catalogo)).toEqual(TARJETA_BASE);
  });
});

describe('inyectarTarjeta', () => {
  it('cambia el título y la descripción y añade las etiquetas Open Graph', () => {
    const html = inyectarTarjeta(plantilla, { titulo: 'Caracas · RadioPirata', descripcion: 'Emisoras de Caracas.' }, 'https://radio.test/?lugar=caracas');
    expect(html).toContain('<title>Caracas · RadioPirata</title>');
    expect(html).toContain('<meta name="description" content="Emisoras de Caracas." />');
    expect(html).toContain('<meta property="og:title" content="Caracas · RadioPirata" />');
    expect(html).toContain('<meta property="og:url" content="https://radio.test/?lugar=caracas" />');
    expect(html).toContain('<meta name="twitter:card" content="summary" />');
    expect(html.indexOf('og:title')).toBeLessThan(html.indexOf('</head>'));
  });

  it('escapa lo que venga de fuera para que no rompa el HTML', () => {
    const html = inyectarTarjeta(plantilla, { titulo: '<script>x</script> & "y"', descripcion: "z'" }, 'https://radio.test/?q=a%22b');
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;x&lt;/script&gt; &amp; &quot;y&quot;');
    expect(html).toContain('content="z&#39;"');
  });
});
