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

type ControlCalidadId = string | number

type ControlCalidadPayload = {
  resultado: string
  observaciones?: string | null
  fecha_control: string
  activo?: boolean
  id_produccion: ProduccionId
}

type ControlCalidadUpdatePayload = Partial<ControlCalidadPayload>

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

  const getControlCalidadByProduccion = async (idProduccion: ProduccionId) =>
    $api('/api/obtener_control_calidad_por_produccion', {
      method: 'GET',
      query: {
        id_produccion: idProduccion
      }
    })

  const createControlCalidad = async (payload: ControlCalidadPayload) =>
    $api('/api/controles_calidad', {
      method: 'POST',
      body: {
        control_calidad: payload
      }
    })

  const updateControlCalidad = async (id: ControlCalidadId, payload: ControlCalidadUpdatePayload) =>
    $api(`/api/controles_calidad/${id}`, {
      method: 'PUT',
      body: {
        control_calidad: payload
      }
    })

  return {
    listProducciones,
    getProduccion,
    createProduccion,
    updateProduccion,
    deactivateProduccion,
    deleteProduccion,
    getControlCalidadByProduccion,
    createControlCalidad,
    updateControlCalidad
  }
}
