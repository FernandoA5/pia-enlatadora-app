import { useNuxtApp } from 'nuxt/app'

type ClienteId = string | number

type ClientePayload = {
  nombre: string
  telefono?: string | null
  direccion?: string | null
  correo?: string | null
  activo?: boolean
}

type ClienteUpdatePayload = Partial<ClientePayload>

export const useClientesApi = () => {
  const { $api } = useNuxtApp()

  const listClientes = async () =>
    $api('/api/clientes', {
      method: 'GET'
    })

  const getCliente = async (id: ClienteId) =>
    $api(`/api/clientes/${id}`, {
      method: 'GET'
    })

  const createCliente = async (payload: ClientePayload) =>
    $api('/api/clientes', {
      method: 'POST',
      body: {
        cliente: payload
      }
    })

  const updateCliente = async (id: ClienteId, payload: ClienteUpdatePayload) =>
    $api(`/api/clientes/${id}`, {
      method: 'PUT',
      body: {
        cliente: payload
      }
    })

  const deactivateCliente = async (id: ClienteId) =>
    updateCliente(id, { activo: false })

  return {
    listClientes,
    getCliente,
    createCliente,
    updateCliente,
    deactivateCliente
  }
}
