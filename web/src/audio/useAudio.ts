import { useSyncExternalStore } from 'react';
import { audio } from './instancia';
import type { EstadoAudio } from './controlador';

export function useAudio(): EstadoAudio {
  return useSyncExternalStore(audio.suscribir, audio.instantanea, audio.instantanea);
}
