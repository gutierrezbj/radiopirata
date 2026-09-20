/**
 * Genera server/data/seleccion-e1.json consultando Radio Browser por UUID.
 * Los UUID se eligieron a mano el 2026-09-20 buscando en Radio Browser por `state`
 * (Tokyo, Caracas, Lisboa/Lisbon), prefiriendo URLs HTTPS con MP3/AAC nativos (sin HLS)
 * y descartando emisoras cuyo nombre o URL no encajaba con el destino.
 *
 * Uso: npm run seleccion:generar
 */
import { writeFileSync } from 'node:fs';
import { aEmisora, ClienteRadioBrowser } from '../src/radioBrowser.js';
import { RUTA_SELECCION } from '../src/seleccion.js';
import type { Destino, Emisora, Seleccion } from '../src/tipos.js';

const destinos: Array<Destino & { uuids: string[] }> = [
  {
    id: 'tokio',
    nombre: 'Tokio',
    pais: 'Japón',
    alias: ['tokyo', 'tokio', '東京', 'japon', 'japón', 'japan'],
    // Centro aproximado de la ciudad (índice propio de destinos, no ubicación de cada emisora).
    coordenadas: { lat: 35.6762, lng: 139.6503 },
    uuids: [
      'fad42bb6-2865-4854-94a7-96152e881800', // FM世田谷 (FM Setagaya)
      'fdffc27f-a096-4be8-b3bf-2c51a943a1d1', // Gotanno FM 89.2
      '5a4eb5bc-7fbd-43fb-a6a4-cc4517ce6ac4', // J1 HITS
      // Retirada el 2026-09-20: 54732c01-db87-4aa2-b313-22fd5fa7eee9 (Free FM 80 Tokyo). Su URL raíz
      // responde audio a clientes no-navegador pero redirige a una página HTML con User-Agent de navegador,
      // así que en Chromium falla con "formato no admitido". Ver docs/VERIFICACION-E1.md.
    ],
  },
  {
    id: 'caracas',
    nombre: 'Caracas',
    pais: 'Venezuela',
    alias: ['caracas', 'venezuela'],
    coordenadas: { lat: 10.4806, lng: -66.9036 },
    uuids: [
      'b75a5dcc-b4e2-470b-965b-2fdfb5240bc0', // Alba Ciudad 96.3 FM
      'a70922c7-45ea-4c6f-9e64-fd4ceffd1762', // La Mega 107.3
      '8f2b2fe8-ba3d-4d0c-a758-aa729bc230d0', // KYS FM
      'd9313b88-1eca-49f6-9d53-d240fdb46528', // Estereo 88.7 FM
    ],
  },
  {
    id: 'lisboa',
    nombre: 'Lisboa',
    pais: 'Portugal',
    alias: ['lisboa', 'lisbon', 'lisbonne', 'portugal'],
    coordenadas: { lat: 38.7223, lng: -9.1393 },
    uuids: [
      'cc461784-3150-4a34-81c5-2116fe024740', // TSF Rádio Notícias
      '342f46c4-b48b-4813-b0d3-27b6e33f3a41', // SmoothFM
      '7bc1f66f-412d-484b-82eb-b7b1c4575faa', // M80 Rádio – 80s
      'c0682eee-a97d-4fbe-b970-dea2ffb18ef0', // Rádio Observador
    ],
  },
];

const cliente = new ClienteRadioBrowser({
  userAgent: 'RadioPirata/0.1 (+https://github.com/gutierrezbj/radiopirata)',
  timeoutMs: 8000,
});

const emisoras: Emisora[] = [];
for (const destino of destinos) {
  const registros = await cliente.porUuids(destino.uuids);
  const porId = new Map(registros.map((r) => [r.stationuuid, r]));
  for (const uuid of destino.uuids) {
    const registro = porId.get(uuid);
    if (!registro) {
      console.warn(`No encontrada en Radio Browser: ${uuid} (${destino.nombre})`);
      continue;
    }
    const emisora = aEmisora(registro, destino.id);
    if (!emisora) {
      console.warn(`URL no válida para ${registro.name} (${uuid})`);
      continue;
    }
    if (!emisora.url.startsWith('https://')) {
      console.warn(`Descartada por no ser HTTPS: ${emisora.nombre} → ${emisora.url}`);
      continue;
    }
    if (registro.hls === 1 || emisora.url.endsWith('.m3u8')) {
      console.warn(`Descartada por ser HLS (no verificado por navegador en E1): ${emisora.nombre}`);
      continue;
    }
    emisoras.push(emisora);
  }
}

const seleccion: Seleccion = {
  version: 1,
  generadaEl: new Date().toISOString(),
  fuente: 'Radio Browser (https://www.radio-browser.info), consulta /json/stations/byuuid',
  destinos: destinos.map(({ uuids: _uuids, ...d }) => d),
  emisoras,
};

writeFileSync(RUTA_SELECCION, JSON.stringify(seleccion, null, 2) + '\n', 'utf8');
console.log(`Escrita selección con ${emisoras.length} emisoras en ${RUTA_SELECCION}`);
