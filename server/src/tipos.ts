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
}

export interface Seleccion {
  version: number;
  generadaEl: string;
  fuente: string;
  destinos: Destino[];
  emisoras: Emisora[];
}
