import { useNuxtApp } from 'nuxt/app'

type ProductoId = string | number

type ProductoPayload = {
  nombre: string
  descripcion?: string | null
  unidad_medida: string
  stock_actual: number | string
  activo?: boolean
}

type ProductoUpdatePayload = Partial<ProductoPayload>

export const useProductosApi = () => {
  const { $api } = useNuxtApp()

  const listProductos = async () =>
    $api('/api/productos', {
      method: 'GET'
    })

  const getProducto = async (id: ProductoId) =>
    $api(`/api/productos/${id}`, {
      method: 'GET'
    })

  const createProducto = async (payload: ProductoPayload) =>
    $api('/api/productos', {
      method: 'POST',
      body: {
        producto: payload
      }
    })

  const updateProducto = async (id: ProductoId, payload: ProductoUpdatePayload) =>
    $api(`/api/productos/${id}`, {
      method: 'PUT',
      body: {
        producto: payload
      }
    })

  const deactivateProducto = async (id: ProductoId) =>
    updateProducto(id, { activo: false })

  return {
    listProductos,
    getProducto,
    createProducto,
    updateProducto,
    deactivateProducto
  }
}
