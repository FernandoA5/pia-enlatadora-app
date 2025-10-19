<template>
  <section class="min-h-full bg-white">
      <div class="flex flex-col gap-4">
        <CatalogTools
          v-model="searchQuery"
          :loading="loadingTable"
          @clear="clearFilters"
          @reload="handleReload"
          @add="handleAdd"
        />

        <Tabla
          :headers="tableHeaders"
          :items="filteredItems"
          :loading="loadingTable"
          :items-per-page="itemsPerPage"
          :items-per-page-options="itemsPerPageOptions"
          :mobile-breakpoint="640"
          :height="tableHeight"
          fixed-header
          hover
          enable-row-click
          enable-row-focus
          header-color="var(--ui-primary-100)"
          header-text-color="var(--ui-primary-900)"
          @row-click="handleRowClick"
        >
          <template #header.actions>
            <span class="sr-only">Acciones</span>
          </template>
          <template #item.stock="{ item, value }">
            <div class="flex justify-end">
              <span class="font-semibold text-default-900 dark:text-default-50">
                {{ Number(value ?? 0).toLocaleString('es-MX') }} {{ item.unidad }}
              </span>
            </div>
          </template>
          <template #item.actualizado="{ value }">
            <span class="text-default/80">
              {{ formatDateTime(value) }}
            </span>
          </template>
          <template #item.actions="{ item }">
            <div class="flex justify-end gap-2">
              <button 
                icon="i-heroicons-pencil-square"
                @click.stop="handleEdit(item)"
              />
              <button
                @click.stop="handleDelete(item)"
              />
            </div>
          </template>
        </Tabla>
        <RegistrarModal
          v-model="showRegisterModal"
          :materia-prima="selectedMateriaPrima"
          :loading="modalLoading"
          @submit="handleRegisterSubmit"
          :resizable="true"
          :draggable="true"
          :maximizable="true"
        />
      </div>
  </section>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import CatalogTools from '~/components/Genericos/Catalogos/Tools.vue'
import Tabla from '~/components/Genericos/Tablas/Tabla.vue'
import type { GenericTableHeader, GenericTableItem } from '~/components/Genericos/Tablas/Tabla.vue'
import { useMateriaPrimaApi } from '~/composables/useMateriaPrimaApi'
import RegistrarModal from '~/components/Catalogos/MateriaPrima/Modales/Registrar.vue'

const searchQuery = ref('')
const loadingTable = ref(false)

const tableHeaders: GenericTableHeader[] = [
  { key: 'nombre', title: 'Nombre' },
  { key: 'categoria', title: 'Categoría' },
  { key: 'unidad', title: 'Unidad' },
  { key: 'stock', title: 'Stock actual', align: 'end' as const },
  { key: 'lote', title: 'Lote' },
  { key: 'proveedor', title: 'Proveedor' },
  { key: 'actualizado', title: 'Actualizado' },
  { key: 'actions', title: 'Acciones', align: 'end' as const, width: '144px' }
]

const tableHeight = '28rem'
const itemsPerPage = 8
const itemsPerPageOptions = [5, 8, 12, 20]

const materiaPrimaItems = ref<GenericTableItem[]>([])
const { listMateriasPrimas, createMateriaPrima } = useMateriaPrimaApi()
const showRegisterModal = ref(false)
const selectedMateriaPrima = ref<GenericTableItem | null>(null)
const modalLoading = ref(false)

const fetchMateriasPrimas = async () => {
  if (loadingTable.value) {
    return
  }

  loadingTable.value = true
  try {
    const response = await listMateriasPrimas()
    const items = Array.isArray(response) ? response : response?.data ?? []
    materiaPrimaItems.value = items as GenericTableItem[]
  } catch (error) {
    console.error('Error al obtener materias primas', error)
    materiaPrimaItems.value = []
  } finally {
    loadingTable.value = false
  }
}

onMounted(() => {
  fetchMateriasPrimas()
})

const searchableKeys = ['nombre', 'categoria', 'proveedor', 'lote']

const filteredItems = computed(() => {
  const term = searchQuery.value.trim().toLowerCase()
  if (!term) {
    return materiaPrimaItems.value
  }

  return materiaPrimaItems.value.filter(item =>
    searchableKeys.some(key => String(item[key as keyof typeof item] ?? '').toLowerCase().includes(term))
  )
})

const totalStock = computed(() =>
  filteredItems.value.reduce((sum, item) => sum + (Number(item.stock) || 0), 0)
)

const formatDateTime = (value: unknown) => {
  const date = value instanceof Date ? value : new Date(value as string | number)
  if (Number.isNaN(date.valueOf())) {
    return ''
  }
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date)
}

const handleRowClick = (item: any) => {
  handleEdit(item)
}

const clearFilters = () => {
  searchQuery.value = ''
}

const handleReload = () => {
  if (loadingTable.value) {
    return
  }
  fetchMateriasPrimas()
}

const handleAdd = () => {
  selectedMateriaPrima.value = null
  showRegisterModal.value = true
}

const handleEdit = (item: any) => {
  console.info('Editar registro', item)
}

const handleDelete = (item: any) => {
  console.info('Eliminar registro', item)
}

const handleRegisterSubmit = async ({ data }: { data: { nombre: string; descripcion: string; unidad_medida: string; stock_actual: string; stock_minimo: string } }) => {
  if (modalLoading.value) {
    return
  }

  modalLoading.value = true
  try {
    await createMateriaPrima({
      nombre: data.nombre,
      descripcion: data.descripcion,
      unidad_medida: data.unidad_medida,
      stock_actual: Number.parseFloat(data.stock_actual),
      stock_minimo: Number.parseFloat(data.stock_minimo)
    })
    showRegisterModal.value = false
    await fetchMateriasPrimas()
  } catch (error) {
    console.error('Error al crear materia prima', error)
  } finally {
    modalLoading.value = false
  }
}
</script>

<style scoped>
.bg-white {
  background-color: white;
}
</style>
