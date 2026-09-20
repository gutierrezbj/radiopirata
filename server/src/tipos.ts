export interface Coordenadas {
  lat: number;
  lng: number;
}

export interface Destino {
  id: string;
  nombre: string;
  pais: string;
  alias: string[];
  coordenadas: Coordenadas;
}

/** Entrada del índice propio de ciudades. Las coordenadas enfocan el globo, no sitúan emisoras. */
export interface Ciudad {
  id: string;
  nombre: string;
  pais: string;
  codigoPais: string;
  coordenadas: Coordenadas;
  /** Nombres con los que el catálogo suele etiquetar el lugar; se usan para consultarlo. */
  alias: string[];
}

export interface Emisora {
  id: string;
  nombre: string;
  destinoId: string;
  pais: string;
  codigoPais: string;
  idioma: string;
  etiquetas: string[];
  url: string;
  web: string | null;
  codec: string;
  bitrate: number;
  coordenadas: Coordenadas | null;
  /** Texto literal del campo `state` de Radio Browser: es la evidencia de ubicación, no una comprobación propia. */
  ubicacionSegunCatalogo: string;
  /** Solo para las emisoras de la selección E1, comprobadas a mano con fecha. */
  verificada?: boolean;
}

export interface Seleccion {
  version: number;
  generadaEl: string;
  fuente: string;
  destinos: Destino[];
  emisoras: Emisora[];
}
