<template>
  <Catalogo
    :items="materiasPrimas"
    :loading="loading"
    search-placeholder="Buscar materia prima"
    :search-keys="searchKeys"
    :extract-item-id="extractId"
    :excluded-columns="['unidad_medida']"
    @reload="handleReload"
    @submit="handleSubmit"
    @delete="handleDelete"
  >
    <template #item.stock_actual="{ item, value }">
      <div class="flex justify-end">
        <span class="font-semibold text-default-900 dark:text-default-50">
          {{ Number(value ?? 0).toLocaleString('es-MX') }} {{ item.unidad_medida ?? item.unidad ?? '' }}
        </span>
      </div>
    </template>

    <template #item.stock_minimo="{ item, value }">
      <div class="flex justify-end">
        <span class="font-semibold text-default-900 dark:text-default-50">
          {{ Number(value ?? 0).toLocaleString('es-MX') }} {{ item.unidad_medida ?? item.unidad ?? '' }}
        </span>
      </div>
    </template>

    <template #modal="{ visible, setVisible, selectedItem, submit }">
      <RegistrarModal
        :model-value="visible"
        :materia-prima="selectedItem"
        :loading="modalLoading"
        @update:modelValue="setVisible"
        @submit="submit"
        :resizable="true"
        :draggable="true"
        :maximizable="true"
      />
    </template>
  </Catalogo>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Catalogo from '~/components/Catalogos/Catalogo.vue'
import RegistrarModal from '~/components/Catalogos/MateriaPrima/Modales/Registrar.vue'
import type { GenericTableItem } from '~/components/Genericos/Tablas/Tabla.vue'
import { useMateriaPrimaApi } from '~/composables/useMateriaPrimaApi'

const searchKeys = ['nombre', 'descripcion', 'unidad_medida']

const { listMateriasPrimas, createMateriaPrima, updateMateriaPrima, deactivateMateriaPrima } = useMateriaPrimaApi()
const materiasPrimas = ref<GenericTableItem[]>([])
const loading = ref(false)
const modalLoading = ref(false)

const fetchMateriasPrimas = async () => {
  loading.value = true
  try {
    const response = await listMateriasPrimas()
    const raw = (response as { data?: unknown }).data ?? response
    if (Array.isArray(raw)) {
      materiasPrimas.value = (raw as GenericTableItem[]).filter(item => {
        const record = item as Record<string, unknown>
        const activo = record.activo ?? (record.value as Record<string, unknown> | undefined)?.activo
        return activo !== false
      })
    }
  } catch (error) {
    console.error('Error al cargar materias primas:', error)
    materiasPrimas.value = []
  } finally {
    loading.value = false
  }
}

const handleReload = () => {
  fetchMateriasPrimas()
}

const handleSubmit = async ({ data, id, closeModal }: { data: Record<string, unknown>; id?: string | number | null; closeModal: () => void }) => {
  modalLoading.value = true
  try {
    const payload = {
      nombre: String(data.nombre ?? '').trim(),
      descripcion: String(data.descripcion ?? '').trim(),
      unidad_medida: String(data.unidad_medida ?? '').trim(),
      stock_actual: Number.parseFloat(String(data.stock_actual ?? 0)),
      stock_minimo: Number.parseFloat(String(data.stock_minimo ?? 0)),
      activo: data.activo !== undefined ? Boolean(data.activo) : true
    }

    if (id != null) {
      await updateMateriaPrima(id, payload)
    } else {
      await createMateriaPrima(payload)
    }

    await fetchMateriasPrimas()
    closeModal()
  } catch (error) {
    console.error('Error al guardar materia prima:', error)
  } finally {
    modalLoading.value = false
  }
}

const handleDelete = async (item: GenericTableItem) => {
  const id = extractId(item)
  if (id == null) return

  try {
    await deactivateMateriaPrima(id)
    await fetchMateriasPrimas()
  } catch (error) {
    console.error('Error al eliminar materia prima:', error)
  }
}

onMounted(() => {
  fetchMateriasPrimas()
})

const extractId = (item: GenericTableItem) => {
  const record = item as Record<string, unknown>
  const candidate =
    record.id_materia_prima ??
    record.id ??
    (record.value as Record<string, unknown> | undefined)?.id ??
    (record.raw as Record<string, unknown> | undefined)?.id

  if (typeof candidate === 'string' || typeof candidate === 'number') {
    return candidate
  }

  return null
}
</script>
