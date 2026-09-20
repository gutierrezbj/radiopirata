import { useEffect, useRef, useState } from 'react';
import type { Emisora } from '../tipos';
import { compartirEmisora, enlaceDeEmisora } from '../util/compartir';
import { IconoCompartir } from './Iconos';

interface Props {
  emisora: Emisora;
  /** `icono` para las listas y el reproductor; `texto` para la ficha de una emisora compartida. */
  aspecto?: 'icono' | 'texto';
}

export function BotonCompartir({ emisora, aspecto = 'icono' }: Props) {
  const [estado, setEstado] = useState<'quieto' | 'copiado' | 'manual'>('quieto');
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (temporizador.current !== null) clearTimeout(temporizador.current);
    },
    [],
  );

  async function alPulsar() {
    const resultado = await compartirEmisora(emisora);
    if (resultado === 'manual') {
      setEstado('manual');
      return;
    }
    setEstado(resultado === 'copiado' ? 'copiado' : 'quieto');
    if (temporizador.current !== null) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setEstado('quieto'), 2500);
  }

  return (
    <>
      <button
        type="button"
        className={aspecto === 'icono' ? 'boton-icono boton-icono--pequeno' : 'boton boton--secundario'}
        onClick={() => {
          void alPulsar();
        }}
        aria-label={`Compartir ${emisora.nombre}`}
        title="Compartir esta emisora"
      >
        <IconoCompartir />
        {aspecto === 'texto' && <span>{estado === 'copiado' ? 'Enlace copiado' : 'Compartir'}</span>}
      </button>
      {aspecto === 'icono' && estado === 'copiado' && (
        <span className="pista-breve" role="status">
          Enlace copiado
        </span>
      )}
      {estado === 'manual' && (
        <label className="compartir-manual">
          <span className="visualmente-oculto">Enlace para copiar</span>
          <input type="text" readOnly value={enlaceDeEmisora(emisora)} onFocus={(e) => e.target.select()} />
        </label>
      )}
    </>
  );
}
