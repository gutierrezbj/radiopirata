import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { Seleccion } from './tipos.js';

const aqui = dirname(fileURLToPath(import.meta.url));

export const RUTA_SELECCION = join(aqui, '..', 'data', 'seleccion-e1.json');

/** Copia local de la selección inicial (E1), identificada con fecha en `generadaEl`. */
export function cargarSeleccion(ruta = RUTA_SELECCION): Seleccion {
  const texto = readFileSync(ruta, 'utf8');
  const datos = JSON.parse(texto) as Seleccion;
  if (datos.version !== 1 || !Array.isArray(datos.destinos) || !Array.isArray(datos.emisoras)) {
    throw new Error(`Selección inválida en ${ruta}`);
  }
  return datos;
}
