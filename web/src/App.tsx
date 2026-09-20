import { useCallback, useEffect, useState } from 'react';
import { obtenerDestinos, obtenerLugares } from './api/cliente';
import { useAudio } from './audio/useAudio';
import { Explorador } from './componentes/Explorador';
import { Inicio } from './componentes/Inicio';
import { Reproductor } from './componentes/Reproductor';
import type { Destino, Lugar } from './tipos';
import { lugarAlAzar } from './util/lugares';
import { navegar, useRuta } from './util/ruta';

export interface EstadoIndice {
  estado: 'cargando' | 'listo' | 'error';
  /** Índice propio de ciudades con coordenadas fiables. */
  lugares: Lugar[];
  /** Los pocos destinos con emisoras comprobadas a mano. */
  destinos: Destino[];
  error: string | null;
}

export function App() {
  const ruta = useRuta();
  const [indice, setIndice] = useState<EstadoIndice>({ estado: 'cargando', lugares: [], destinos: [], error: null });
  const [intento, setIntento] = useState(0);
  const [sorpresa, setSorpresa] = useState(false);
  const audioEstado = useAudio();

  useEffect(() => {
    const control = new AbortController();
    setIndice((i) => ({ ...i, estado: 'cargando', error: null }));
    Promise.all([obtenerLugares(control.signal), obtenerDestinos(control.signal)])
      .then(([lugares, destinos]) => {
        if (control.signal.aborted) return;
        setIndice({ estado: 'listo', lugares: lugares.lugares, destinos: destinos.destinos, error: null });
      })
      .catch((e: unknown) => {
        if (control.signal.aborted) return;
        setIndice({
          estado: 'error',
          lugares: [],
          destinos: [],
          error: e instanceof Error ? e.message : 'No se ha podido cargar el índice de lugares.',
        });
      });
    return () => control.abort();
  }, [intento]);

  /** Un lugar al azar del índice y, al llegar su lista, una emisora al azar. */
  const sorprender = useCallback(() => {
    const lugar = lugarAlAzar(indice.lugares);
    if (!lugar) return;
    setSorpresa(true);
    navegar({ tipo: 'lugar', id: lugar.id });
  }, [indice.lugares]);

  // El reproductor se mantiene mientras haya algo elegido, también al volver al inicio.
  const hayReproductor = audioEstado.emisora !== null;

  return (
    <div className={`app ${hayReproductor ? 'app--con-reproductor' : ''}`}>
      {ruta.tipo === 'inicio' ? (
        <Inicio indice={indice} alReintentar={() => setIntento((n) => n + 1)} alSorprender={sorprender} />
      ) : (
        <Explorador
          ruta={ruta}
          indice={indice}
          sorpresa={sorpresa}
          alConsumirSorpresa={() => setSorpresa(false)}
          alSorprender={sorprender}
        />
      )}
      {hayReproductor && <Reproductor />}
    </div>
  );
}
