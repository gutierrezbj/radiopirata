import { crearApp } from './app.js';
import { Catalogo } from './catalogo.js';
import { config } from './config.js';
import { cargarCiudades } from './lugares.js';
import { ClienteRadioBrowser } from './radioBrowser.js';
import { cargarSeleccion } from './seleccion.js';

const seleccion = cargarSeleccion();
const ciudades = cargarCiudades();
const cliente = new ClienteRadioBrowser({ userAgent: config.userAgent, timeoutMs: config.timeoutMs });
const catalogo = new Catalogo(seleccion, cliente, { ttlMs: config.cacheTtlMs, max: config.cacheMax }, ciudades);
const app = crearApp({
  catalogo,
  webDist: config.webDist,
  proxiesDeConfianza: config.proxiesDeConfianza,
  hsts: config.hsts,
});

const servidor = app.listen(config.puerto, () => {
  console.log(
    `RadioPirata en http://localhost:${config.puerto} — ${ciudades.length} lugares en el índice, ` +
      `selección comprobada del ${seleccion.generadaEl.slice(0, 10)}`,
  );
});

/**
 * Apagado ordenado: se deja de aceptar conexiones y se espera a que terminen las que hay.
 * Sin esto, un reinicio corta la escucha de quien esté pidiendo datos en ese momento.
 */
let cerrando = false;
for (const senal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(senal, () => {
    if (cerrando) return;
    cerrando = true;
    console.log(`Recibida ${senal}: cerrando RadioPirata…`);
    const plazo = setTimeout(() => {
      console.error('Las conexiones no han terminado a tiempo; se cierra de todos modos.');
      process.exit(1);
    }, 10_000);
    plazo.unref();
    servidor.close((error) => {
      if (error) {
        console.error('Error al cerrar:', error.message);
        process.exit(1);
      }
      process.exit(0);
    });
  });
}
