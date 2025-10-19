import { useNuxtApp } from 'nuxt/app'

export const useMateriaPrimaApi = () => {
  const { $api } = useNuxtApp()

  const listMateriasPrimas = async () => {
    return $api('/api/materias_primas', {
      method: 'GET',
    })
  }

  const createMateriaPrima = async (payload: {
    nombre: string
    descripcion: string
    unidad_medida: string
    stock_actual: string | number
    stock_minimo: string | number
  }) => {
    return $api('/api/materias_primas', {
      method: 'POST',
      body: payload,
    })
  }

  return {
    listMateriasPrimas,
    createMateriaPrima,
  }
}
