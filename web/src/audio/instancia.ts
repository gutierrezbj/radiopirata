import { registrarClic } from '../api/cliente';
import { lugarDeEmisora } from '../util/lugar';
import { ControladorAudio } from './controlador';

/**
 * Único elemento de audio de la aplicación. Vive fuera del árbol de React para que
 * navegar por el globo, cambiar de destino o volver al inicio no interrumpa lo que suena.
 */
const elemento = new Audio();
elemento.preload = 'none';

export const audio = new ControladorAudio(elemento, {
  alEmpezar: (emisora) => {
    registrarClic(emisora.id);
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: emisora.nombre,
        artist: `${lugarDeEmisora(emisora)} · RadioPirata`,
      });
    }
  },
});

if ('mediaSession' in navigator) {
  try {
    navigator.mediaSession.setActionHandler('play', () => audio.reanudar());
    navigator.mediaSession.setActionHandler('pause', () => audio.pausar());
  } catch {
    // acciones no admitidas en este navegador
  }
}
