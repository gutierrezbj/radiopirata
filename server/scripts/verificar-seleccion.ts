/**
 * Comprueba por HTTP cada emisora de la selección: código, tipo de contenido y bytes recibidos
 * en un tiempo acotado. Escribe docs/VERIFICACION-E1.md con fecha.
 *
 * Importante: "responde con audio por HTTP" no es lo mismo que "suena en el navegador".
 * La reproducción audible se comprueba a mano y se anota en el mismo documento.
 *
 * Uso: npm run seleccion:verificar
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cargarSeleccion } from '../src/seleccion.js';

const aqui = dirname(fileURLToPath(import.meta.url));
const salida = join(aqui, '..', '..', 'docs', 'VERIFICACION-E1.md');
/**
 * Se sondea con un User-Agent de navegador a propósito: algunos servidores (p. ej. radioca.st) devuelven
 * audio a clientes genéricos pero redirigen a una página HTML a los navegadores, y eso es lo que sufriría
 * la persona que escucha. Con el User-Agent propio de la API esas señales parecían válidas y no lo eran.
 */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36 RadioPirata-verificador/0.1';
const TIMEOUT_MS = 8000;
const BYTES_OBJETIVO = 32 * 1024;

interface Resultado {
  destino: string;
  nombre: string;
  url: string;
  estado: number | 'error';
  tipo: string;
  bytes: number;
  ms: number;
  detalle: string;
}

async function sondear(url: string): Promise<Omit<Resultado, 'destino' | 'nombre' | 'url'>> {
  const inicio = Date.now();
  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Icy-MetaData': '0' }, signal: control.signal, redirect: 'follow' });
    const tipo = r.headers.get('content-type') ?? '';
    let bytes = 0;
    if (r.body) {
      const lector = r.body.getReader();
      while (bytes < BYTES_OBJETIVO) {
        const { done, value } = await lector.read();
        if (done) break;
        bytes += value.byteLength;
      }
      await lector.cancel().catch(() => undefined);
    }
    const esAudio = tipo.startsWith('audio/');
    return {
      estado: r.status,
      tipo,
      bytes,
      ms: Date.now() - inicio,
      detalle: r.ok && esAudio && bytes > 0 ? 'ok' : 'no es una señal de audio accesible',
    };
  } catch (e) {
    const mensaje = e instanceof Error ? (e.name === 'AbortError' ? `sin respuesta en ${TIMEOUT_MS} ms` : e.message) : String(e);
    return { estado: 'error', tipo: '', bytes: 0, ms: Date.now() - inicio, detalle: mensaje };
  } finally {
    clearTimeout(temporizador);
  }
}

const seleccion = cargarSeleccion();
const nombres = new Map(seleccion.destinos.map((d) => [d.id, d.nombre]));
const resultados: Resultado[] = [];
for (const e of seleccion.emisoras) {
  const r = await sondear(e.url);
  resultados.push({ destino: nombres.get(e.destinoId) ?? e.destinoId, nombre: e.nombre, url: e.url, ...r });
  console.log(`${r.detalle === 'ok' ? 'OK ' : 'KO '} ${e.nombre} — ${r.estado} ${r.tipo} ${r.bytes}B ${r.ms}ms ${r.detalle}`);
}

const MARCA_INICIO = '<!-- reproduccion-manual:inicio -->';
const MARCA_FIN = '<!-- reproduccion-manual:fin -->';

/** Conserva las anotaciones manuales del informe anterior, si existen. */
function seccionManualPrevia(): string {
  if (!existsSync(salida)) return 'Pendiente de anotar.';
  const previo = readFileSync(salida, 'utf8');
  const inicio = previo.indexOf(MARCA_INICIO);
  const fin = previo.indexOf(MARCA_FIN);
  if (inicio === -1 || fin === -1 || fin < inicio) return 'Pendiente de anotar.';
  return previo.slice(inicio + MARCA_INICIO.length, fin).trim();
}

const fecha = new Date().toISOString();
const filas = resultados
  .map(
    (r) =>
      `| ${r.destino} | ${r.nombre} | ${r.estado} | ${r.tipo || '—'} | ${r.bytes} | ${r.ms} | ${r.detalle === 'ok' ? '✅ accesible' : `❌ ${r.detalle}`} |`,
  )
  .join('\n');
const ok = resultados.filter((r) => r.detalle === 'ok').length;

const md = `# Verificación de la selección E1

Generado automáticamente por \`npm run seleccion:verificar\` el ${fecha}.
Selección de emisoras generada el ${seleccion.generadaEl} desde ${seleccion.fuente}.

Criterio: petición GET real a la URL de la emisora, con User-Agent de navegador y un tiempo máximo de ${TIMEOUT_MS} ms; se considera accesible si responde 2xx con \`Content-Type\` \`audio/*\` y entrega datos.

**Accesibles por HTTP: ${ok} de ${resultados.length}.**

| Destino | Emisora | HTTP | Tipo | Bytes leídos | ms | Resultado |
|---|---|---|---|---|---|---|
${filas}

## Reproducción audible en navegador

Esta tabla solo prueba acceso HTTP desde el equipo donde se ejecutó. La reproducción audible se comprueba a mano en el navegador y se registra abajo por el agente o el usuario, con fecha y dispositivo.

${MARCA_INICIO}
${seccionManualPrevia()}
${MARCA_FIN}
`;

writeFileSync(salida, md, 'utf8');
console.log(`\nInforme escrito en ${salida}`);
