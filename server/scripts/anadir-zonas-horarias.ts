/**
 * Añade la zona horaria IANA a cada ciudad del índice propio, curada a mano el 2026-09-21,
 * y comprueba con Intl que cada una existe antes de escribir. Sirve para enseñar la hora
 * de allí y para saber dónde es de noche; nunca para situar emisoras.
 *
 * Uso: npx tsx scripts/anadir-zonas-horarias.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { RUTA_CIUDADES } from '../src/lugares.js';

const ZONAS: Record<string, string> = {
  lisboa: 'Europe/Lisbon',
  oporto: 'Europe/Lisbon',
  madrid: 'Europe/Madrid',
  barcelona: 'Europe/Madrid',
  sevilla: 'Europe/Madrid',
  paris: 'Europe/Paris',
  londres: 'Europe/London',
  berlin: 'Europe/Berlin',
  colonia: 'Europe/Berlin',
  roma: 'Europe/Rome',
  milan: 'Europe/Rome',
  amsterdam: 'Europe/Amsterdam',
  bruselas: 'Europe/Brussels',
  dublin: 'Europe/Dublin',
  estocolmo: 'Europe/Stockholm',
  oslo: 'Europe/Oslo',
  copenhague: 'Europe/Copenhagen',
  helsinki: 'Europe/Helsinki',
  reikiavik: 'Atlantic/Reykjavik',
  viena: 'Europe/Vienna',
  zurich: 'Europe/Zurich',
  praga: 'Europe/Prague',
  varsovia: 'Europe/Warsaw',
  budapest: 'Europe/Budapest',
  atenas: 'Europe/Athens',
  estambul: 'Europe/Istanbul',
  moscu: 'Europe/Moscow',
  kiev: 'Europe/Kiev',
  'nueva-york': 'America/New_York',
  'los-angeles': 'America/Los_Angeles',
  chicago: 'America/Chicago',
  'nueva-orleans': 'America/Chicago',
  detroit: 'America/Detroit',
  toronto: 'America/Toronto',
  montreal: 'America/Toronto',
  'ciudad-de-mexico': 'America/Mexico_City',
  guadalajara: 'America/Mexico_City',
  'la-habana': 'America/Havana',
  'san-juan': 'America/Puerto_Rico',
  caracas: 'America/Caracas',
  bogota: 'America/Bogota',
  medellin: 'America/Bogota',
  lima: 'America/Lima',
  quito: 'America/Guayaquil',
  santiago: 'America/Santiago',
  'buenos-aires': 'America/Argentina/Buenos_Aires',
  montevideo: 'America/Montevideo',
  'sao-paulo': 'America/Sao_Paulo',
  'rio-de-janeiro': 'America/Sao_Paulo',
  'salvador-bahia': 'America/Bahia',
  'el-cairo': 'Africa/Cairo',
  casablanca: 'Africa/Casablanca',
  dakar: 'Africa/Dakar',
  lagos: 'Africa/Lagos',
  nairobi: 'Africa/Nairobi',
  'ciudad-del-cabo': 'Africa/Johannesburg',
  'tel-aviv': 'Asia/Jerusalem',
  dubai: 'Asia/Dubai',
  bombay: 'Asia/Kolkata',
  delhi: 'Asia/Kolkata',
  bangkok: 'Asia/Bangkok',
  singapur: 'Asia/Singapore',
  yakarta: 'Asia/Jakarta',
  manila: 'Asia/Manila',
  'hong-kong': 'Asia/Hong_Kong',
  pekin: 'Asia/Shanghai',
  seul: 'Asia/Seoul',
  tokio: 'Asia/Tokyo',
  osaka: 'Asia/Tokyo',
  sidney: 'Australia/Sydney',
  melbourne: 'Australia/Melbourne',
  auckland: 'Pacific/Auckland',
};

interface CiudadBruta {
  id: string;
  zonaHoraria?: string;
  [clave: string]: unknown;
}

const datos = JSON.parse(readFileSync(RUTA_CIUDADES, 'utf8')) as { ciudades: CiudadBruta[]; [clave: string]: unknown };
let cambiadas = 0;
for (const ciudad of datos.ciudades) {
  const zona = ZONAS[ciudad.id];
  if (!zona) throw new Error(`Falta la zona horaria de ${ciudad.id}`);
  // Si la zona no existe, esto lanza y no se escribe nada.
  new Intl.DateTimeFormat('es', { timeZone: zona });
  if (ciudad.zonaHoraria !== zona) {
    ciudad.zonaHoraria = zona;
    cambiadas++;
  }
}
const sobrantes = Object.keys(ZONAS).filter((id) => !datos.ciudades.some((c) => c.id === id));
if (sobrantes.length > 0) throw new Error(`Zonas sin ciudad en el índice: ${sobrantes.join(', ')}`);

writeFileSync(RUTA_CIUDADES, JSON.stringify(datos, null, 2) + '\n', 'utf8');
console.log(`${cambiadas} ciudades actualizadas de ${datos.ciudades.length}.`);
