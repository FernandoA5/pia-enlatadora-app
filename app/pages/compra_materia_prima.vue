<template>
  <Catalogo
    :items="compras"
    :loading="loading"
    search-placeholder="Buscar compra de materia prima"
    :search-keys="searchKeys"
    :extract-item-id="extractId"
    :excluded-columns="['id_proveedor', 'id_compra']"
    @reload="handleReload"
    @submit="handleSubmit"
    @delete="handleDelete"
  >
    <template #item.actions.extra="{ item, loading }">
      <button
        type="button"
        class="action-button action-button--edit"
        aria-label="Ver detalle de compra"
        :disabled="loading"
        @click.stop="handleDetalleCompra(item)">
        <Icon name="mdi:clipboard-text-search-outline" class="action-button__icon" aria-hidden="true" />
      </button>
    </template>

    <template #item.fecha_compra="{ value }">
      <span>{{ formatDate(value) }}</span>
    </template>

    <template #item.total="{ value }">
      <span class="font-semibold">{{ formatCurrency(value) }}</span>
    </template>

    <template #item.activo="{ value }">
      <span
        :class="[
          'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold',
          value ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
        ]"
      >
        <Icon
          :name="value ? 'mdi:check-circle' : 'mdi:close-circle'"
          class="h-4 w-4"
        />
        {{ value ? 'Activa' : 'Inactiva' }}
      </span>
    </template>

    <template #modal="{ visible, setVisible, selectedItem, submit }">
      <Formulario
        :model-value="visible"
        :compra="selectedItem"
        :loading="modalLoading"
        :proveedores="proveedoresOptions"
        @update:modelValue="setVisible"
        @submit="submit"
      />
    </template>
  </Catalogo>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Catalogo from '~/components/Catalogos/Catalogo.vue'
import Formulario from '~/components/Catalogos/CompraMateriaPrima/Modales/Formulario.vue'
import type { GenericTableItem } from '~/components/Genericos/Tablas/Tabla.vue'
import { useComprasMateriaPrimaApi } from '~/composables/useComprasMateriaPrimaApi'
import { useProveedoresApi } from '~/composables/useProveedoresApi'

const searchKeys = ['id', 'fecha_compra']

const { obtenerComprasMateriaPrima, createCompraMateriaPrima, updateCompraMateriaPrima, deactivateCompraMateriaPrima } =
  useComprasMateriaPrimaApi()
const { listProveedores } = useProveedoresApi()

const compras = ref<GenericTableItem[]>([])
const loading = ref(false)
const modalLoading = ref(false)

type ProveedorOption = {
  label: string
  value: string | number
}

const proveedoresOptions = ref<ProveedorOption[]>([])

const fetchCompras = async () => {
  loading.value = true
  try {
    const response = await obtenerComprasMateriaPrima()
    const raw = (response as { data?: unknown }).data ?? response
    
    if (Array.isArray(raw)) {
      compras.value = (raw as GenericTableItem[]).map(item => {
        const record = item as Record<string, unknown>
        const idCompra =
          record.id ??
          record.id_compra ??
          (record.value as Record<string, unknown> | undefined)?.id ??
          (record.raw as Record<string, unknown> | undefined)?.id
        return {
          ...record,
          id: typeof idCompra === 'string' || typeof idCompra === 'number' ? idCompra : undefined,
          total: record.total ?? record['total']
        }
      })
    }
  } catch (error) {
    console.error('Error al cargar compras de materia prima:', error)
    compras.value = []
  } finally {
    loading.value = false
  }
}

const fetchProveedores = async () => {
  try {
    const response = await listProveedores()
    const raw = (response as { data?: unknown }).data ?? response

    if (Array.isArray(raw)) {
      proveedoresOptions.value = (raw as GenericTableItem[])
        .map(item => {
          const record = item as Record<string, unknown>
          const valueCandidate = record.id ?? record.id_proveedor ?? record.value

          if (typeof valueCandidate === 'number' || typeof valueCandidate === 'string') {
            const option: ProveedorOption = {
              label: String(record.nombre ?? record.label ?? 'Proveedor sin nombre'),
              value: String(valueCandidate)
            }
            return option
          }

          return null
        })
        .filter((option): option is ProveedorOption => option !== null)
    } else {
      proveedoresOptions.value = []
    }
  } catch (error) {
    console.error('Error al cargar proveedores:', error)
    proveedoresOptions.value = []
  }
}

const handleReload = () => {
  fetchCompras()
  fetchProveedores()
}

const handleSubmit = async ({ data, id, closeModal }: { data: Record<string, unknown>; id?: string | number | null; closeModal: () => void }) => {
  modalLoading.value = true
  try {
    const rawIdProveedor = data.id_proveedor
    const stringId = String(rawIdProveedor ?? '').trim()
    const idProveedor = stringId

    const fechaCompra = String(data.fecha_compra ?? '').trim()
    const total = Number(data.total ?? 0)

    const payload = {
      id_proveedor: Number.isNaN(Number(idProveedor)) ? idProveedor : Number(idProveedor),
      fecha_compra: fechaCompra,
      total,
      activo: data.activo !== undefined ? Boolean(data.activo) : true
    }

    if (id != null) {
      await updateCompraMateriaPrima(id, payload)
    } else {
      await createCompraMateriaPrima(payload)
    }

    await fetchCompras()
    closeModal()
  } catch (error) {
    console.error('Error al guardar la compra de materia prima:', error)
  } finally {
    modalLoading.value = false
  }
}

const handleDelete = async (item: GenericTableItem) => {
  const id = extractId(item)
  if (id == null) return

  try {
    await deactivateCompraMateriaPrima(id)
    await fetchCompras()
  } catch (error) {
    console.error('Error al desactivar la compra de materia prima:', error)
  }
}

const handleDetalleCompra = (item: GenericTableItem) => {
  const id = extractId(item)
  if (id == null) return

  console.log('Mostrar detalle de compra para', id, item)
}

onMounted(() => {
  fetchCompras()
  fetchProveedores()
})

const extractId = (item: GenericTableItem) => {
  const record = item as Record<string, unknown>
  const candidate =
    record.id ??
    record.id_compra ??
    (record.value as Record<string, unknown> | undefined)?.id ??
    (record.raw as Record<string, unknown> | undefined)?.id

  if (typeof candidate === 'string' || typeof candidate === 'number') {
    return candidate
  }

  return null
}

const formatDate = (value: unknown) => {
  if (!value) {
    return '—'
  }
  try {
    const date = new Date(String(value))
    if (Number.isNaN(date.getTime())) {
      return String(value)
    }
    return date.toLocaleDateString('es-MX')
  } catch (error) {
    console.error('Error al formatear fecha:', error)
    return String(value)
  }
}

const formatCurrency = (value: unknown) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return '—'
  }
  return parsed.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN'
  })
}
</script>

<style scoped>
.action-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.75rem;
  border: 1px solid transparent;
  background: rgba(15, 23, 42, 0.05);
  color: #1d4ed8;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;
  cursor: pointer;
}

.action-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.15);
}

.action-button:active {
  transform: translateY(0);
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.1);
}

.action-button__icon {
  width: 1.25rem;
  height: 1.25rem;
}

.action-button--edit {
  background-color: transparent;
}
</style>
