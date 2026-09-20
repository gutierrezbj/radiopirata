import { useSyncExternalStore } from 'react';
import { almacen } from './local';
import type { DatosAlmacen } from './local';

export function useAlmacen(): DatosAlmacen {
  return useSyncExternalStore(almacen.suscribir, almacen.instantanea, almacen.instantanea);
}
