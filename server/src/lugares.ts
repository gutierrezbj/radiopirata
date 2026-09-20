import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { Ciudad } from './tipos.js';

const aqui = dirname(fileURLToPath(import.meta.url));

export const RUTA_CIUDADES = join(aqui, '..', 'data', 'ciudades.json');

const ID = /^[a-z0-9-]{1,32}$/;

function esCiudad(valor: unknown): valor is Ciudad {
  if (typeof valor !== 'object' || valor === null) return false;
  const c = valor as Record<string, unknown>;
  const coords = c['coordenadas'] as Record<string, unknown> | undefined;
  return (
    typeof c['id'] === 'string' &&
    ID.test(c['id']) &&
    typeof c['nombre'] === 'string' &&
    c['nombre'].length > 0 &&
    typeof c['pais'] === 'string' &&
    typeof c['codigoPais'] === 'string' &&
    /^[A-Z]{2}$/.test(c['codigoPais']) &&
    Array.isArray(c['alias']) &&
    c['alias'].every((a) => typeof a === 'string' && a.length > 0) &&
    typeof coords === 'object' &&
    coords !== null &&
    typeof coords['lat'] === 'number' &&
    Number.isFinite(coords['lat']) &&
    Math.abs(coords['lat'] as number) <= 90 &&
    typeof coords['lng'] === 'number' &&
    Number.isFinite(coords['lng']) &&
    Math.abs(coords['lng'] as number) <= 180
  );
}

/** Carga y valida el índice propio de ciudades. Falla al arrancar si el archivo está mal. */
export function cargarCiudades(ruta = RUTA_CIUDADES): Ciudad[] {
  const datos = JSON.parse(readFileSync(ruta, 'utf8')) as { version?: unknown; ciudades?: unknown };
  if (datos.version !== 1 || !Array.isArray(datos.ciudades)) throw new Error(`Índice de ciudades inválido en ${ruta}`);
  const ciudades = datos.ciudades.filter(esCiudad);
  if (ciudades.length !== datos.ciudades.length) {
    throw new Error(`Índice de ciudades inválido en ${ruta}: ${datos.ciudades.length - ciudades.length} entradas mal formadas`);
  }
  const ids = new Set(ciudades.map((c) => c.id));
  if (ids.size !== ciudades.length) throw new Error(`Índice de ciudades inválido en ${ruta}: hay identificadores repetidos`);
  return ciudades;
}

/** Minúsculas y sin acentos, para comparar nombres escritos de cualquier manera. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Busca lugares en el índice propio. Ordena por calidad de la coincidencia:
 * nombre exacto, alias exacto, nombre que empieza igual, alias que empieza igual,
 * país exacto y, por último, nombre que contiene el texto.
 */
export function buscarLugares(texto: string, ciudades: Ciudad[], limite = 6): Ciudad[] {
  const q = normalizar(texto);
  if (q.length < 2) return [];
  const puntuadas: Array<{ ciudad: Ciudad; peso: number }> = [];
  for (const ciudad of ciudades) {
    const nombre = normalizar(ciudad.nombre);
    const alias = ciudad.alias.map(normalizar);
    const pais = normalizar(ciudad.pais);
    let peso = Number.POSITIVE_INFINITY;
    if (nombre === q) peso = 0;
    else if (alias.includes(q)) peso = 1;
    else if (nombre.startsWith(q)) peso = 2;
    else if (alias.some((a) => a.startsWith(q))) peso = 3;
    else if (pais === q) peso = 4;
    else if (pais.startsWith(q)) peso = 5;
    else if (nombre.includes(q)) peso = 6;
    if (Number.isFinite(peso)) puntuadas.push({ ciudad, peso });
  }
  return puntuadas
    .sort((a, b) => a.peso - b.peso || a.ciudad.nombre.localeCompare(b.ciudad.nombre, 'es'))
    .slice(0, limite)
    .map((p) => p.ciudad);
}
