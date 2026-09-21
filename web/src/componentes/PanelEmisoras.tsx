import { useEffect, useRef } from 'react';
import type { EstadoReproduccion } from '../audio/controlador';
import type { Emisora, Lugar } from '../tipos';
import type { Filtro } from '../util/filtros';
import { huboNavegacion, navegar } from '../util/ruta';
import { ListaEmisoras } from './ListaEmisoras';

export interface ContenidoPanel {
  titulo: string;
  subtitulo: string | null;
  nota: string | null;
  emisoras: Emisora[];
  /** Ciudades del índice propio relacionadas con la búsqueda. */
  lugaresSugeridos: Lugar[];
  conLugar: boolean;
  vacio: string | null;
  hayMas: boolean;
}

interface Props {
  estado: 'cargando' | 'listo' | 'error';
  mensajeError: string | null;
  /** Cambia con la vista: sirve para llevar el foco al título al navegar. */
  claveVista: string;
  contenido: ContenidoPanel;
  /** «Allí son las 22:14, por la noche.» Solo cuando se sabe la zona horaria del lugar. */
  hora?: string | null;
  filtros: Filtro[];
  etiqueta: string | null;
  emisoraActual: Emisora | null;
  estadoAudio: EstadoReproduccion;
  hayFavoritas: boolean;
  avisoAlmacen: string | null;
  cargandoMas: boolean;
  esFavorita: (id: string) => boolean;
  alElegirEtiqueta: (etiqueta: string | null) => void;
  alElegir: (emisora: Emisora) => void;
  alAlternarFavorita: (emisora: Emisora) => void;
  alVerMas: () => void;
  alReintentar: () => void;
  acciones?: React.ReactNode;
}

export function PanelEmisoras({
  estado,
  mensajeError,
  claveVista,
  contenido,
  hora = null,
  filtros,
  etiqueta,
  emisoraActual,
  estadoAudio,
  hayFavoritas,
  avisoAlmacen,
  cargandoMas,
  esFavorita,
  alElegirEtiqueta,
  alElegir,
  alAlternarFavorita,
  alVerMas,
  alReintentar,
  acciones,
}: Props) {
  const titulo = useRef<HTMLHeadingElement>(null);

  // Al cambiar de vista el foco pasa al título, para no dejar a quien usa teclado en un botón
  // que ya no existe. A quien acaba de abrir un enlace no se le toca el foco: no ha navegado él.
  useEffect(() => {
    if (huboNavegacion()) titulo.current?.focus();
  }, [claveVista]);

  return (
    <aside className="panel" aria-labelledby="panel-titulo">
      <div className="panel__cabecera">
        <h2 id="panel-titulo" className="panel__titulo" ref={titulo} tabIndex={-1}>
          {contenido.titulo}
        </h2>
        {contenido.subtitulo && <p className="panel__pais">{contenido.subtitulo}</p>}
        {hora && <p className="panel__hora">{hora}</p>}
      </div>

      {estado === 'cargando' && (
        <p className="panel__estado" role="status">
          Buscando emisoras…
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
          {contenido.lugaresSugeridos.length > 0 && (
            <nav className="sugerencias" aria-label="Ciudades que encajan con la búsqueda">
              <p className="sugerencias__titulo">¿Buscabas un lugar?</p>
              <div className="sugerencias__fichas">
                {contenido.lugaresSugeridos.map((lugar) => (
                  <button
                    key={lugar.id}
                    type="button"
                    className="ficha ficha--pequena"
                    onClick={() => navegar({ tipo: 'lugar', id: lugar.id })}
                  >
                    {lugar.nombre}
                    <span className="ficha__pais">{lugar.pais}</span>
                  </button>
                ))}
              </div>
            </nav>
          )}

          {filtros.length > 0 && (
            <div className="filtros" role="group" aria-label="Filtrar por estilo">
              <button
                type="button"
                className="ficha ficha--filtro"
                aria-pressed={etiqueta === null}
                onClick={() => alElegirEtiqueta(null)}
              >
                Todo
              </button>
              {filtros.map((f) => (
                <button
                  key={f.etiqueta}
                  type="button"
                  className="ficha ficha--filtro"
                  aria-pressed={etiqueta === f.etiqueta}
                  onClick={() => alElegirEtiqueta(etiqueta === f.etiqueta ? null : f.etiqueta)}
                >
                  {f.etiqueta} <span className="ficha__cuenta">{f.cuantas}</span>
                </button>
              ))}
            </div>
          )}

          {contenido.emisoras.length === 0 ? (
            <div className="panel__estado">
              <p>{contenido.vacio ?? 'No hay emisoras que mostrar aquí.'}</p>
              {acciones}
            </div>
          ) : (
            <>
              <ListaEmisoras
                emisoras={contenido.emisoras}
                emisoraActual={emisoraActual}
                estadoAudio={estadoAudio}
                hayFavoritas={hayFavoritas}
                esFavorita={esFavorita}
                conLugar={contenido.conLugar}
                alElegir={alElegir}
                alAlternarFavorita={alAlternarFavorita}
              />
              {contenido.hayMas && (
                <button type="button" className="boton boton--secundario panel__mas" onClick={alVerMas} disabled={cargandoMas}>
                  {cargandoMas ? 'Buscando…' : 'Ver más emisoras'}
                </button>
              )}
              {acciones && <div className="panel__acciones">{acciones}</div>}
            </>
          )}

          {contenido.nota && <p className="panel__nota">{contenido.nota}</p>}
          {avisoAlmacen && <p className="panel__nota">{avisoAlmacen}</p>}
        </>
      )}
    </aside>
  );
}
