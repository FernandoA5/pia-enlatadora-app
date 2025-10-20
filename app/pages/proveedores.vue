<template>
  <Catalogo
    :items="proveedores"
    :loading="loading"
    search-placeholder="Buscar proveedor"
    :search-keys="searchKeys"
    :extract-item-id="extractId"
    @reload="handleReload"
    @submit="handleSubmit"
    @delete="handleDelete"
  >
    <template #item.telefono="{ value }">
      <span>{{ value || 'Sin teléfono' }}</span>
    </template>

    <template #item.direccion="{ value }">
      <span>{{ value || 'Sin dirección' }}</span>
    </template>

    <template #item.correo="{ value }">
      <a
        v-if="value"
        :href="`mailto:${value}`"
        class="text-primary-600 hover:underline"
      >
        {{ value }}
      </a>
      <span v-else>Sin correo</span>
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
      <ProveedorModal
        :model-value="visible"
        :proveedor="selectedItem"
        :loading="modalLoading"
        @update:modelValue="setVisible"
        @submit="submit"
        :resizable="true"
        :draggable="true"
        :maximizable="true"
        :initial-height="520"
        :initial-width="640"
        :min-height="520"
        :min-width="640"
      />
    </template>
  </Catalogo>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Catalogo from '~/components/Catalogos/Catalogo.vue'
import ProveedorModal from '~/components/Catalogos/Proveedores/Modales/Registrar.vue'
import type { GenericTableItem } from '~/components/Genericos/Tablas/Tabla.vue'
import { useProveedoresApi } from '~/composables/useProveedoresApi'

const searchKeys = ['nombre', 'telefono', 'direccion', 'correo']

const { listProveedores, createProveedor, updateProveedor, deactivateProveedor } = useProveedoresApi()
const proveedores = ref<GenericTableItem[]>([])
const loading = ref(false)
const modalLoading = ref(false)

const fetchProveedores = async () => {
  loading.value = true
  try {
    const response = await listProveedores()
    const raw = (response as { data?: unknown }).data ?? response
    if (Array.isArray(raw)) {
      proveedores.value = (raw as GenericTableItem[]).filter(item => {
        const record = item as Record<string, unknown>
        const activo = record.activo ?? (record.value as Record<string, unknown> | undefined)?.activo
        return activo !== false
      })
    }
  } catch (error) {
    console.error('Error al cargar proveedores:', error)
    proveedores.value = []
  } finally {
    loading.value = false
  }
}

const handleReload = () => {
  fetchProveedores()
}

const handleSubmit = async ({ data, id, closeModal }: { data: Record<string, unknown>; id?: string | number | null; closeModal: () => void }) => {
  modalLoading.value = true
  try {
    const payload = {
      nombre: String(data.nombre ?? '').trim(),
      telefono: data.telefono ? String(data.telefono).trim() : null,
      direccion: data.direccion ? String(data.direccion).trim() : null,
      correo: data.correo ? String(data.correo).trim() : null,
      activo: data.activo !== undefined ? Boolean(data.activo) : true
    }

    if (id != null) {
      await updateProveedor(id, payload)
    } else {
      await createProveedor(payload)
    }

    await fetchProveedores()
    closeModal()
  } catch (error) {
    console.error('Error al guardar proveedor:', error)
  } finally {
    modalLoading.value = false
  }
}

const handleDelete = async (item: GenericTableItem) => {
  const id = extractId(item)
  if (id == null) return

  try {
    await deactivateProveedor(id)
    await fetchProveedores()
  } catch (error) {
    console.error('Error al eliminar proveedor:', error)
  }
}

onMounted(() => {
  fetchProveedores()
})

const extractId = (item: GenericTableItem) => {
  const record = item as Record<string, unknown>
  const candidate =
    record.id_proveedor ??
    record.id ??
    (record.value as Record<string, unknown> | undefined)?.id ??
    (record.raw as Record<string, unknown> | undefined)?.id

  if (typeof candidate === 'string' || typeof candidate === 'number') {
    return candidate
  }

  return null
}
</script>
