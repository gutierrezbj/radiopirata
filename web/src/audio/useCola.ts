import { useSyncExternalStore } from 'react';
import { cola } from './cola';
import type { Emisora } from '../tipos';

export function useCola(): Emisora[] {
  return useSyncExternalStore(cola.suscribir, cola.instantanea, cola.instantanea);
}
