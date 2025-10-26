import { useNuxtApp } from 'nuxt/app'

type PedidoId = string | number

type PedidoPayload = {
  id_cliente: number
  fecha_pedido: string
  total: number
  activo?: boolean
}

type PedidoUpdatePayload = Partial<PedidoPayload>

export const usePedidosApi = () => {
  const { $api } = useNuxtApp()

  const listPedidos = async () =>
    $api('/api/pedidos', {
      method: 'GET'
    })

  const getPedido = async (id: PedidoId) =>
    $api(`/api/pedidos/${id}`, {
      method: 'GET'
    })

  const createPedido = async (payload: PedidoPayload) =>
    $api('/api/pedidos', {
      method: 'POST',
      body: {
        pedido: payload
      }
    })

  const updatePedido = async (id: PedidoId, payload: PedidoUpdatePayload) =>
    $api(`/api/pedidos/${id}`, {
      method: 'PUT',
      body: {
        pedido: payload
      }
    })

  const deactivatePedido = async (id: PedidoId) =>
    updatePedido(id, { activo: false })

  const obtenerPedidos = async () =>
    $api('/api/obtener_pedidos', {
      method: 'GET'
    })

  return {
    listPedidos,
    getPedido,
    createPedido,
    updatePedido,
    deactivatePedido,
    obtenerPedidos
  }
}
