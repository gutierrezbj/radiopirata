import { useEffect, useState } from 'react';
import { fraseHora, horaLocal } from './hora';

/** Hora local de una zona, actualizada cada medio minuto. Null si no hay zona o no se conoce. */
export function useHoraLocal(zona: string | null | undefined): { hora: string | null; frase: string | null } {
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    if (!zona) return;
    setAhora(new Date());
    const intervalo = setInterval(() => setAhora(new Date()), 30_000);
    return () => clearInterval(intervalo);
  }, [zona]);

  if (!zona) return { hora: null, frase: null };
  return { hora: horaLocal(zona, ahora), frase: fraseHora(zona, ahora) };
}
