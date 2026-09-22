import { useId, useState } from 'react';
import { almacen } from '../almacen/local';
import { useAlmacen } from '../almacen/useAlmacen';
import { vecinas } from '../audio/cola';
import { audio, temporizador } from '../audio/instancia';
import { reproducirDesde } from '../audio/reproducir';
import { OPCIONES_MINUTOS, textoRestante } from '../audio/temporizador';
import { useAudio } from '../audio/useAudio';
import { useCola } from '../audio/useCola';
import { useTemporizador } from '../audio/useTemporizador';
import type { Lugar } from '../tipos';
import { lugarDeEmisora } from '../util/lugar';
import { useHoraLocal } from '../util/useHoraLocal';
import { BotonCompartir } from './BotonCompartir';
import { DialSintonia } from './DialSintonia';
import {
  IconoAnterior,
  IconoEstrella,
  IconoDormir,
  IconoPausa,
  IconoPlay,
  IconoSiguiente,
  IconoSilencio,
  IconoVolumen,
} from './Iconos';

interface Props {
  /** Índice de ciudades, para decir qué hora es donde suena la emisora. */
  lugares: Lugar[];
}

export function Reproductor({ lugares }: Props) {
  const { estado, emisora, error, volumen, silenciado, puedeVolumen, sintonia } = useAudio();
  const lista = useCola();
  const { favoritas, disponible } = useAlmacen();
  const dormir = useTemporizador();
  const [menuDormir, setMenuDormir] = useState(false);
  const idVolumen = useId();
  const idMenu = useId();
  // Solo se sabe la hora de allí cuando la emisora salió de una ciudad del índice.
  const lugar = emisora ? (lugares.find((l) => l.id === emisora.destinoId) ?? null) : null;
  const { hora } = useHoraLocal(lugar?.zonaHoraria);
  if (!emisora) return null;

  const sonando = estado === 'playing' || estado === 'loading';
  const { anterior, siguiente } = vecinas(lista, emisora.id);
  const hayPasos = lista.length > 1;
  const esFavorita = favoritas.some((e) => e.id === emisora.id);

  return (
    <footer className="reproductor" aria-label="Reproductor">
      <div className="reproductor__info">
        <p className="reproductor__nombre">{emisora.nombre}</p>
        <p className="reproductor__lugar">
          {lugarDeEmisora(emisora)}
          {hora && <span className="reproductor__hora"> · {hora} allí</span>}
        </p>
        <p className={`reproductor__estado reproductor__estado--${estado}`} role="status" aria-live="polite">
          {textoEstado(estado, error?.mensaje)}
          {dormir.activo && <span className="reproductor__dormir"> · se apaga en {textoRestante(dormir.restanteMs)}</span>}
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
        <span className="temporizador">
          <button
            type="button"
            className="boton-icono"
            aria-expanded={menuDormir}
            aria-controls={idMenu}
            aria-pressed={dormir.activo}
            aria-label={dormir.activo ? `Temporizador puesto: se apaga en ${textoRestante(dormir.restanteMs)}` : 'Apagar más tarde'}
            title={dormir.activo ? 'Temporizador para dormir, puesto' : 'Dormirse con la radio puesta'}
            onClick={() => setMenuDormir((abierto) => !abierto)}
          >
            <IconoDormir />
          </button>
          {menuDormir && (
            <div id={idMenu} className="temporizador__menu" role="group" aria-label="Apagar dentro de">
              {OPCIONES_MINUTOS.map((minutos) => (
                <button
                  key={minutos}
                  type="button"
                  className="ficha ficha--pequena"
                  onClick={() => {
                    temporizador.programar(minutos);
                    setMenuDormir(false);
                  }}
                >
                  {minutos} min
                </button>
              ))}
              {dormir.activo && (
                <button
                  type="button"
                  className="enlace"
                  onClick={() => {
                    temporizador.cancelar();
                    setMenuDormir(false);
                  }}
                >
                  Quitar temporizador
                </button>
              )}
            </div>
          )}
        </span>
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
