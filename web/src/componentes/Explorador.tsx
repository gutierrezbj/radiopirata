import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { almacen } from '../almacen/local';
import { useAlmacen } from '../almacen/useAlmacen';
import { buscar, obtenerEmisora, obtenerEmisorasDeLugar } from '../api/cliente';
import { reproducirDesde } from '../audio/reproducir';
import { useAudio } from '../audio/useAudio';
import type { EstadoIndice } from '../App';
import type { Emisora, Lugar, RespuestaBusqueda, RespuestaLugar } from '../tipos';
import { filtrarPorEtiqueta, filtrosDe } from '../util/filtros';
import { lugarDeEmisora } from '../util/lugar';
import { claveDeRuta, navegar, type Ruta } from '../util/ruta';
import { hayWebGL } from '../util/entorno';
import { Buscador } from './Buscador';
import { IconoRadio } from './Iconos';
import { PanelEmisoras, type ContenidoPanel } from './PanelEmisoras';

const Globo = lazy(() => import('./Globo').then((m) => ({ default: m.Globo })));

type Remoto =
  | { estado: 'local' }
  | { estado: 'cargando' }
  | { estado: 'error'; mensaje: string }
  | { estado: 'lugar'; datos: RespuestaLugar }
  | { estado: 'busqueda'; datos: RespuestaBusqueda; emisoras: Emisora[] }
  | { estado: 'emisora'; emisora: Emisora };

interface Props {
  ruta: Exclude<Ruta, { tipo: 'inicio' }>;
  indice: EstadoIndice;
  sorpresa: boolean;
  alConsumirSorpresa: () => void;
  alSorprender: () => void;
}

