import { almacen } from '../almacen/local';
import { registrarClic } from '../api/cliente';
import { lugarDeEmisora } from '../util/lugar';
import { ControladorAudio } from './controlador';
import { Temporizador } from './temporizador';

/**
 * Único elemento de audio de la aplicación. Vive fuera del árbol de React para que
 * navegar por el globo, cambiar de destino o volver al inicio no interrumpa lo que suena.
 */
const elemento = new Audio();
elemento.preload = 'none';

export const audio = new ControladorAudio(elemento, {
  alEmpezar: (emisora) => {
    // Solo cuando suena de verdad: ni al navegar ni al elegir sin llegar a sonar.
    registrarClic(emisora.id);
    almacen.registrarReciente(emisora);
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

/** Temporizador para dormirse con la radio: al acabar, pausa. */
export const temporizador = new Temporizador(() => {
  audio.pausar();
  if (volumenAntesDelFundido !== null) {
    audio.fijarVolumen(volumenAntesDelFundido);
    volumenAntesDelFundido = null;
  }
});

/**
 * En los últimos treinta segundos el volumen baja poco a poco, como quien apaga una radio
 * de noche sin sobresaltos. Solo donde el navegador deja tocar el volumen; en iOS se apaga sin más.
 */
const FUNDIDO_MS = 30_000;
let volumenAntesDelFundido: number | null = null;

temporizador.suscribir(() => {
  const { activo, restanteMs } = temporizador.instantanea();
  const { puedeVolumen, volumen } = audio.instantanea();
  if (!puedeVolumen) return;
  if (!activo) {
    // Cancelado a mano en mitad del fundido: se devuelve el volumen que había.
    if (volumenAntesDelFundido !== null) {
      audio.fijarVolumen(volumenAntesDelFundido);
      volumenAntesDelFundido = null;
    }
    return;
  }
  if (restanteMs > FUNDIDO_MS) return;
  if (volumenAntesDelFundido === null) volumenAntesDelFundido = volumen;
  audio.fijarVolumen(volumenAntesDelFundido * (restanteMs / FUNDIDO_MS));
});
