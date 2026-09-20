import { useId, useState, type FormEvent } from 'react';
import type { EstadoDestinos } from '../App';
import { destinoAlAzar, resolverDestino } from '../util/busqueda';
import { IconoRadio } from './IconoRadio';

interface Props {
  destinos: EstadoDestinos;
  alElegir: (destinoId: string, sorpresa?: boolean) => void;
  alReintentar: () => void;
}

export function Inicio({ destinos, alElegir, alReintentar }: Props) {
  const [texto, setTexto] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);
  const idBuscador = useId();
  const idAviso = useId();
  const listos = destinos.estado === 'listo';
  const nombres = destinos.destinos.map((d) => d.nombre);

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!listos) return;
    const destino = resolverDestino(texto, destinos.destinos);
    if (!destino) {
      setAviso(
        texto.trim().length === 0
          ? `Escribe un destino o elige uno: ${nombres.join(', ')}.`
          : `Todavía no llegamos a «${texto.trim()}». En esta primera versión puedes escuchar ${enumerar(nombres)}.`,
      );
      return;
    }
    setAviso(null);
    alElegir(destino.id);
  }

  function sorprender() {
    const destino = destinoAlAzar(destinos.destinos);
    if (destino) alElegir(destino.id, true);
  }

  return (
    <main className="inicio">
      <header className="inicio__cabecera">
        <span className="marca" aria-label="RadioPirata">
          <IconoRadio />
          <span className="marca__texto">RadioPirata</span>
        </span>
      </header>

      <section className="inicio__centro">
        <h1 className="inicio__pregunta">¿Dónde escuchamos hoy?</h1>
        <p className="inicio__subtitulo">La música siempre es buena compañía.</p>

        <form className="buscador" onSubmit={enviar} role="search" aria-describedby={aviso ? idAviso : undefined}>
          <label className="visualmente-oculto" htmlFor={idBuscador}>
            Destino
          </label>
          <input
            id={idBuscador}
            className="buscador__campo"
            type="text"
            inputMode="search"
            autoComplete="off"
            enterKeyHint="go"
            placeholder={listos ? 'Tokio, Caracas o Lisboa' : 'Cargando destinos…'}
            value={texto}
            maxLength={60}
            disabled={!listos}
            onChange={(e) => {
              setTexto(e.target.value);
              if (aviso) setAviso(null);
            }}
          />
          <button className="boton boton--principal" type="submit" disabled={!listos}>
            Explorar
          </button>
        </form>

        {aviso && (
          <p id={idAviso} className="aviso" role="status">
            {aviso}
          </p>
        )}

        {destinos.estado === 'error' && (
          <p className="aviso aviso--error" role="alert">
            {destinos.error}{' '}
            <button type="button" className="enlace" onClick={alReintentar}>
              Reintentar
            </button>
          </p>
        )}

        {listos && (
          <div className="inicio__destinos" aria-label="Destinos disponibles">
            {destinos.destinos.map((d) => (
              <button key={d.id} type="button" className="ficha" onClick={() => alElegir(d.id)}>
                {d.nombre}
              </button>
            ))}
          </div>
        )}

        <button type="button" className="boton boton--secundario inicio__sorpresa" onClick={sorprender} disabled={!listos}>
          Sorpréndeme
        </button>

        {listos && <p className="inicio__nota">{destinos.nota}</p>}
      </section>

      <div className="horizonte" aria-hidden="true" />
    </main>
  );
}

function enumerar(nombres: string[]): string {
  if (nombres.length <= 1) return nombres.join('');
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}