export function Explorador({ ruta, indice, sorpresa, alConsumirSorpresa, alSorprender }: Props) {
  const clave = claveDeRuta(ruta);
  const [remoto, setRemoto] = useState<Remoto>({ estado: 'cargando' });
  const [etiqueta, setEtiqueta] = useState<string | null>(null);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [intento, setIntento] = useState(0);
  const [hover, setHover] = useState<Lugar | null>(null);
  const [conWebGL] = useState(() => hayWebGL());
  const audioEstado = useAudio();
  const datosAlmacen = useAlmacen();
  const sorpresaPendiente = useRef(false);
  if (sorpresa) sorpresaPendiente.current = true;

  // Cada cambio de ruta cancela la carga anterior: una respuesta atrasada nunca pisa a la actual.
  useEffect(() => {
    setEtiqueta(null);
    if (ruta.tipo === 'favoritas' || ruta.tipo === 'recientes') {
      setRemoto({ estado: 'local' });
      return;
    }
    const control = new AbortController();
    setRemoto({ estado: 'cargando' });
    const peticion =
      ruta.tipo === 'lugar'
        ? obtenerEmisorasDeLugar(ruta.id, control.signal).then((datos): Remoto => ({ estado: 'lugar', datos }))
        : ruta.tipo === 'busqueda'
          ? buscar(ruta.q, 1, ruta.pais, control.signal).then(
              (datos): Remoto => ({ estado: 'busqueda', datos, emisoras: datos.emisoras }),
            )
          : obtenerEmisora(ruta.id, control.signal).then(({ emisora }): Remoto => ({ estado: 'emisora', emisora }));

    peticion
      .then((siguiente) => {
        if (control.signal.aborted) return;
        setRemoto(siguiente);
      })
      .catch((e: unknown) => {
        if (control.signal.aborted) return;
        setRemoto({ estado: 'error', mensaje: e instanceof Error ? e.message : 'No se ha podido cargar.' });
      });
    return () => control.abort();
  }, [clave, intento, ruta]);

  // «Sorpréndeme»: al llegar la lista del lugar, suena una al azar. El clic original es la
  // activación de usuario que el navegador necesita para dejar empezar el audio.
  useEffect(() => {
    if (!sorpresaPendiente.current || remoto.estado !== 'lugar') return;
    const candidatas = remoto.datos.emisoras;
    if (candidatas.length === 0) return;
    sorpresaPendiente.current = false;
    alConsumirSorpresa();
    const elegida = candidatas[Math.floor(Math.random() * candidatas.length)];
    if (elegida) reproducirDesde(elegida, candidatas);
  }, [remoto, alConsumirSorpresa]);

  const contenido = useMemo(
    () => construirContenido(ruta, remoto, datosAlmacen.favoritas, datosAlmacen.recientes),
    [ruta, remoto, datosAlmacen],
  );
  const filtros = useMemo(() => filtrosDe(contenido.emisoras), [contenido.emisoras]);
  const visibles = useMemo(() => filtrarPorEtiqueta(contenido.emisoras, etiqueta), [contenido.emisoras, etiqueta]);

  const elegir = useCallback((emisora: Emisora) => reproducirDesde(emisora, visibles), [visibles]);
  const alternarFavorita = useCallback((emisora: Emisora) => almacen.alternarFavorita(emisora), []);
  const esFavorita = useCallback((id: string) => datosAlmacen.favoritas.some((e) => e.id === id), [datosAlmacen.favoritas]);

  const verMas = useCallback(() => {
    if (remoto.estado !== 'busqueda' || !remoto.datos.hayMas || cargandoMas) return;
    setCargandoMas(true);
    buscar(remoto.datos.consulta, remoto.datos.pagina + 1, ruta.tipo === 'busqueda' ? ruta.pais : undefined)
      .then((datos) => {
        setRemoto((previo) =>
          previo.estado === 'busqueda' && previo.datos.consulta === datos.consulta
            ? { estado: 'busqueda', datos, emisoras: [...previo.emisoras, ...datos.emisoras] }
            : previo,
        );
      })
      .catch(() => undefined)
      .finally(() => setCargandoMas(false));
  }, [remoto, cargandoMas, ruta]);

  // El lugar sale del índice que ya está cargado, así que el globo se mueve sin esperar a las emisoras.
  const lugarEnfocado = useMemo(() => {
    if (ruta.tipo !== 'lugar') return null;
    return indice.lugares.find((l) => l.id === ruta.id) ?? (remoto.estado === 'lugar' ? remoto.datos.lugar : null);
  }, [ruta, indice.lugares, remoto]);
  const estadoPanel = remoto.estado === 'cargando' ? 'cargando' : remoto.estado === 'error' ? 'error' : 'listo';

  return (
    <div className="explorador">
      <header className="explorador__cabecera">
        <button type="button" className="marca marca--boton" onClick={() => navegar({ tipo: 'inicio' })}>
          <IconoRadio />
          <span className="marca__texto">RadioPirata</span>
          <span className="visualmente-oculto">Volver al inicio</span>
        </button>
        <Buscador
          lugares={indice.lugares}
          listo={indice.estado === 'listo'}
          compacto
          inicial={ruta.tipo === 'busqueda' ? ruta.q : ''}
        />
        {datosAlmacen.disponible && (
          <nav className="explorador__atajos" aria-label="Lo tuyo">
            {datosAlmacen.recientes.length > 0 && (
              <button
                type="button"
                className="ficha ficha--pequena"
                aria-current={ruta.tipo === 'recientes' ? 'true' : undefined}
                onClick={() => navegar({ tipo: 'recientes' })}
              >
                Recientes
              </button>
            )}
            <button
              type="button"
              className="ficha ficha--pequena"
              aria-current={ruta.tipo === 'favoritas' ? 'true' : undefined}
              onClick={() => navegar({ tipo: 'favoritas' })}
            >
              Favoritas{datosAlmacen.favoritas.length > 0 ? ` (${datosAlmacen.favoritas.length})` : ''}
            </button>
          </nav>
        )}
      </header>

      <div className="explorador__cuerpo">
        <PanelEmisoras
          estado={estadoPanel}
          mensajeError={remoto.estado === 'error' ? remoto.mensaje : null}
          contenido={{ ...contenido, emisoras: visibles, hayMas: contenido.hayMas && etiqueta === null }}
          filtros={filtros}
          etiqueta={etiqueta}
          emisoraActual={audioEstado.emisora}
          estadoAudio={audioEstado.estado}
          hayFavoritas={datosAlmacen.disponible}
          avisoAlmacen={
            datosAlmacen.disponible
              ? null
              : 'Este navegador no deja guardar nada en el dispositivo, así que favoritas y recientes están desactivadas.'
          }
          cargandoMas={cargandoMas}
          esFavorita={esFavorita}
          alElegirEtiqueta={setEtiqueta}
          alElegir={elegir}
          alAlternarFavorita={alternarFavorita}
          alVerMas={verMas}
          alReintentar={() => setIntento((n) => n + 1)}
          acciones={acciones(ruta, remoto, alSorprender)}
        />

        <section className="escena" aria-label="Globo terráqueo">
          {conWebGL ? (
            <Suspense fallback={<p className="escena__aviso">Preparando el globo…</p>}>
              <Globo
                lugares={indice.lugares}
                lugarEnfocado={lugarEnfocado}
                emisoras={visibles}
                alElegirLugar={(lugar) => navegar({ tipo: 'lugar', id: lugar.id })}
                alPasarPorLugar={setHover}
              />
            </Suspense>
          ) : (
            <div className="escena__sin-webgl">
              <p>Tu navegador no puede dibujar el globo, pero puedes buscar y escuchar desde la lista.</p>
            </div>
          )}
          {hover && hover.id !== lugarEnfocado?.id && (
            <p className="escena__pista" role="status">
              {hover.nombre}, {hover.pais} · toca para abrir
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function acciones(ruta: Props['ruta'], remoto: Remoto, alSorprender: () => void): React.ReactNode {
  if (ruta.tipo === 'lugar' && remoto.estado === 'lugar') {
    return (
      <div className="panel__acciones">
        <button
          type="button"
          className="boton boton--secundario"
          onClick={() =>
            navegar({ tipo: 'busqueda', q: remoto.datos.lugar.pais, pais: remoto.datos.lugar.codigoPais })
          }
        >
          Ver emisoras de {remoto.datos.lugar.pais}
        </button>
        <button type="button" className="boton boton--secundario" onClick={alSorprender}>
          Sorpréndeme
        </button>
      </div>
    );
  }
  if (ruta.tipo === 'emisora' && remoto.estado === 'emisora') {
    const { pais, codigoPais } = remoto.emisora;
    return (
      <div className="panel__acciones">
        {pais.length > 1 && (
          <button
            type="button"
            className="boton boton--secundario"
            onClick={() => navegar({ tipo: 'busqueda', q: pais, ...(codigoPais ? { pais: codigoPais } : {}) })}
          >
            Más emisoras de {pais}
          </button>
        )}
        <button type="button" className="boton boton--secundario" onClick={alSorprender}>
          Sorpréndeme
        </button>
      </div>
    );
  }
  if (ruta.tipo === 'favoritas' || ruta.tipo === 'recientes') {
    return (
      <button type="button" className="boton boton--secundario" onClick={alSorprender}>
        Sorpréndeme
      </button>
    );
  }
  return null;
}

function construirContenido(ruta: Props['ruta'], remoto: Remoto, favoritas: Emisora[], recientes: Emisora[]): ContenidoPanel {
  const vacio: ContenidoPanel = {
    titulo: '',
    subtitulo: null,
    nota: null,
    emisoras: [],
    lugaresSugeridos: [],
    conLugar: false,
    vacio: null,
    hayMas: false,
  };

  switch (ruta.tipo) {
    case 'favoritas':
      return {
        ...vacio,
        titulo: 'Mis favoritas',
        subtitulo: favoritas.length > 0 ? `${favoritas.length} guardadas en este dispositivo` : null,
        emisoras: favoritas,
        conLugar: true,
        vacio: 'Todavía no has guardado ninguna. Pulsa la estrella de una emisora para tenerla aquí.',
        nota: favoritas.length > 0 ? 'Se guardan solo en este navegador; no viajan a otros dispositivos.' : null,
      };
    case 'recientes':
      return {
        ...vacio,
        titulo: 'Recientes',
        subtitulo: recientes.length > 0 ? 'Lo último que has escuchado en este dispositivo' : null,
        emisoras: recientes,
        conLugar: true,
        vacio: 'Aquí aparecerá lo que vayas escuchando.',
        nota: recientes.length > 0 ? 'Se apunta una emisora cuando empieza a sonar de verdad.' : null,
      };
    case 'lugar':
      if (remoto.estado !== 'lugar') return { ...vacio, titulo: 'Cargando…' };
      return {
        ...vacio,
        titulo: remoto.datos.lugar.nombre,
        subtitulo: remoto.datos.lugar.pais,
        emisoras: remoto.datos.emisoras,
        // La nota explica la lista; si no hay lista, ese mismo texto es el estado vacío y no se repite.
        nota: remoto.datos.emisoras.length > 0 ? remoto.datos.nota : null,
        vacio: remoto.datos.nota,
      };
    case 'busqueda':
      if (remoto.estado !== 'busqueda') return { ...vacio, titulo: `«${ruta.q}»` };
      return {
        ...vacio,
        titulo: `«${remoto.datos.consulta}»`,
        subtitulo:
          remoto.emisoras.length > 0 ? `${remoto.emisoras.length} de ${remoto.datos.total} emisoras del catálogo` : null,
        emisoras: remoto.emisoras,
        lugaresSugeridos: remoto.datos.lugares,
        conLugar: true,
        nota: remoto.emisoras.length > 0 ? remoto.datos.nota : null,
        vacio: remoto.datos.nota,
        hayMas: remoto.datos.hayMas,
      };
    case 'emisora':
      if (remoto.estado !== 'emisora') return { ...vacio, titulo: 'Emisora compartida' };
      return {
        ...vacio,
        titulo: remoto.emisora.nombre,
        subtitulo: lugarDeEmisora(remoto.emisora),
        emisoras: [remoto.emisora],
        nota: 'Te han compartido esta emisora. Pulsa para escucharla y sigue explorando desde aquí.',
      };
  }
}
