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
  ubicacionSegunCatalogo: string;
}

export interface RespuestaDestinos {
  destinos: Destino[];
  nota: string;
}

export interface RespuestaEmisoras {
  destino: Destino;
  emisoras: Emisora[];
  origen: 'catalogo' | 'copia-local';
  copiaLocalDel: string;
  nota: string;
}
