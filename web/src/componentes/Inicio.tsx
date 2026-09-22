import { useAlmacen } from '../almacen/useAlmacen';
import type { EstadoIndice } from '../App';
import { navegar } from '../util/ruta';
import { Buscador } from './Buscador';
import { IconoRadio } from './Iconos';

interface Props {
  indice: EstadoIndice;
  alReintentar: () => void;
  alSorprender: () => void;
  alSorprenderDeNoche: () => void;
}

export function Inicio({ indice, alReintentar, alSorprender, alSorprenderDeNoche }: Props) {
  const { favoritas, recientes, disponible } = useAlmacen();
  const listo = indice.estado === 'listo';

  return (
    <main className="inicio">
      <header className="inicio__cabecera">
        <span className="marca" aria-label="RadioPirata">
          <IconoRadio />
          <span className="marca__texto">RadioPirata</span>
        </span>
        <nav className="inicio__atajos" aria-label="Lo tuyo">
          <button type="button" className="enlace" onClick={() => navegar({ tipo: 'paises' })}>
            Noticias
          </button>
          {disponible && recientes.length > 0 && (
            <button type="button" className="enlace" onClick={() => navegar({ tipo: 'recientes' })}>
              Recientes
            </button>
          )}
          {disponible && (
            <button type="button" className="enlace" onClick={() => navegar({ tipo: 'favoritas' })}>
              Mis favoritas{favoritas.length > 0 ? ` (${favoritas.length})` : ''}
            </button>
          )}
        </nav>
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
              // Los destinos comprobados a mano son las emisoras memorizadas del aparato:
              // por eso llevan la misma tecla que los atajos de la cabecera.
              <button key={d.id} type="button" className="tecla tecla--grande" onClick={() => navegar({ tipo: 'lugar', id: d.id })}>
                <span className="tecla__texto">{d.nombre}</span>
              </button>
            ))}
          </div>
        )}

        <div className="inicio__sorpresas">
          <button type="button" className="boton boton--secundario" onClick={alSorprender} disabled={!listo}>
            Sorpréndeme
          </button>
          <button
            type="button"
            className="boton boton--secundario"
            onClick={alSorprenderDeNoche}
            disabled={!listo}
            title="Una ciudad del índice donde ahora mismo es de noche"
          >
            Donde ya es de noche
          </button>
        </div>

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
