import type { EstadoReproduccion } from '../audio/controlador';

const RADIO = 33;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

interface Props {
  /** De 0 a 1, sacado de lo que el navegador tiene ya del audio. */
  sintonia: number;
  estado: EstadoReproduccion;
}

/**
 * Anillo de sintonía alrededor del botón de reproducir, como el dial de una radio.
 * Rojo mientras no llega señal, ámbar cuando empieza a entrar y verde cuando suena de verdad.
 * El color nunca va solo: el arco crece y el texto del reproductor dice lo mismo con palabras.
 */
export function DialSintonia({ sintonia, estado }: Props) {
  // En error el anillo se cierra entero en rojo: se ve de un vistazo que ahí no hay nada.
  const fraccion = estado === 'error' ? 1 : Math.min(Math.max(sintonia, 0), 1);
  const arco = fraccion * CIRCUNFERENCIA;

  return (
    <svg className="dial__anillo" viewBox="0 0 72 72" width="72" height="72" aria-hidden="true" focusable="false">
      <circle className="dial__pista" cx="36" cy="36" r={RADIO} />
      <circle
        className={`dial__arco dial__arco--${calidad(sintonia, estado)}`}
        cx="36"
        cy="36"
        r={RADIO}
        transform="rotate(-90 36 36)"
        style={{ strokeDasharray: `${arco} ${CIRCUNFERENCIA}` }}
      />
    </svg>
  );
}

export function calidad(sintonia: number, estado: EstadoReproduccion): 'nula' | 'debil' | 'media' | 'buena' | 'quieta' {
  if (estado === 'error') return 'nula';
  if (estado === 'playing') return 'buena';
  if (estado === 'paused' || estado === 'idle') return 'quieta';
  return sintonia >= 0.6 ? 'media' : 'debil';
}
