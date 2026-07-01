// ============================================
// CineStar Barrio — TypeScript Interfaces
// ============================================

export interface Usuario {
  ID: number;
  USERNAME: string;
  PASSWORD_HASH: string;
  NOMBRE_COMPLETO: string;
  ROL: 'ADMIN' | 'OPERADOR';
  ACTIVO: number;
  FECHA_CREACION: Date;
  FECHA_ACTUALIZACION: Date;
}

export interface Pelicula {
  ID: number;
  TITULO: string;
  DURACION_MIN: number;
  CLASIFICACION: string;
  SINOPSIS: string;
  GENERO: string;
  POSTER_URL: string | null;
  ACTIVO: number;
  FECHA_CREACION: Date;
}

export interface Sala {
  ID: number;
  NOMBRE: string;
  CAPACIDAD: number;
  ACTIVO: number;
  FECHA_CREACION: Date;
}

export interface Asiento {
  ID: number;
  SALA_ID: number;
  FILA: string;
  NUMERO: number;
  TIPO: 'NORMAL' | 'SILLA_RUEDAS';
  SECCION: 'PRINCIPAL' | 'LATERAL';
  ACTIVO: number;
}

export interface Funcion {
  ID: number;
  PELICULA_ID: number;
  SALA_ID: number;
  FECHA: Date;
  HORA_INICIO: Date;
  HORA_FIN: Date;
  PRECIO: number;
  ESTADO: 'PROGRAMADA' | 'EN_CURSO' | 'FINALIZADA' | 'CANCELADA';
  FECHA_CREACION: Date;
  // Joined fields
  PELICULA_TITULO?: string;
  SALA_NOMBRE?: string;
  DURACION_MIN?: number;
  CLASIFICACION?: string;
  GENERO?: string;
}

export interface Reserva {
  ID: number;
  FUNCION_ID: number;
  USUARIO_ID: number;
  CODIGO_BOLETO: string;
  NOMBRE_CLIENTE: string;
  TELEFONO_CLIENTE: string | null;
  CANAL: 'TAQUILLA' | 'TELEFONICA';
  ESTADO: 'RESERVADA' | 'VENDIDA' | 'CANCELADA';
  FECHA_RESERVA: Date;
  FECHA_ACTUALIZACION: Date;
}

export interface ReservaAsiento {
  ID: number;
  RESERVA_ID: number;
  ASIENTO_ID: number;
  FUNCION_ID: number;
  ESTADO: 'OCUPADO' | 'LIBERADO';
}

export interface LogOperacion {
  ID: number;
  OPERACION: string;
  TABLA_AFECTADA: string;
  REGISTRO_ID: number;
  USUARIO_ID: number;
  USUARIO_NOMBRE: string;
  DETALLES: string;
  FECHA_HORA: Date;
}

export interface Cancelacion {
  ID: number;
  RESERVA_ID: number;
  CODIGO_BOLETO: string;
  FUNCION_ID: number;
  USUARIO_ID: number;
  USUARIO_NOMBRE: string;
  NOMBRE_CLIENTE: string;
  ASIENTOS_LIBERADOS: string;
  MOTIVO: string;
  FECHA_HORA: Date;
}

// ─── DTOs (Data Transfer Objects) ───

export interface LoginDTO {
  username: string;
  password: string;
}

export interface CreateReservaDTO {
  funcion_id: number;
  asiento_ids: number[];
  nombre_cliente: string;
  telefono_cliente?: string;
  canal: 'TAQUILLA' | 'TELEFONICA';
}

export interface CreatePeliculaDTO {
  titulo: string;
  duracion_min: number;
  clasificacion: string;
  sinopsis?: string;
  genero: string;
  poster_url?: string;
}

export interface CreateFuncionDTO {
  pelicula_id: number;
  sala_id: number;
  fecha: string; // YYYY-MM-DD
  hora_inicio: string; // HH:mm
  hora_fin: string; // HH:mm
  precio: number;
}

export interface CreateUsuarioDTO {
  username: string;
  password: string;
  nombre_completo: string;
  rol: 'ADMIN' | 'OPERADOR';
}

export interface CancelReservaDTO {
  motivo?: string;
}

// ─── JWT Payload ───
export interface JWTPayload {
  userId: number;
  username: string;
  rol: string;
  iat?: number;
  exp?: number;
}

// ─── Seat Status for the map ───
export interface AsientoStatus {
  id: number;
  fila: string;
  numero: number;
  tipo: string;
  seccion: string;
  estado: 'DISPONIBLE' | 'OCUPADO' | 'RESERVADO';
}
