import { useEffect, useId, useState, type FormEvent } from 'react';
import type { Lugar } from '../tipos';
import { lugarExacto } from '../util/lugares';
import { MAX_CONSULTA, navegar } from '../util/ruta';
import { IconoLupa } from './Iconos';

interface Props {
  lugares: Lugar[];
  /** Texto con el que arranca el campo, al volver a una búsqueda ya hecha. */
  inicial?: string;
  compacto?: boolean;
  listo: boolean;
}

/**
 * Buscador único de la aplicación. Si el texto es exactamente una ciudad del índice propio,
 * lleva directo a ese lugar; si no, abre los resultados del catálogo.
 */
export function Buscador({ lugares, inicial = '', compacto = false, listo }: Props) {
  const [texto, setTexto] = useState(inicial);
  const [aviso, setAviso] = useState<string | null>(null);
  const idCampo = useId();
  const idAviso = useId();

  useEffect(() => {
    setTexto(inicial);
  }, [inicial]);

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    const limpio = texto.replace(/\s+/g, ' ').trim();
    if (limpio.length < 2) {
      setAviso('Escribe al menos dos letras: una ciudad, un país o un estilo.');
      return;
    }
    setAviso(null);
    const lugar = lugarExacto(limpio, lugares);
    navegar(lugar ? { tipo: 'lugar', id: lugar.id } : { tipo: 'busqueda', q: limpio });
  }

  return (
    <form
      className={`buscador ${compacto ? 'buscador--compacto' : ''}`}
      onSubmit={enviar}
      role="search"
      aria-describedby={aviso ? idAviso : undefined}
    >
      <label className="visualmente-oculto" htmlFor={idCampo}>
        Buscar una ciudad, un país o un estilo
      </label>
      {compacto && (
        <span className="buscador__lupa" aria-hidden="true">
          <IconoLupa />
        </span>
      )}
      <input
        id={idCampo}
        className="buscador__campo"
        type="text"
        inputMode="search"
        autoComplete="off"
        enterKeyHint="search"
        placeholder={listo ? 'Lisboa, Japón, jazz…' : 'Cargando…'}
        value={texto}
        maxLength={MAX_CONSULTA}
        disabled={!listo}
        onChange={(e) => {
          setTexto(e.target.value);
          if (aviso) setAviso(null);
        }}
      />
      <button className={`boton ${compacto ? 'boton--secundario' : 'boton--principal'}`} type="submit" disabled={!listo}>
        {compacto ? 'Buscar' : 'Explorar'}
      </button>
      {aviso && (
        <p id={idAviso} className="buscador__aviso" role="status">
          {aviso}
        </p>
      )}
    </form>
  );
}
