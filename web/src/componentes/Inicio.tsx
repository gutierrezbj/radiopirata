import { useAlmacen } from '../almacen/useAlmacen';
import type { EstadoIndice } from '../App';
import { navegar } from '../util/ruta';
import { Buscador } from './Buscador';
import { IconoRadio } from './Iconos';

interface Props {
  indice: EstadoIndice;
  alReintentar: () => void;
  alSorprender: () => void;
}

export function Inicio({ indice, alReintentar, alSorprender }: Props) {
  const { favoritas, recientes, disponible } = useAlmacen();
  const listo = indice.estado === 'listo';

  return (
    <main className="inicio">
      <header className="inicio__cabecera">
        <span className="marca" aria-label="RadioPirata">
          <IconoRadio />
          <span className="marca__texto">RadioPirata</span>
        </span>
        {disponible && (
          <nav className="inicio__atajos" aria-label="Lo tuyo">
            {recientes.length > 0 && (
              <button type="button" className="enlace" onClick={() => navegar({ tipo: 'recientes' })}>
                Recientes
              </button>
            )}
            <button type="button" className="enlace" onClick={() => navegar({ tipo: 'favoritas' })}>
              Mis favoritas{favoritas.length > 0 ? ` (${favoritas.length})` : ''}
            </button>
          </nav>
        )}
      </header>

      <section className="inicio__centro">
        <h1 className="inicio__pregunta">¿Dónde escuchamos hoy?</h1>
        <p className="inicio__subtitulo">La música siempre es buena compañía.</p>

        <Buscador lugares={indice.lugares} listo={listo} />

        {indice.estado === 'error' && (
          <p className="aviso aviso--error" role="alert">
            {indice.error}{' '}
            <button type="button" className="enlace" onClick={alReintentar}>
              Reintentar
            </button>
          </p>
        )}

        {listo && indice.destinos.length > 0 && (
          <div className="inicio__destinos" aria-label="Destinos comprobados a mano">
            {indice.destinos.map((d) => (
              <button key={d.id} type="button" className="ficha" onClick={() => navegar({ tipo: 'lugar', id: d.id })}>
                {d.nombre}
              </button>
            ))}
          </div>
        )}

        <button type="button" className="boton boton--secundario inicio__sorpresa" onClick={alSorprender} disabled={!listo}>
          Sorpréndeme
        </button>

        {listo && (
          <p className="inicio__nota">
            Busca cualquier ciudad, país o estilo del catálogo. {indice.lugares.length} ciudades con coordenadas propias y una
            selección comprobada a mano en Tokio, Caracas y Lisboa.
          </p>
        )}
      </section>

      <div className="horizonte" aria-hidden="true" />
    </main>
  );
}
