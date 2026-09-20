import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { obtenerEmisoras } from '../api/cliente';
import { audio } from '../audio/instancia';
import { useAudio } from '../audio/useAudio';
import type { Destino, Emisora, RespuestaEmisoras } from '../tipos';
import { hayWebGL } from '../util/entorno';
import { IconoRadio } from './IconoRadio';
import { PanelEmisoras } from './PanelEmisoras';

const Globo = lazy(() => import('./Globo').then((m) => ({ default: m.Globo })));

interface Props {
  destinos: Destino[];
  destinoId: string;
  sorpresa: boolean;
  alCambiarDestino: (id: string) => void;
  alVolver: () => void;
}

export type EstadoEmisoras =
  | { estado: 'cargando' }
  | { estado: 'listo'; datos: RespuestaEmisoras }
  | { estado: 'error'; mensaje: string };

export function Explorador({ destinos, destinoId, sorpresa, alCambiarDestino, alVolver }: Props) {
  const [emisoras, setEmisoras] = useState<EstadoEmisoras>({ estado: 'cargando' });
  const [intento, setIntento] = useState(0);
  const [hover, setHover] = useState<Destino | null>(null);
  const [conWebGL] = useState(() => hayWebGL());
  const audioEstado = useAudio();
  const sorpresaPendiente = useRef(sorpresa);
  const destino = useMemo(() => destinos.find((d) => d.id === destinoId) ?? null, [destinos, destinoId]);

  // Carga de emisoras del destino, cancelando la anterior si el usuario cambia rápido.
  useEffect(() => {
    const control = new AbortController();
    setEmisoras({ estado: 'cargando' });
    obtenerEmisoras(destinoId, control.signal)
      .then((datos) => {
        if (control.signal.aborted) return;
        setEmisoras({ estado: 'listo', datos });
        if (sorpresaPendiente.current) {
          sorpresaPendiente.current = false;
          const alAzar = datos.emisoras[Math.floor(Math.random() * datos.emisoras.length)];
          if (alAzar) audio.seleccionar(alAzar);
        }
      })
      .catch((e: unknown) => {
        if (control.signal.aborted) return;
        setEmisoras({ estado: 'error', mensaje: e instanceof Error ? e.message : 'No se ha podido cargar el destino.' });
      });
    return () => control.abort();
  }, [destinoId, intento]);

  const emisorasVisibles: Emisora[] = emisoras.estado === 'listo' ? emisoras.datos.emisoras : [];

  return (
    <div className="explorador">
      <header className="explorador__cabecera">
        <button type="button" className="marca marca--boton" onClick={alVolver} aria-label="Volver al inicio">
          <IconoRadio />
          <span className="marca__texto">RadioPirata</span>
        </button>
        <nav className="destinos" aria-label="Cambiar de destino">
          {destinos.map((d) => (
            <button
              key={d.id}
              type="button"
              className="ficha ficha--pequena"
              aria-current={d.id === destinoId ? 'true' : undefined}
              onClick={() => alCambiarDestino(d.id)}
            >
              {d.nombre}
            </button>
          ))}
        </nav>
      </header>

      <div className="explorador__cuerpo">
        <PanelEmisoras
          destino={destino}
          emisoras={emisoras}
          emisoraActual={audioEstado.emisora}
          estadoAudio={audioEstado.estado}
          alElegir={(e) => audio.seleccionar(e)}
          alReintentar={() => setIntento((n) => n + 1)}
        />

        <section className="escena" aria-label="Globo terráqueo">
          {conWebGL ? (
            <Suspense fallback={<p className="escena__aviso">Preparando el globo…</p>}>
              <Globo
                destinos={destinos}
                destinoActual={destino}
                emisoras={emisorasVisibles}
                alElegirDestino={(d) => alCambiarDestino(d.id)}
                alPasarPorDestino={setHover}
              />
            </Suspense>
          ) : (
            <div className="escena__sin-webgl">
              <p>Tu navegador no puede dibujar el globo, pero puedes elegir destino y escuchar desde la lista.</p>
            </div>
          )}
          {hover && hover.id !== destinoId && (
            <p className="escena__pista" role="status">
              {hover.nombre}, {hover.pais} · toca para abrir
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
