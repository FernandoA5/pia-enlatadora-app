export enum ProduccionEstado {
  EnProceso = 'En Proceso',
  Finalizado = 'Finalizado'
}

export const PRODUCCION_ESTADO_OPTIONS = [
  ProduccionEstado.EnProceso,
  ProduccionEstado.Finalizado
] as const
