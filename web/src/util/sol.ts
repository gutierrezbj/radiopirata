/**
 * Dónde está el sol ahora mismo, calculado con la fecha y sin ninguna fuente externa.
 * Sirve para oscurecer la mitad del globo que está de noche y para saber en qué ciudades
 * ya es de noche. Fórmulas simplificadas de la NOAA: error de un grado, de sobra para esto.
 */
export interface PuntoSubsolar {
  lat: number;
  lng: number;
}

const GRADOS = 180 / Math.PI;
const RADIANES = Math.PI / 180;

function diaDelAno(fecha: Date): number {
  const inicio = Date.UTC(fecha.getUTCFullYear(), 0, 1);
  return Math.floor((fecha.getTime() - inicio) / 86_400_000) + 1;
}

function anguloFraccional(fecha: Date): number {
  const horas = fecha.getUTCHours() + fecha.getUTCMinutes() / 60 + fecha.getUTCSeconds() / 3600;
  const diasDelAno = fecha.getUTCFullYear() % 4 === 0 ? 366 : 365;
  return ((2 * Math.PI) / diasDelAno) * (diaDelAno(fecha) - 1 + (horas - 12) / 24);
}

/** Punto de la Tierra que tiene el sol justo encima. */
export function puntoSubsolar(fecha: Date): PuntoSubsolar {
  const g = anguloFraccional(fecha);
  const declinacion =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g);
  const ecuacionDelTiempo =
    229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const horasUtc = fecha.getUTCHours() + fecha.getUTCMinutes() / 60 + fecha.getUTCSeconds() / 3600;
  let lng = -15 * (horasUtc + ecuacionDelTiempo / 60 - 12);
  lng = ((((lng + 180) % 360) + 360) % 360) - 180;
  return { lat: declinacion * GRADOS, lng };
}

/** Altura del sol sobre el horizonte en un punto, en grados. Negativa cuando ya se ha puesto. */
export function elevacionSolar(lat: number, lng: number, fecha: Date): number {
  const sol = puntoSubsolar(fecha);
  const anguloHorario = (lng - sol.lng) * RADIANES;
  const seno =
    Math.sin(lat * RADIANES) * Math.sin(sol.lat * RADIANES) +
    Math.cos(lat * RADIANES) * Math.cos(sol.lat * RADIANES) * Math.cos(anguloHorario);
  return Math.asin(Math.max(-1, Math.min(1, seno))) * GRADOS;
}

/** Noche de verdad: el sol más de seis grados bajo el horizonte, pasado el crepúsculo civil. */
export function esDeNoche(lat: number, lng: number, fecha: Date = new Date()): boolean {
  return elevacionSolar(lat, lng, fecha) < -6;
}

/**
 * Posición del sol en la escena del globo, con el mismo criterio de ejes que usa la librería
 * (radio 100, latitud hacia arriba, longitud cero mirando al espectador).
 */
export function posicionDelSol(fecha: Date, distancia = 500): { x: number; y: number; z: number } {
  const { lat, lng } = puntoSubsolar(fecha);
  const phi = (90 - lat) * RADIANES;
  const theta = (90 - lng) * RADIANES;
  return {
    x: distancia * Math.sin(phi) * Math.cos(theta),
    y: distancia * Math.cos(phi),
    z: distancia * Math.sin(phi) * Math.sin(theta),
  };
}
