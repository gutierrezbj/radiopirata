import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { obtenerPaises } from '../api/cliente';
import type { Lugar, Pais } from '../tipos';
import { lugarExacto } from '../util/lugares';
import { MAX_CONSULTA, navegar } from '../util/ruta';
import { sugerencias as calcularSugerencias, type Sugerencia } from '../util/sugerencias';
import { IconoLupa } from './Iconos';

interface Props {
  lugares: Lugar[];
  /** Texto con el que arranca el campo, al volver a una búsqueda ya hecha. */
  inicial?: string;
  compacto?: boolean;
  listo: boolean;
}

/**
 * La lista de países del catálogo se pide una sola vez por sesión y se comparte entre
 * los dos buscadores. Si falla, el buscador sigue funcionando con el índice propio.
 */
let paisesPedidos: Promise<Pais[]> | null = null;
function paisesDelCatalogo(): Promise<Pais[]> {
  paisesPedidos ??= obtenerPaises()
    .then((r) => r.paises)
    .catch(() => {
      paisesPedidos = null;
      return [];
    });
  return paisesPedidos;
}

/**
 * Buscador único de la aplicación. Mientras se escribe propone ciudades del índice propio y
 * países del catálogo, sin pedir acentos ni mayúsculas. Al enviar: si el texto es exactamente
 * una ciudad, lleva directo a ese lugar; si no, abre los resultados del catálogo.
 */
export function Buscador({ lugares, inicial = '', compacto = false, listo }: Props) {
  const [texto, setTexto] = useState(inicial);
  const [aviso, setAviso] = useState<string | null>(null);
  const [paises, setPaises] = useState<Pais[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [activa, setActiva] = useState(-1);
  const campo = useRef<HTMLInputElement>(null);
  const idCampo = useId();
  const idAviso = useId();
  const idLista = useId();

  useEffect(() => {
    setTexto(inicial);
  }, [inicial]);

  // Los países se piden en cuanto hay intención de buscar, no al cargar la página.
  useEffect(() => {
    if (texto.trim().length < 2 || paises.length > 0) return;
    let vigente = true;
    paisesDelCatalogo().then((lista) => {
      if (vigente) setPaises(lista);
    });
    return () => {
      vigente = false;
    };
  }, [texto, paises.length]);

  const lista = useMemo(() => (listo ? calcularSugerencias(texto, lugares, paises) : []), [texto, lugares, paises, listo]);
  const visible = abierto && lista.length > 0;
  const elegida = visible && activa >= 0 ? lista[activa] : undefined;

  function ir(sugerencia: Sugerencia) {
    setAbierto(false);
    setActiva(-1);
    if (sugerencia.tipo === 'lugar') {
      setTexto(sugerencia.lugar.nombre);
      navegar({ tipo: 'lugar', id: sugerencia.lugar.id });
      return;
    }
    setTexto(sugerencia.nombre);
    navegar({ tipo: 'busqueda', q: sugerencia.nombre, pais: sugerencia.codigo });
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (elegida) {
      ir(elegida);
      return;
    }
    const limpio = texto.replace(/\s+/g, ' ').trim();
    if (limpio.length < 2) {
      setAviso('Escribe al menos dos letras: una ciudad, un país o un estilo.');
      return;
    }
    setAviso(null);
    setAbierto(false);
    const lugar = lugarExacto(limpio, lugares);
    navegar(lugar ? { tipo: 'lugar', id: lugar.id } : { tipo: 'busqueda', q: limpio });
  }

  function teclas(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === 'Escape') {
      setAbierto(false);
      setActiva(-1);
      return;
    }
    if (lista.length === 0) return;
    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault();
      setAbierto(true);
      const paso = evento.key === 'ArrowDown' ? 1 : -1;
      setActiva((previa) => {
        const siguiente = previa + paso;
        if (siguiente < -1) return lista.length - 1;
        if (siguiente >= lista.length) return -1;
        return siguiente;
      });
    }
  }

  return (
    <form
      className={`buscador ${compacto ? 'buscador--compacto' : ''}`}
      onSubmit={enviar}
      role="search"
      aria-describedby={aviso ? idAviso : undefined}
    >
      <label className="visualmente-oculto" htmlFor={idCampo}>
        Buscar una ciudad, un país o un estilo. Los acentos dan igual.
      </label>
      {compacto && (
        <span className="buscador__lupa" aria-hidden="true">
          <IconoLupa />
        </span>
      )}
      <input
        id={idCampo}
        ref={campo}
        className="buscador__campo"
        type="text"
        inputMode="search"
        autoComplete="off"
        enterKeyHint="search"
        role="combobox"
        aria-expanded={visible}
        aria-controls={idLista}
        aria-autocomplete="list"
        aria-activedescendant={elegida ? `${idLista}-${activa}` : undefined}
        placeholder={listo ? 'Lisboa, Japón, jazz…' : 'Cargando…'}
        value={texto}
        maxLength={MAX_CONSULTA}
        disabled={!listo}
        onChange={(e) => {
          setTexto(e.target.value);
          setAbierto(true);
          setActiva(-1);
          if (aviso) setAviso(null);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => window.setTimeout(() => setAbierto(false), 120)}
        onKeyDown={teclas}
      />
      <button className={`boton ${compacto ? 'boton--secundario' : 'boton--principal'}`} type="submit" disabled={!listo}>
        {compacto ? 'Buscar' : 'Explorar'}
      </button>
      <ul className={`sugerencias ${visible ? '' : 'sugerencias--ocultas'}`} id={idLista} role="listbox" aria-label="Sugerencias">
        {lista.map((sugerencia, indice) => (
          <li
            key={sugerencia.clave}
            id={`${idLista}-${indice}`}
            role="option"
            aria-selected={indice === activa}
            className={`sugerencia ${indice === activa ? 'sugerencia--activa' : ''}`}
            // Con pointerdown se llega antes que al blur del campo, que cerraría la lista.
            onPointerDown={(e) => {
              e.preventDefault();
              ir(sugerencia);
            }}
            onMouseEnter={() => setActiva(indice)}
          >
            <span className="sugerencia__texto">{sugerencia.texto}</span>
            <span className="sugerencia__detalle">{sugerencia.detalle}</span>
          </li>
        ))}
      </ul>
      {aviso && (
        <p id={idAviso} className="buscador__aviso" role="status">
          {aviso}
        </p>
      )}
    </form>
  );
}
