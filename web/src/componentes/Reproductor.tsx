import { useId } from 'react';
import { audio } from '../audio/instancia';
import { useAudio } from '../audio/useAudio';
import { lugarDeEmisora } from '../util/lugar';

export function Reproductor() {
  const { estado, emisora, error, volumen, silenciado, puedeVolumen } = useAudio();
  const idVolumen = useId();
  if (!emisora) return null;

  const sonando = estado === 'playing' || estado === 'loading';
  const lugar = lugarDeEmisora(emisora);

  return (
    <footer className="reproductor" aria-label="Reproductor">
      <div className="reproductor__info">
        <p className="reproductor__nombre">{emisora.nombre}</p>
        <p className="reproductor__lugar">{lugar}</p>
        <p className={`reproductor__estado reproductor__estado--${estado}`} role="status" aria-live="polite">
          {textoEstado(estado, error?.mensaje)}
        </p>
      </div>

      <div className="reproductor__controles">
        <button
          type="button"
          className="boton-icono boton-icono--grande"
          onClick={() => audio.alternar()}
          aria-label={sonando ? 'Pausar' : estado === 'paused' ? 'Volver al directo' : 'Reproducir'}
        >
          {sonando ? <IconoPausa /> : <IconoPlay />}
        </button>
        {estado === 'error' && (
          <button type="button" className="boton boton--secundario" onClick={() => audio.reintentar()}>
            Reintentar
          </button>
        )}
        {estado === 'paused' && <span className="reproductor__pista">Al reanudar vuelves al directo.</span>}
      </div>

      {puedeVolumen && (
        <div className="reproductor__volumen">
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
        </div>
      )}
    </footer>
  );
}

function textoEstado(estado: string, mensajeError?: string): string {
  switch (estado) {
    case 'loading':
      return 'Conectando…';
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

function IconoPlay() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
      <path d="M7 5v14l12-7z" fill="currentColor" />
    </svg>
  );
}

function IconoPausa() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
      <path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor" />
    </svg>
  );
}

function IconoVolumen() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" />
      <path d="M16 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconoSilencio() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" />
      <path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
