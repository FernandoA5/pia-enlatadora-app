export enum ControlCalidadResultado {
  Aprobado = 'Aprobado',
  Rechazado = 'Rechazado'
}

export const CONTROL_CALIDAD_RESULTADO_OPTIONS = [
  ControlCalidadResultado.Aprobado,
  ControlCalidadResultado.Rechazado
] as const
