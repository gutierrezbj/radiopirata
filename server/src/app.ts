import compression from 'compression';
import express, { type Express } from 'express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { cabecerasSeguras } from './cabeceras.js';
import { MAX_RESULTADOS, POR_PAGINA, type Catalogo } from './catalogo.js';
import { codigoPaisValido, consultaValida, esIdDestino, esUuid, MAX_CONSULTA, paginaValida } from './validacion.js';

export interface OpcionesApp {
  catalogo: Catalogo;
  /** Carpeta del build de la web a servir en producción; si no existe, solo se sirve la API. */
  webDist?: string | undefined;
  /** Número de proxies de confianza por delante (nginx, balanceador). 0 = ninguno. */
  proxiesDeConfianza?: number;
  /** Añade HSTS: activar solo cuando el sitio ya se sirva por HTTPS. */
  hsts?: boolean;
}

const MAX_PAGINAS = Math.ceil(MAX_RESULTADOS / POR_PAGINA);
/** Los ficheros con hash en el nombre no cambian nunca: se pueden cachear para siempre. */
const UN_ANO = 365 * 24 * 60 * 60;

export function crearApp({ catalogo, webDist, proxiesDeConfianza = 0, hsts = false }: OpcionesApp): Express {
  const app = express();
  app.disable('x-powered-by');
  if (proxiesDeConfianza > 0) app.set('trust proxy', proxiesDeConfianza);
  // El trozo del globo pesa unos 2 MB sin comprimir y menos de 600 kB comprimido.
  app.use(compression());
  app.use(cabecerasSeguras({ hsts }));

  app.get('/api/salud', (_req, res) => {
    res.json({ ok: true, destinos: catalogo.destinos().length, lugares: catalogo.lugares().length });
  });

  // --- Selección verificada (E1) ---

  app.get('/api/destinos', (_req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json({
      destinos: catalogo.destinos(),
      verificadasEl: catalogo.generadaEl,
      nota: 'Destinos con emisoras comprobadas a mano. El buscador llega a todo el catálogo.',
    });
  });

  app.get('/api/destinos/:id/emisoras', async (req, res) => {
    const { id } = req.params;
    if (!esIdDestino(id)) {
      res.status(400).json({ error: 'Identificador de destino no válido.' });
      return;
    }
    try {
      const respuesta = await catalogo.emisorasDe(id);
      if (!respuesta) {
        res.status(404).json({ error: 'Ese destino todavía no está en RadioPirata.' });
        return;
      }
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.json(respuesta);
    } catch {
      res.status(502).json({ error: 'No se ha podido consultar el catálogo.' });
    }
  });

  // --- Índice propio de lugares ---

  app.get('/api/lugares', (_req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.json({
      lugares: catalogo.lugares(),
      nota: 'Índice propio de ciudades. Las coordenadas enfocan el globo; no son la ubicación de cada emisora.',
    });
  });

  app.get('/api/lugares/:id/emisoras', async (req, res) => {
    const { id } = req.params;
    if (!esIdDestino(id)) {
      res.status(400).json({ error: 'Identificador de lugar no válido.' });
      return;
    }
    try {
      const respuesta = await catalogo.emisorasDeLugar(id);
      if (!respuesta) {
        res.status(404).json({ error: 'Ese lugar no está en nuestro índice de ciudades.' });
        return;
      }
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.json(respuesta);
    } catch {
      res.status(502).json({ error: 'No se ha podido consultar el catálogo.' });
    }
  });

  // --- Búsqueda ---

  app.get('/api/buscar', async (req, res) => {
    const consulta = consultaValida(req.query['q']);
    if (consulta === null) {
      res.status(400).json({ error: `Escribe entre 2 y ${MAX_CONSULTA} caracteres para buscar.` });
      return;
    }
    const pagina = paginaValida(req.query['pagina'], MAX_PAGINAS);
    if (pagina === null) {
      res.status(400).json({ error: `La página debe ser un número entre 1 y ${MAX_PAGINAS}.` });
      return;
    }
    const brutoPais = req.query['pais'];
    const codigoPais = codigoPaisValido(brutoPais);
    if (brutoPais !== undefined && brutoPais !== '' && codigoPais === null) {
      res.status(400).json({ error: 'El país debe ser un código de dos letras.' });
      return;
    }
    try {
      const respuesta = await catalogo.buscar(consulta, pagina, codigoPais ?? undefined);
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.json(respuesta);
    } catch {
      res.status(502).json({ error: 'El catálogo no ha respondido. Inténtalo otra vez en un momento.' });
    }
  });

  // --- Emisoras ---

  app.get('/api/emisoras/:id', async (req, res) => {
    const { id } = req.params;
    if (!esUuid(id)) {
      res.status(400).json({ error: 'Identificador de emisora no válido.' });
      return;
    }
    try {
      const emisora = await catalogo.emisora(id);
      if (!emisora) {
        res.status(404).json({ error: 'Esa emisora ya no está disponible o no se puede reproducir aquí.' });
        return;
      }
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.json({ emisora });
    } catch {
      res.status(502).json({ error: 'No se ha podido consultar el catálogo.' });
    }
  });

  app.post('/api/emisoras/:id/clic', async (req, res) => {
    const { id } = req.params;
    if (!esUuid(id)) {
      res.status(400).json({ error: 'Identificador de emisora no válido.' });
      return;
    }
    const resultado = await catalogo.registrarClic(id);
    res.json({ resultado });
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada.' });
  });

  if (webDist) {
    const carpeta = resolve(webDist);
    const indice = resolve(carpeta, 'index.html');
    if (existsSync(indice)) {
      // Los assets llevan hash en el nombre: se cachean para siempre. El index.html no, para que
      // cada despliegue se vea al instante sin que nadie tenga que vaciar la caché.
      app.use(
        '/assets',
        express.static(resolve(carpeta, 'assets'), {
          index: false,
          immutable: true,
          maxAge: UN_ANO * 1000,
          fallthrough: false,
        }),
      );
      app.use(express.static(carpeta, { index: false, maxAge: '1h' }));
      app.get(/.*/, (_req, res) => {
        res.setHeader('Cache-Control', 'no-cache');
        res.sendFile(indice);
      });
    }
  }

  return app;
}
