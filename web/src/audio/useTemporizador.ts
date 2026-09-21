import { useSyncExternalStore } from 'react';
import { temporizador } from './instancia';
import type { EstadoTemporizador } from './temporizador';

export function useTemporizador(): EstadoTemporizador {
  return useSyncExternalStore(temporizador.suscribir, temporizador.instantanea, temporizador.instantanea);
}
