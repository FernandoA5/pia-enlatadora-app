import { useNuxtApp } from 'nuxt/app'

type ProveedorPayload = {
  nombre: string
  telefono?: string | null
  direccion?: string | null
  correo?: string | null
  activo?: boolean
}

type ProveedorUpdatePayload = Partial<ProveedorPayload>

type ProveedorId = string | number

export const useProveedoresApi = () => {
  const { $api } = useNuxtApp()

  const listProveedores = async () =>
    $api('/api/proveedores', {
      method: 'GET'
    })

  const getProveedor = async (id: ProveedorId) =>
    $api(`/api/proveedores/${id}`, {
      method: 'GET'
    })

  const createProveedor = async (payload: ProveedorPayload) =>
    $api('/api/proveedores', {
      method: 'POST',
      body: {
        proveedor: payload
      }
    })

  const updateProveedor = async (id: ProveedorId, payload: ProveedorUpdatePayload) =>
    $api(`/api/proveedores/${id}`, {
      method: 'PUT',
      body: {
        proveedor: payload
      }
    })

  const deactivateProveedor = async (id: ProveedorId) =>
    updateProveedor(id, { activo: false })

  return {
    listProveedores,
    getProveedor,
    createProveedor,
    updateProveedor,
    deactivateProveedor
  }
}
