import type { Catalogo } from './catalogo.js';
import { nombreDePais } from './paises.js';
import { codigoPaisValido, consultaValida, esIdDestino, esUuid } from './validacion.js';

/**
 * Lo que enseña WhatsApp, Telegram o cualquier red al pegar un enlace de RadioPirata.
 * Esos servicios leen el HTML sin ejecutar nada, así que el título y la descripción
 * tienen que venir ya puestos desde el servidor.
 */
export interface Tarjeta {
  titulo: string;
  descripcion: string;
}

export const TARJETA_BASE: Tarjeta = {
  titulo: 'RadioPirata — ¿Dónde escuchamos hoy?',
  descripcion: 'Explora emisoras reales del mundo y escúchalas con pocos pasos. La música siempre es buena compañía.',
};

type Consulta = Record<string, unknown>;

function texto(consulta: Consulta, clave: string): string | undefined {
  const v = consulta[clave];
  return typeof v === 'string' ? v : undefined;
}

/** Decide la tarjeta según la dirección pedida. Si algo falla, la tarjeta general. */
export async function tarjetaDeRuta(consulta: Consulta, catalogo: Catalogo): Promise<Tarjeta> {
  try {
    const emisoraId = texto(consulta, 'emisora');
    if (emisoraId !== undefined && esUuid(emisoraId)) {
      const emisora = await catalogo.emisora(emisoraId.toLowerCase());
      if (!emisora) return TARJETA_BASE;
      const pais = nombreDePais(emisora.codigoPais, catalogo.lugares());
      const lugar = emisora.ubicacionSegunCatalogo ? `${emisora.ubicacionSegunCatalogo}, ${pais}` : pais;
      return { titulo: `${emisora.nombre} en RadioPirata`, descripcion: `${lugar} · Escúchala en directo.` };
    }

    const lugarId = texto(consulta, 'lugar');
    if (lugarId !== undefined && esIdDestino(lugarId)) {
      const lugar = catalogo.lugar(lugarId);
      if (!lugar) return TARJETA_BASE;
      return { titulo: `${lugar.nombre}, ${lugar.pais} · RadioPirata`, descripcion: `Emisoras de ${lugar.nombre} en directo.` };
    }

    const codigo = codigoPaisValido(texto(consulta, 'noticias'));
    if (codigo) {
      const pais = nombreDePais(codigo, catalogo.lugares());
      return { titulo: `Noticias de ${pais} · RadioPirata`, descripcion: `Radio informativa de ${pais}, en directo.` };
    }

    const q = consultaValida(texto(consulta, 'q'));
    if (q) return { titulo: `«${q}» · RadioPirata`, descripcion: `Emisoras que encajan con «${q}».` };
  } catch {
    // Una tarjeta nunca debe impedir que se sirva la página.
  }
  return TARJETA_BASE;
}

function escapar(valor: string): string {
  return valor.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}

/** Cambia el título y añade las etiquetas Open Graph justo antes de cerrar `<head>`. */
export function inyectarTarjeta(html: string, tarjeta: Tarjeta, url: string): string {
  const titulo = escapar(tarjeta.titulo);
  const descripcion = escapar(tarjeta.descripcion);
  const etiquetas = [
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="RadioPirata" />`,
    `<meta property="og:title" content="${titulo}" />`,
    `<meta property="og:description" content="${descripcion}" />`,
    `<meta property="og:url" content="${escapar(url)}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${titulo}" />`,
    `<meta name="twitter:description" content="${descripcion}" />`,
  ].join('\n    ');
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${titulo}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${descripcion}" />`)
    .replace('</head>', `    ${etiquetas}\n  </head>`);
}
