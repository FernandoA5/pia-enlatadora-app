import { useNuxtApp } from 'nuxt/app'

type CompraMateriaPrimaId = string | number

type CompraMateriaPrimaPayload = {
  id_proveedor: CompraMateriaPrimaId
  fecha_compra: string
  total: string | number
  activo?: boolean
}

type CompraMateriaPrimaResponse = {
  id: CompraMateriaPrimaId
  fecha_compra: string
  id_proveedor: CompraMateriaPrimaId
  nombre_proveedor: string
  total: string | number
  activo: boolean
}

type CompraMateriaPrimaUpdatePayload = Partial<CompraMateriaPrimaPayload>

type DetalleCompraUpdatePayload = Partial<{
  cantidad: number | string
  precio_unitario: number | string
  activo: boolean
}>

export type RegistrarDetalleCompraPayload = {
  id_compra: CompraMateriaPrimaId
  detalles: Array<{
    id_materia: CompraMateriaPrimaId
    cantidad: number
    precio_unitario: number
  }>
}

export const useComprasMateriaPrimaApi = () => {
  const { $api } = useNuxtApp()

  const listComprasMateriaPrima = async () =>
    $api('/api/compras_materia_prima', {
      method: 'GET'
    })

  const obtenerComprasMateriaPrima = async () =>
    $api('/api/obtener_compras_materia_prima', {
      method: 'GET'
    })

  const obtenerDetallesCompraPorIdCompra = async (id: CompraMateriaPrimaId) =>
    $api('/api/obtener_detalles_compra_by_id_compra', {
      method: 'GET',
      query: {
        id_compra: typeof id === 'number' ? id : String(id)
      }
    })

  const getCompraMateriaPrima = async (id: CompraMateriaPrimaId) =>
    $api(`/api/compras_materia_prima/${id}`, {
      method: 'GET'
    })

  const createCompraMateriaPrima = async (payload: CompraMateriaPrimaPayload) =>
    $api('/api/compras_materia_prima', {
      method: 'POST',
      body: {
        compra_materia_prima: payload
      }
    })

  const updateCompraMateriaPrima = async (
    id: CompraMateriaPrimaId,
    payload: CompraMateriaPrimaUpdatePayload
  ) =>
    $api(`/api/compras_materia_prima/${id}`, {
      method: 'PUT',
      body: {
        compra_materia_prima: payload
      }
    })

  const deactivateCompraMateriaPrima = async (id: CompraMateriaPrimaId) =>
    updateCompraMateriaPrima(id, { activo: false })

  const deleteCompraMateriaPrima = async (id: CompraMateriaPrimaId) =>
    $api(`/api/compras_materia_prima/${id}`, {
      method: 'DELETE'
    })

  const registrarDetallesCompra = async (payload: RegistrarDetalleCompraPayload) =>
    $api('/api/registrar_detalles_compra', {
      method: 'POST',
      body: payload
    })

  const updateDetalleCompra = async (id: CompraMateriaPrimaId, payload: DetalleCompraUpdatePayload) =>
    $api(`/api/detalle_compras/${id}`, {
      method: 'PUT',
      body: {
        detalle_compra: payload
      }
    })

  const deactivateDetalleCompra = async (
    id: CompraMateriaPrimaId,
    payload: { cantidad: number | string; precio_unitario: number | string }
  ) => {
    if (payload === undefined || payload === null) {
      throw new Error('Se requiere payload para desactivar el detalle de compra')
    }

    return updateDetalleCompra(id, {
      cantidad: payload.cantidad,
      precio_unitario: payload.precio_unitario,
      activo: false
    })
  }

  return {
    listComprasMateriaPrima,
    obtenerComprasMateriaPrima,
    getCompraMateriaPrima,
    createCompraMateriaPrima,
    updateCompraMateriaPrima,
    deactivateCompraMateriaPrima,
    deleteCompraMateriaPrima,
    registrarDetallesCompra,
    obtenerDetallesCompraPorIdCompra,
    updateDetalleCompra,
    deactivateDetalleCompra
  }
}
