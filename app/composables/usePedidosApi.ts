import { useNuxtApp } from 'nuxt/app'

type PedidoId = string | number

type PedidoPayload = {
  id_cliente: number
  fecha_pedido: string
  total: number
  activo?: boolean
}

type PedidoUpdatePayload = Partial<PedidoPayload>

type DetallePedidoUpdatePayload = Partial<{
  cantidad: number | string
  precio_unitario: number | string
  activo: boolean
}>

export type RegistrarDetallePedidoPayload = {
  id_pedido: PedidoId
  detalles: Array<{
    id_producto: PedidoId
    cantidad: number
    precio_unitario: number
  }>
}

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

  const registrarDetallesPedido = async (payload: RegistrarDetallePedidoPayload) =>
    $api('/api/registrar_detalles_pedido', {
      method: 'POST',
      body: payload
    })

  const obtenerDetallesPedidoPorIdPedido = async (id: PedidoId) =>
    $api('/api/obtener_detalles_pedido_by_id_pedido', {
      method: 'GET',
      query: {
        id_pedido: typeof id === 'number' ? id : String(id)
      }
    })

  const updateDetallePedido = async (id: PedidoId, payload: DetallePedidoUpdatePayload) =>
    $api(`/api/detalles_pedido/${id}`, {
      method: 'PUT',
      body: {
        detalle_pedido: payload
      }
    })

  const deactivateDetallePedido = async (
    id: PedidoId,
    payload: { cantidad: number | string; precio_unitario: number | string }
  ) => {
    if (payload === undefined || payload === null) {
      throw new Error('Se requiere payload para desactivar el detalle de pedido')
    }

    return updateDetallePedido(id, {
      cantidad: payload.cantidad,
      precio_unitario: payload.precio_unitario,
      activo: false
    })
  }

  return {
    listPedidos,
    getPedido,
    createPedido,
    updatePedido,
    deactivatePedido,
    obtenerPedidos,
    registrarDetallesPedido,
    obtenerDetallesPedidoPorIdPedido,
    updateDetallePedido,
    deactivateDetallePedido
  }
}
