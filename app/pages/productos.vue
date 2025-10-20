<template>
  <Catalogo
    :items="productos"
    :loading="loading"
    search-placeholder="Buscar producto"
    :search-keys="searchKeys"
    :extract-item-id="extractId"
    @reload="handleReload"
    @submit="handleSubmit"
    @delete="handleDelete"
  >
    <template #item.descripcion="{ value }">
      <span>{{ value || 'Sin descripción' }}</span>
    </template>

    <template #item.unidad_medida="{ value }">
      <span>{{ value || 'Sin unidad' }}</span>
    </template>

    <template #item.stock_actual="{ value }">
      <span>{{ formatStock(value) }}</span>
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
        {{ value ? 'Activo' : 'Inactivo' }}
      </span>
    </template>

    <template #modal="{ visible, setVisible, selectedItem, submit }">
      <ProductoModal
        :model-value="visible"
        :producto="selectedItem"
        :loading="modalLoading"
        @update:modelValue="setVisible"
        @submit="submit"
        :resizable="true"
        :draggable="true"
        :maximizable="true"
        :initial-height="560"
        :initial-width="720"
        :min-height="520"
        :min-width="640"
      />
    </template>
  </Catalogo>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Catalogo from '~/components/Catalogos/Catalogo.vue'
import ProductoModal from '~/components/Catalogos/Productos/Modales/Registrar.vue'
import type { GenericTableItem } from '~/components/Genericos/Tablas/Tabla.vue'
import { useProductosApi } from '~/composables/useProductosApi'

const searchKeys = ['nombre', 'descripcion', 'unidad_medida']

const { listProductos, createProducto, updateProducto, deactivateProducto } = useProductosApi()
const productos = ref<GenericTableItem[]>([])
const loading = ref(false)
const modalLoading = ref(false)

const formatStock = (value: unknown) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return '—'
  }
  return parsed.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const fetchProductos = async () => {
  loading.value = true
  try {
    const response = await listProductos()
    const raw = (response as { data?: unknown }).data ?? response
    if (Array.isArray(raw)) {
      productos.value = (raw as GenericTableItem[]).filter(item => {
        const record = item as Record<string, unknown>
        const activo = record.activo ?? (record.value as Record<string, unknown> | undefined)?.activo
        return activo !== false
      })
    }
  } catch (error) {
    console.error('Error al cargar productos:', error)
    productos.value = []
  } finally {
    loading.value = false
  }
}

const handleReload = () => {
  fetchProductos()
}

const handleSubmit = async ({ data, id, closeModal }: { data: Record<string, unknown>; id?: string | number | null; closeModal: () => void }) => {
  modalLoading.value = true
  try {
    const payload = {
      nombre: String(data.nombre ?? '').trim(),
      descripcion: data.descripcion ? String(data.descripcion).trim() : null,
      unidad_medida: String(data.unidad_medida ?? '').trim(),
      stock_actual: data.stock_actual !== undefined && data.stock_actual !== null ? Number(data.stock_actual) : 0,
      activo: data.activo !== undefined ? Boolean(data.activo) : true
    }

    if (id != null) {
      await updateProducto(id, payload)
    } else {
      await createProducto(payload)
    }

    await fetchProductos()
    closeModal()
  } catch (error) {
    console.error('Error al guardar producto:', error)
  } finally {
    modalLoading.value = false
  }
}

const handleDelete = async (item: GenericTableItem) => {
  const id = extractId(item)
  if (id == null) return

  try {
    await deactivateProducto(id)
    await fetchProductos()
  } catch (error) {
    console.error('Error al eliminar producto:', error)
  }
}

onMounted(() => {
  fetchProductos()
})

const extractId = (item: GenericTableItem) => {
  const record = item as Record<string, unknown>
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
</script>
