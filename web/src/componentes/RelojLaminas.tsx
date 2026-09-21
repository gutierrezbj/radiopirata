import { useEffect, useState } from 'react';
import { prefiereMenosMovimiento } from '../util/entorno';
import { digitosDeHora, fraseHora, horaAqui, horaLocal } from '../util/hora';

/** Lo que tarda una lámina en caer y la siguiente en subir. */
const GIRO_MS = 650;

/**
 * Una lámina de reloj de los de antes: el dígito está partido por la mitad y, al cambiar,
 * la mitad de arriba cae mostrando el nuevo y la de abajo sube detrás. Con menos movimiento
 * pedido en el sistema, el dígito simplemente cambia.
 */
function Lamina({ valor }: { valor: string }) {
  const [mostrado, setMostrado] = useState<string | null>(null);
  const [saliente, setSaliente] = useState<string | null>(null);

  useEffect(() => {
    if (mostrado === valor) return;
    if (prefiereMenosMovimiento()) {
      setMostrado(valor);
      return;
    }
    setSaliente(mostrado ?? '');
    setMostrado(valor);
    const fin = setTimeout(() => setSaliente(null), GIRO_MS);
    return () => clearTimeout(fin);
    // Solo importa el valor que llega; el mostrado se lee en ese momento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);

  const girando = saliente !== null;
  return (
    <span className="lamina" aria-hidden="true">
      <span className="lamina__mitad lamina__mitad--arriba">
        <span className="lamina__texto">{mostrado}</span>
      </span>
      <span className="lamina__mitad lamina__mitad--abajo">
        <span className="lamina__texto">{girando ? saliente : mostrado}</span>
      </span>
      {girando && (
        <>
          <span className="lamina__hoja lamina__hoja--arriba">
            <span className="lamina__texto">{saliente}</span>
          </span>
          <span className="lamina__hoja lamina__hoja--abajo">
            <span className="lamina__texto">{mostrado}</span>
          </span>
        </>
      )}
    </span>
  );
}

interface PropsReloj {
  hora: string;
  etiqueta: string;
  detalle?: string | null;
}

export function RelojLaminas({ hora, etiqueta, detalle = null }: PropsReloj) {
  const digitos = digitosDeHora(hora);
  return (
    <div className="reloj-bloque">
      <p className="reloj-bloque__etiqueta">
        {etiqueta}
        {detalle && <span className="reloj-bloque__detalle">, {detalle}</span>}
      </p>
      <div className="reloj">
        {digitos.map((d, i) => (
          <span key={i} className="reloj__grupo">
            {i === 2 && <span className="reloj__separador" aria-hidden="true" />}
            <Lamina valor={d} />
          </span>
        ))}
      </div>
    </div>
  );
}

interface PropsAlliAqui {
  zona: string;
  nombreLugar: string;
}

/**
 * Dos relojes: el de allí, con la zona de la ciudad del índice, y el de aquí, con la del
 * propio navegador. Se comprueba cada segundo pero solo cambia cuando cambia el minuto.
 */
export function RelojesAlliAqui({ zona, nombreLugar }: PropsAlliAqui) {
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    const tic = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(tic);
  }, []);

  const alli = horaLocal(zona, ahora);
  if (alli === null) return null;
  const aqui = horaAqui(ahora);
  const frase = fraseHora(zona, ahora);
  const momento = frase?.match(/, ([^.]+)\.$/)?.[1] ?? null;

  return (
    <div className="relojes" role="group" aria-label={`${frase ?? `Allí son las ${alli}.`} Aquí son las ${aqui}.`}>
      <RelojLaminas hora={alli} etiqueta={`Allí, en ${nombreLugar}`} detalle={momento} />
      <RelojLaminas hora={aqui} etiqueta="Aquí" />
    </div>
  );
}
