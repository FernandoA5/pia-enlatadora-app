<template>
  <Catalogo
    :items="producciones"
    :loading="loading"
    search-placeholder="Buscar producción"
    :search-keys="searchKeys"
    :extract-item-id="extractId"
    :excluded-columns="['id_producto']"
    @reload="handleReload"
    @submit="handleSubmit"
    @delete="handleDelete"
  >
    <template #item.cantidad_producida="{ value }">
      <div class="flex justify-end">
        <span class="font-semibold text-default-900 dark:text-default-50">
          {{ formatCantidad(value) }}
        </span>
      </div>
    </template>

    <template #item.activo="{ value }">
      <span
        :class="[
          'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold',
          value ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
        ]"
      >
        <Icon :name="value ? 'mdi:check-circle' : 'mdi:close-circle'" class="h-4 w-4" />
        {{ value ? 'Activo' : 'Inactivo' }}
      </span>
    </template>

    <template #modal="{ visible, setVisible, selectedItem, submit }">
      <ProduccionModal
        :model-value="visible"
        :produccion="selectedItem"
        :productos="productos"
        :loading="modalLoading"
        @update:modelValue="setVisible"
        @submit="submit"
      />
    </template>
  </Catalogo>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Catalogo from '~/components/Catalogos/Catalogo.vue'
import ProduccionModal from '~/components/Catalogos/Produccion/Modales/Registrar.vue'
import type { GenericTableItem } from '~/components/Genericos/Tablas/Tabla.vue'
import { useProduccionApi } from '~/composables/useProduccionApi'
import { useProductosApi } from '~/composables/useProductosApi'

const searchKeys = ['estado']

const {
  listProducciones,
  createProduccion,
  updateProduccion,
  deactivateProduccion
} = useProduccionApi()

const { listProductos } = useProductosApi()

const producciones = ref<GenericTableItem[]>([])
const loading = ref(false)
const modalLoading = ref(false)
const productos = ref<Array<{ id: string | number; nombre: string }>>([])

const formatCantidad = (value: unknown) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return '—'
  }
  return parsed.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const fetchProducciones = async () => {
  loading.value = true
  try {
    const response = await listProducciones()
    const raw = (response as { data?: unknown }).data ?? response
    if (Array.isArray(raw)) {
      producciones.value = (raw as GenericTableItem[]).filter(item => {
        const record = item as Record<string, unknown>
        const activo = record.activo ?? (record.value as Record<string, unknown> | undefined)?.activo
        return activo !== false
      })
    }
  } catch (error) {
    console.error('Error al cargar producciones:', error)
    producciones.value = []
  } finally {
    loading.value = false
  }
}

const resolveRecordId = (record: Record<string, unknown>) => {
  const candidate =
    record.id_producto ??
    record.id ??
    (record.value as Record<string, unknown> | undefined)?.id ??
    (record.raw as Record<string, unknown> | undefined)?.id

  if (typeof candidate === 'string' || typeof candidate === 'number') {
    return candidate
  }

  return null
}

const fetchProductos = async () => {
  try {
    const response = await listProductos()
    const raw = (response as { data?: unknown }).data ?? response
    if (Array.isArray(raw)) {
      productos.value = (raw as Array<Record<string, unknown>>)
        .filter(item => (item.activo ?? (item.value as Record<string, unknown> | undefined)?.activo) !== false)
        .map(item => {
          const id = resolveRecordId(item)
          return {
            id,
            nombre: String(item.nombre ?? (item.value as Record<string, unknown> | undefined)?.nombre ?? '')
          }
        })
        .filter((option): option is { id: string | number; nombre: string } => option.id !== null)
    }
  } catch (error) {
    console.error('Error al cargar productos para selección:', error)
    productos.value = []
  }
}

const handleReload = () => {
  fetchProducciones()
}

const handleSubmit = async ({
  data,
  id,
  closeModal
}: {
  data: Record<string, unknown>
  id?: string | number | null
  closeModal: () => void
}) => {
  modalLoading.value = true
  try {
    const payload = {
      fecha_produccion: String(data.fecha_produccion ?? '').trim(),
      cantidad_producida: Number.parseFloat(String(data.cantidad_producida ?? 0)),
      estado: String(data.estado ?? '').trim(),
      activo: true,
      id_producto: data.id_producto ? Number.parseInt(String(data.id_producto), 10) : undefined
    }

    if (id != null) {
      await updateProduccion(id, payload)
    } else {
      await createProduccion(payload)
    }

    await fetchProducciones()
    closeModal()
  } catch (error) {
    console.error('Error al guardar producción:', error)
  } finally {
    modalLoading.value = false
  }
}

const handleDelete = async (item: GenericTableItem) => {
  const id = extractId(item)
  if (id == null) return

  try {
    await deactivateProduccion(id)
    await fetchProducciones()
  } catch (error) {
    console.error('Error al eliminar producción:', error)
  }
}

const extractId = (item: GenericTableItem) => {
  const record = item as Record<string, unknown>
  const candidate =
    record.id_produccion ??
    record.id ??
    (record.value as Record<string, unknown> | undefined)?.id ??
    (record.raw as Record<string, unknown> | undefined)?.id

  if (typeof candidate === 'string' || typeof candidate === 'number') {
    return candidate
  }

  return null
}

onMounted(() => {
  fetchProducciones()
  fetchProductos()
})
</script>