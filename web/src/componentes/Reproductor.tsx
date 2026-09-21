import { useId } from 'react';
import { almacen } from '../almacen/local';
import { useAlmacen } from '../almacen/useAlmacen';
import { vecinas } from '../audio/cola';
import { audio } from '../audio/instancia';
import { reproducirDesde } from '../audio/reproducir';
import { useAudio } from '../audio/useAudio';
import { useCola } from '../audio/useCola';
import { lugarDeEmisora } from '../util/lugar';
import { BotonCompartir } from './BotonCompartir';
import { DialSintonia } from './DialSintonia';
import {
  IconoAnterior,
  IconoEstrella,
  IconoPausa,
  IconoPlay,
  IconoSiguiente,
  IconoSilencio,
  IconoVolumen,
} from './Iconos';

export function Reproductor() {
  const { estado, emisora, error, volumen, silenciado, puedeVolumen, sintonia } = useAudio();
  const lista = useCola();
  const { favoritas, disponible } = useAlmacen();
  const idVolumen = useId();
  if (!emisora) return null;

  const sonando = estado === 'playing' || estado === 'loading';
  const { anterior, siguiente } = vecinas(lista, emisora.id);
  const hayPasos = lista.length > 1;
  const esFavorita = favoritas.some((e) => e.id === emisora.id);

  return (
    <footer className="reproductor" aria-label="Reproductor">
      <div className="reproductor__info">
        <p className="reproductor__nombre">{emisora.nombre}</p>
        <p className="reproductor__lugar">{lugarDeEmisora(emisora)}</p>
        <p className={`reproductor__estado reproductor__estado--${estado}`} role="status" aria-live="polite">
          {textoEstado(estado, error?.mensaje)}
        </p>
      </div>

      <div className="reproductor__controles">
        {hayPasos && (
          <button
            type="button"
            className="boton-icono"
            onClick={() => anterior && reproducirDesde(anterior, lista)}
            disabled={anterior === null}
            aria-label="Emisora anterior de la lista"
            title={anterior ? `Anterior: ${anterior.nombre}` : 'Ya estás en la primera de la lista'}
          >
            <IconoAnterior />
          </button>
        )}
        <span className="dial">
          <DialSintonia sintonia={sintonia} estado={estado} />
          <button
            type="button"
            className="boton-icono boton-icono--grande"
            onClick={() => audio.alternar()}
            aria-label={sonando ? 'Pausar' : estado === 'paused' ? 'Volver al directo' : 'Reproducir'}
          >
            {sonando ? <IconoPausa /> : <IconoPlay />}
          </button>
        </span>
        {hayPasos && (
          <button
            type="button"
            className="boton-icono"
            onClick={() => siguiente && reproducirDesde(siguiente, lista)}
            disabled={siguiente === null}
            aria-label="Emisora siguiente de la lista"
            title={siguiente ? `Siguiente: ${siguiente.nombre}` : 'Ya estás en la última de la lista'}
          >
            <IconoSiguiente />
          </button>
        )}
        {estado === 'error' && (
          <button type="button" className="boton boton--secundario" onClick={() => audio.reintentar()}>
            Reintentar
          </button>
        )}
        {estado === 'paused' && <span className="reproductor__pista">Al reanudar vuelves al directo.</span>}
      </div>

      <div className="reproductor__extras">
        {disponible && (
          <button
            type="button"
            className="boton-icono"
            aria-pressed={esFavorita}
            aria-label={esFavorita ? 'Quitar de mis favoritas' : 'Guardar en mis favoritas'}
            title={esFavorita ? 'Quitar de favoritas' : 'Guardar en favoritas'}
            onClick={() => almacen.alternarFavorita(emisora)}
          >
            <IconoEstrella llena={esFavorita} />
          </button>
        )}
        <span className="reproductor__compartir">
          <BotonCompartir emisora={emisora} />
        </span>
        {puedeVolumen && (
          <span className="reproductor__volumen">
            <button
              type="button"
              className="boton-icono"
              onClick={() => audio.silenciar(!silenciado)}
              aria-label={silenciado ? 'Activar sonido' : 'Silenciar'}
              aria-pressed={silenciado}
            >
              {silenciado || volumen === 0 ? <IconoSilencio /> : <IconoVolumen />}
            </button>
            <label className="visualmente-oculto" htmlFor={idVolumen}>
              Volumen
            </label>
            <input
              id={idVolumen}
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={silenciado ? 0 : volumen}
              onChange={(e) => audio.fijarVolumen(Number(e.target.value))}
            />
          </span>
        )}
      </div>
    </footer>
  );
}

function textoEstado(estado: string, mensajeError?: string): string {
  switch (estado) {
    case 'loading':
      return 'Sintonizando…';
    case 'playing':
      return 'En directo';
    case 'paused':
      return 'En pausa';
    case 'error':
      return mensajeError ?? 'No se ha podido reproducir.';
    default:
      return 'Elige una emisora';
  }
}
