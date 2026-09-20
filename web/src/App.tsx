import { useCallback, useEffect, useState } from 'react';
import { obtenerDestinos } from './api/cliente';
import { Explorador } from './componentes/Explorador';
import { Inicio } from './componentes/Inicio';
import { Reproductor } from './componentes/Reproductor';
import { useAudio } from './audio/useAudio';
import type { Destino } from './tipos';

type Vista = { nombre: 'inicio' } | { nombre: 'explorador'; destinoId: string; sorpresa: boolean };

export interface EstadoDestinos {
  estado: 'cargando' | 'listo' | 'error';
  destinos: Destino[];
  nota: string;
  error: string | null;
}

export function App() {
  const [vista, setVista] = useState<Vista>({ nombre: 'inicio' });
  const [destinos, setDestinos] = useState<EstadoDestinos>({ estado: 'cargando', destinos: [], nota: '', error: null });
  const [intento, setIntento] = useState(0);
  const audioEstado = useAudio();

  useEffect(() => {
    const control = new AbortController();
    setDestinos((d) => ({ ...d, estado: 'cargando', error: null }));
    obtenerDestinos(control.signal)
      .then((r) => setDestinos({ estado: 'listo', destinos: r.destinos, nota: r.nota, error: null }))
      .catch((e: unknown) => {
        if (control.signal.aborted) return;
        setDestinos({ estado: 'error', destinos: [], nota: '', error: e instanceof Error ? e.message : 'Error desconocido' });
      });
    return () => control.abort();
  }, [intento]);

  const irADestino = useCallback((destinoId: string, sorpresa = false) => {
    setVista({ nombre: 'explorador', destinoId, sorpresa });
  }, []);

  const volverAlInicio = useCallback(() => setVista({ nombre: 'inicio' }), []);

  // El reproductor se muestra en cuanto hay una emisora seleccionada, también al volver al inicio.
  const hayReproductor = audioEstado.emisora !== null;

  return (
    <div className={`app ${hayReproductor ? 'app--con-reproductor' : ''}`}>
      {vista.nombre === 'inicio' ? (
        <Inicio destinos={destinos} alElegir={irADestino} alReintentar={() => setIntento((n) => n + 1)} />
      ) : (
        <Explorador
          destinos={destinos.destinos}
          destinoId={vista.destinoId}
          sorpresa={vista.sorpresa}
          alCambiarDestino={(id) => irADestino(id)}
          alVolver={volverAlInicio}
        />
      )}
      {hayReproductor && <Reproductor />}
    </div>
  );
}
