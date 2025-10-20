import { useNuxtApp } from 'nuxt/app'

export const useMateriaPrimaApi = () => {
  const { $api } = useNuxtApp()

  type MateriaPrimaPayload = {
    nombre: string
    descripcion: string
    unidad_medida: string
    stock_actual: string | number
    stock_minimo: string | number
    activo?: boolean
  }

  type MateriaPrimaUpdatePayload = Partial<MateriaPrimaPayload> & {
    activo?: boolean
  }

  const listMateriasPrimas = async () => {
    return $api('/api/materias_primas', {
      method: 'GET',
    })
  }

  const createMateriaPrima = async (payload: MateriaPrimaPayload) => {
    return $api('/api/materias_primas', {
      method: 'POST',
      body: {
        materia_prima: payload
      },
    })
  }

  const updateMateriaPrima = async (
    id: string | number,
    payload: MateriaPrimaUpdatePayload
  ) => {
    return $api(`/api/materias_primas/${id}`, {
      method: 'PUT',
      body: {
        materia_prima: payload
      },
    })
  }

  return {
    listMateriasPrimas,
    createMateriaPrima,
    updateMateriaPrima,
  }
}
