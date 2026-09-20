import type { EstadoReproduccion } from '../audio/controlador';
import type { Destino, Emisora } from '../tipos';
import type { EstadoEmisoras } from './Explorador';

interface Props {
  destino: Destino | null;
  emisoras: EstadoEmisoras;
  emisoraActual: Emisora | null;
  estadoAudio: EstadoReproduccion;
  alElegir: (emisora: Emisora) => void;
  alReintentar: () => void;
}

export function PanelEmisoras({ destino, emisoras, emisoraActual, estadoAudio, alElegir, alReintentar }: Props) {
  return (
    <aside className="panel" aria-labelledby="panel-titulo">
      <div className="panel__cabecera">
        <h2 id="panel-titulo" className="panel__titulo">
          {destino ? destino.nombre : 'Destino'}
        </h2>
        {destino && <p className="panel__pais">{destino.pais}</p>}
      </div>

      {emisoras.estado === 'cargando' && (
        <p className="panel__estado" role="status">
          Buscando emisoras…
        </p>
      )}

      {emisoras.estado === 'error' && (
        <div className="panel__estado" role="alert">
          <p>{emisoras.mensaje}</p>
          <button type="button" className="boton boton--secundario" onClick={alReintentar}>
            Reintentar
          </button>
        </div>
      )}

      {emisoras.estado === 'listo' && emisoras.datos.emisoras.length === 0 && (
        <p className="panel__estado">Todavía no tenemos emisoras verificadas para este destino.</p>
      )}

      {emisoras.estado === 'listo' && emisoras.datos.emisoras.length > 0 && (
        <>
          <ul className="emisoras">
            {emisoras.datos.emisoras.map((e) => {
              const esActual = emisoraActual?.id === e.id;
              const etiquetaEstado = esActual ? textoEstado(estadoAudio) : null;
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    className={`emisora ${esActual ? 'emisora--actual' : ''}`}
                    aria-pressed={esActual}
                    onClick={() => alElegir(e)}
                  >
                    <span className="emisora__nombre">{e.nombre}</span>
                    <span className="emisora__detalle">
                      {[e.codec, e.bitrate > 0 ? `${e.bitrate} kbps` : null, e.etiquetas.slice(0, 3).join(' · ')]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    {etiquetaEstado && <span className="emisora__estado">{etiquetaEstado}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="panel__nota">
            {emisoras.datos.origen === 'copia-local' ? emisoras.datos.nota : 'Selección pequeña de esta primera versión.'}
          </p>
        </>
      )}
    </aside>
  );
}

function textoEstado(estado: EstadoReproduccion): string | null {
  switch (estado) {
    case 'loading':
      return 'Conectando…';
    case 'playing':
      return 'En directo';
    case 'paused':
      return 'En pausa';
    case 'error':
      return 'Sin señal';
    case 'idle':
      return null;
  }
}
