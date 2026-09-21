import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Pais } from '../tipos';
import { normalizar } from '../util/entorno';
import { nombrePais } from '../util/lugar';
import { huboNavegacion, navegar } from '../util/ruta';

interface Props {
  estado: 'cargando' | 'listo' | 'error';
  paises: Pais[];
  mensajeError: string | null;
  alReintentar: () => void;
}

/**
 * Elegir un país para escuchar su radio informativa. La lista es la del catálogo, con su
 * recuento real de emisoras; el nombre en español lo pone el navegador.
 */
export function PanelPaises({ estado, paises, mensajeError, alReintentar }: Props) {
  const [filtro, setFiltro] = useState('');
  const idFiltro = useId();
  const titulo = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (huboNavegacion()) titulo.current?.focus();
  }, []);

  const nombrados = useMemo(
    () =>
      paises
        .map((p) => ({ ...p, nombre: nombrePais(p.codigo, p.codigo) }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [paises],
  );
  const visibles = useMemo(() => {
    const q = normalizar(filtro);
    if (q.length === 0) return nombrados;
    return nombrados.filter((p) => normalizar(p.nombre).includes(q) || p.codigo.toLowerCase() === q);
  }, [nombrados, filtro]);

  return (
    <aside className="panel" aria-labelledby="panel-titulo">
      <div className="panel__cabecera">
        <h2 id="panel-titulo" className="panel__titulo" ref={titulo} tabIndex={-1}>
          Noticias del mundo
        </h2>
        <p className="panel__pais">Elige un país y escucha lo que pasa allí.</p>
      </div>

      {estado === 'cargando' && (
        <p className="panel__estado" role="status">
          Cargando países…
        </p>
      )}

      {estado === 'error' && (
        <div className="panel__estado" role="alert">
          <p>{mensajeError}</p>
          <button type="button" className="boton boton--secundario" onClick={alReintentar}>
            Reintentar
          </button>
        </div>
      )}

      {estado === 'listo' && (
        <>
          <div className="paises__filtro">
            <label className="visualmente-oculto" htmlFor={idFiltro}>
              Buscar país
            </label>
            <input
              id={idFiltro}
              type="text"
              inputMode="search"
              autoComplete="off"
              placeholder="Venezuela, Francia, Arabia Saudí…"
              value={filtro}
              maxLength={40}
              onChange={(e) => setFiltro(e.target.value)}
            />
          </div>
          {visibles.length === 0 ? (
            <p className="panel__estado">Ningún país del catálogo se llama así.</p>
          ) : (
            <ul className="paises">
              {visibles.map((p) => (
                <li key={p.codigo}>
                  <button type="button" className="pais" onClick={() => navegar({ tipo: 'noticias', pais: p.codigo })}>
                    <span className="pais__nombre">{p.nombre}</span>
                    <span className="pais__cuenta">{p.emisoras} emisoras</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="panel__nota">
            {nombrados.length} países con emisoras en el catálogo. Dentro de cada uno se muestran las que el catálogo o su nombre
            presentan como informativas.
          </p>
        </>
      )}
    </aside>
  );
}
