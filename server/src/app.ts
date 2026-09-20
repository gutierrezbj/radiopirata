import express, { type Express } from 'express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Catalogo } from './catalogo.js';
import { esIdDestino, esUuid } from './validacion.js';

export interface OpcionesApp {
  catalogo: Catalogo;
  /** Carpeta del build de la web a servir en producción; si no existe, solo se sirve la API. */
  webDist?: string | undefined;
}

export function crearApp({ catalogo, webDist }: OpcionesApp): Express {
  const app = express();
  app.disable('x-powered-by');

  app.get('/api/salud', (_req, res) => {
    res.json({ ok: true, destinos: catalogo.destinos().length });
  });

  app.get('/api/destinos', (_req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json({
      destinos: catalogo.destinos(),
      nota: 'Primera versión: la búsqueda se limita a Tokio, Caracas y Lisboa y a una selección pequeña de emisoras verificadas.',
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
      // Los assets llevan hash en el nombre y pueden cachearse; index.html no, para que cada despliegue se vea al instante.
      app.use(express.static(carpeta, { index: false, maxAge: '1h' }));
      app.get(/.*/, (_req, res) => {
        res.setHeader('Cache-Control', 'no-cache');
        res.sendFile(indice);
      });
    }
  }

  return app;
}
