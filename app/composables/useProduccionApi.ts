import { useNuxtApp } from 'nuxt/app'

type ProduccionId = string | number

type ProduccionPayload = {
  fecha_produccion: string
  cantidad_producida: number | string
  estado: string
  activo?: boolean
  id_producto?: ProduccionId
}

type ProduccionUpdatePayload = Partial<ProduccionPayload>

export const useProduccionApi = () => {
  const { $api } = useNuxtApp()

  const listProducciones = async () =>
    $api('/api/obtener_producciones', {
      method: 'GET'
    })

  const getProduccion = async (id: ProduccionId) =>
    $api(`/api/producciones/${id}`, {
      method: 'GET'
    })

  const createProduccion = async (payload: ProduccionPayload) =>
    $api('/api/producciones', {
      method: 'POST',
      body: {
        produccion: payload
      }
    })

  const updateProduccion = async (id: ProduccionId, payload: ProduccionUpdatePayload) =>
    $api(`/api/producciones/${id}`, {
      method: 'PUT',
      body: {
        produccion: payload
      }
    })

  const deactivateProduccion = async (id: ProduccionId) =>
    updateProduccion(id, { activo: false })

  const deleteProduccion = async (id: ProduccionId) =>
    $api(`/api/producciones/${id}`, {
      method: 'DELETE'
    })

  return {
    listProducciones,
    getProduccion,
    createProduccion,
    updateProduccion,
    deactivateProduccion,
    deleteProduccion
  }
}
