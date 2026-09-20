import type { EstadoReproduccion } from '../audio/controlador';
import type { Emisora } from '../tipos';
import { lugarDeEmisora } from '../util/lugar';
import { BotonCompartir } from './BotonCompartir';
import { IconoEstrella } from './Iconos';

interface Props {
  emisoras: Emisora[];
  emisoraActual: Emisora | null;
  estadoAudio: EstadoReproduccion;
  /** Falso cuando el navegador no deja guardar nada: entonces no se enseña la estrella. */
  hayFavoritas: boolean;
  esFavorita: (id: string) => boolean;
  /** Muestra el lugar de cada emisora; útil en búsquedas, sobra en la página de una ciudad. */
  conLugar?: boolean;
  alElegir: (emisora: Emisora) => void;
  alAlternarFavorita: (emisora: Emisora) => void;
}

export function ListaEmisoras({
  emisoras,
  emisoraActual,
  estadoAudio,
  hayFavoritas,
  esFavorita,
  conLugar = false,
  alElegir,
  alAlternarFavorita,
}: Props) {
  return (
    <ul className="emisoras">
      {emisoras.map((emisora) => {
        const esActual = emisoraActual?.id === emisora.id;
        const estado = esActual ? textoEstado(estadoAudio) : null;
        const favorita = hayFavoritas && esFavorita(emisora.id);
        const detalle = [
          emisora.codec,
          emisora.bitrate > 0 ? `${emisora.bitrate} kbps` : null,
          conLugar ? lugarDeEmisora(emisora) : emisora.etiquetas.slice(0, 3).join(' · '),
        ]
          .filter(Boolean)
          .join(' · ');
        return (
          <li key={emisora.id} className={`emisora ${esActual ? 'emisora--actual' : ''}`}>
            <button type="button" className="emisora__principal" aria-pressed={esActual} onClick={() => alElegir(emisora)}>
              <span className="emisora__nombre">
                {emisora.nombre}
                {emisora.verificada && (
                  <span className="sello" title="Comprobada a mano por RadioPirata">
                    comprobada
                  </span>
                )}
              </span>
              <span className="emisora__detalle">{detalle}</span>
              {estado && <span className="emisora__estado">{estado}</span>}
            </button>
            <div className="emisora__acciones">
              {hayFavoritas && (
                <button
                  type="button"
                  className="boton-icono boton-icono--pequeno"
                  aria-pressed={favorita}
                  aria-label={favorita ? `Quitar ${emisora.nombre} de mis favoritas` : `Guardar ${emisora.nombre} en mis favoritas`}
                  title={favorita ? 'Quitar de favoritas' : 'Guardar en favoritas'}
                  onClick={() => alAlternarFavorita(emisora)}
                >
                  <IconoEstrella llena={favorita} />
                </button>
              )}
              <BotonCompartir emisora={emisora} />
            </div>
          </li>
        );
      })}
    </ul>
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
