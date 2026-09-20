import { crearApp } from './app.js';
import { Catalogo } from './catalogo.js';
import { config } from './config.js';
import { ClienteRadioBrowser } from './radioBrowser.js';
import { cargarSeleccion } from './seleccion.js';

const seleccion = cargarSeleccion();
const cliente = new ClienteRadioBrowser({ userAgent: config.userAgent, timeoutMs: config.timeoutMs });
const catalogo = new Catalogo(seleccion, cliente, { ttlMs: config.cacheTtlMs, max: config.cacheMax });
const app = crearApp({ catalogo, webDist: config.webDist });

app.listen(config.puerto, () => {
  console.log(`RadioPirata API en http://localhost:${config.puerto} (selección del ${seleccion.generadaEl.slice(0, 10)})`);
});
