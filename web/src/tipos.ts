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

/** Ciudad del índice propio. Sus coordenadas enfocan el globo; no sitúan emisoras. */
export interface Lugar {
  id: string;
  nombre: string;
  pais: string;
  codigoPais: string;
  coordenadas: Coordenadas;
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
  ubicacionSegunCatalogo: string;
  /** Solo las de la selección comprobada a mano. */
  verificada?: boolean;
}

export interface RespuestaDestinos {
  destinos: Destino[];
  verificadasEl: string;
  nota: string;
}

export interface RespuestaLugares {
  lugares: Lugar[];
  nota: string;
}

export interface RespuestaLugar {
  lugar: Lugar;
  emisoras: Emisora[];
  verificadas: number;
  delCatalogo: number;
  nota: string;
}

export interface RespuestaBusqueda {
  consulta: string;
  lugares: Lugar[];
  emisoras: Emisora[];
  pagina: number;
  porPagina: number;
  total: number;
  hayMas: boolean;
  fuentes: { nombre: number; etiqueta: number; pais: number };
  parcial: boolean;
  nota: string;
}
