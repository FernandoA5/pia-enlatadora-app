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

  return {
    listComprasMateriaPrima,
    obtenerComprasMateriaPrima,
    getCompraMateriaPrima,
    createCompraMateriaPrima,
    updateCompraMateriaPrima,
    deactivateCompraMateriaPrima,
    deleteCompraMateriaPrima
  }
}
