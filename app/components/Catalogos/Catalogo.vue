<template>
  <section class="catalog-section">
    <div class="catalog-wrapper">
      <CatalogTools
        v-model="searchQuery"
        :loading="loadingTable"
        :placeholder="searchPlaceholder"
        @clear="clearFilters"
        @reload="handleReload"
        @add="handleAdd"
      />

      <Tabla
        :items="filteredItems"
        :loading="loadingTable"
        :items-per-page="itemsPerPage"
        :items-per-page-options="itemsPerPageOptions"
        :mobile-breakpoint="mobileBreakpoint"
        :height="tableHeight"
        :exclude-keys="computedExcludedColumns"
        :additional-headers="computedAdditionalHeaders"
        :fixed-header="fixedHeader"
        :hover="hover"
        :enable-row-click="enableRowClick"
        :enable-row-focus="enableRowFocus"
        :header-color="headerColor"
        :header-text-color="headerTextColor"
        @row-click="handleRowClick"
      >
        <template v-if="hasHeaderActionsSlot" #header.actions="slotProps">
          <slot name="header.actions" v-bind="slotProps" />
        </template>
        <template v-else #header.actions>
          <span class="sr-only">Acciones</span>
        </template>

        <template
          v-for="slotName in forwardedSlotNames"
          :key="slotName"
          v-slot:[slotName]="slotProps"
        >
          <slot :name="slotName" v-bind="slotProps" />
        </template>

        <template v-if="enableActions && hasItemActionsSlot" #item.actions="slotProps">
          <slot
            name="item.actions"
            v-bind="{
              ...slotProps,
              edit: () => handleEdit(slotProps.item),
              remove: () => handleDelete(slotProps.item),
              loading: isItemActionLoading(slotProps.item)
            }"
          />
        </template>
        <template v-else-if="enableActions" #item.actions="{ item }">
          <div class="action-buttons">
            <button
              type="button"
              class="action-button action-button--edit"
              aria-label="Editar"
              @click.stop="handleEdit(item)"
            >
              <Icon name="mdi:pencil" class="action-button__icon" aria-hidden="true" />
            </button>
            <button
              v-if="softDeleteField"
              type="button"
              class="action-button action-button--delete"
              aria-label="Eliminar"
              :disabled="isItemActionLoading(item)"
              @click.stop="handleDelete(item)"
            >
              <Icon name="mdi:trash-can" class="action-button__icon" aria-hidden="true" />
            </button>
          </div>
        </template>
      </Tabla>

      <slot
        v-if="hasModalSlot"
        name="modal"
        :visible="showRegisterModal"
        :set-visible="setModalVisible"
        :selected-item="selectedItem"
        :loading="modalLoading"
        :submit="handleRegisterSubmit"
      />
    </div>
  </section>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, toRefs, useSlots, watch } from 'vue'
import CatalogTools from '~/components/Genericos/Catalogos/Tools.vue'
import Tabla from '~/components/Genericos/Tablas/Tabla.vue'
import type { GenericTableHeader, GenericTableItem } from '~/components/Genericos/Tablas/Tabla.vue'
import { useNuxtApp } from 'nuxt/app'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

const props = withDefaults(
  defineProps<{
    listEndpoint: string
    createEndpoint: string
    updateEndpoint: string
    resourceKey: string
    listMethod?: HttpMethod
    createMethod?: HttpMethod
    updateMethod?: HttpMethod
    searchPlaceholder?: string
    itemsPerPage?: number
    itemsPerPageOptions?: number[]
    mobileBreakpoint?: number
    tableHeight?: string | number
    excludedColumns?: string[]
    additionalHeaders?: GenericTableHeader[]
    enableActions?: boolean
    enableRowClick?: boolean
    enableRowFocus?: boolean
    hover?: boolean
    fixedHeader?: boolean
    headerColor?: string
    headerTextColor?: string
    softDeleteField?: string | null
    softDeleteValue?: boolean | string | number | null
    transformList?: (response: unknown) => GenericTableItem[]
    transformPayload?: (
      data: Record<string, unknown>,
      context: { mode: 'create' | 'update'; id?: string | number | null }
    ) => Record<string, unknown>
    extractItemId?: (item: GenericTableItem) => string | number | null
    searchKeys?: string[]
    defaultSearchKeys?: string[]
    disableAutoFetch?: boolean
  }>(),
  {
    listMethod: 'GET',
    createMethod: 'POST',
    updateMethod: 'PUT',
    searchPlaceholder: 'Buscar en catálogo',
    itemsPerPage: 8,
    itemsPerPageOptions: () => [5, 8, 12, 20] as number[],
    mobileBreakpoint: 640,
    tableHeight: '28rem',
    excludedColumns: () => ['id', 'inserted_at', 'updated_at', 'activo','unidad_medida'] as string[],
    additionalHeaders: () => [{ key: 'actions', title: 'Acciones', align: 'end', width: '144px' }] as GenericTableHeader[],
    enableActions: true,
    enableRowClick: true,
    enableRowFocus: true,
    hover: true,
    fixedHeader: true,
    headerColor: 'var(--ui-primary-100)',
    headerTextColor: 'var(--ui-primary-900)',
    softDeleteField: 'activo',
    softDeleteValue: false,
    disableAutoFetch: false
  }
)

const emit = defineEmits<{
  (event: 'fetch:success', items: GenericTableItem[]): void
  (event: 'fetch:error', error: unknown): void
  (event: 'submit:success', payload: { mode: 'create' | 'update'; id?: string | number | null }): void
  (event: 'submit:error', error: unknown): void
  (event: 'delete:success', payload: { id: string | number | null }): void
  (event: 'delete:error', error: unknown): void
  (event: 'row-click', item: GenericTableItem): void
}>()

const slots = useSlots()
const {
  listEndpoint,
  createEndpoint,
  updateEndpoint,
  listMethod,
  createMethod,
  updateMethod,
  searchKeys,
  defaultSearchKeys,
  transformList,
  transformPayload,
  extractItemId,
  softDeleteField,
  softDeleteValue
} = toRefs(props)

const { $api } = useNuxtApp()

const searchQuery = ref('')
const loadingTable = ref(false)
const modalLoading = ref(false)
const tableItems = ref<GenericTableItem[]>([])
const showRegisterModal = ref(false)
const selectedItem = ref<GenericTableItem | null>(null)
const deletingIds = ref(new Set<string | number>())

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object'

const itemsPerPage = computed(() => props.itemsPerPage)
const itemsPerPageOptions = computed(() => props.itemsPerPageOptions)
const mobileBreakpoint = computed(() => props.mobileBreakpoint)
const tableHeight = computed(() => props.tableHeight)
const fixedHeader = computed(() => props.fixedHeader)
const hover = computed(() => props.hover)
const enableRowClick = computed(() => props.enableRowClick)
const enableRowFocus = computed(() => props.enableRowFocus)
const headerColor = computed(() => props.headerColor)
const headerTextColor = computed(() => props.headerTextColor)
const enableActions = computed(() => props.enableActions)

const computedExcludedColumns = computed<string[]>(() => props.excludedColumns ?? [])
const computedAdditionalHeaders = computed<GenericTableHeader[]>(() => props.additionalHeaders ?? [])
const searchPlaceholder = computed(() => props.searchPlaceholder)

const hasHeaderActionsSlot = computed(() => Boolean(slots['header.actions']))
const hasItemActionsSlot = computed(() => Boolean(slots['item.actions']))
const hasModalSlot = computed(() => Boolean(slots.modal))

const forwardedSlotNames = computed(() => {
  const nativeSlots = new Set([
    'header.actions',
    'item.actions',
    'modal'
  ])
  return Object.keys(slots).filter(name => !nativeSlots.has(name))
})

const availableKeys = computed(() => {
  const sample = tableItems.value[0]
  if (!sample) {
    return [] as string[]
  }
  const excludedSet = new Set(computedExcludedColumns.value.map(key => key.toLowerCase()))
  return Object.keys(sample).filter(key => !excludedSet.has(key.toLowerCase()))
})

const effectiveSearchKeys = computed(() => {
  if (searchKeys.value && searchKeys.value.length) {
    return searchKeys.value
  }
  if (defaultSearchKeys.value && defaultSearchKeys.value.length) {
    return defaultSearchKeys.value
  }
  const sample = tableItems.value[0] ?? {}
  return availableKeys.value.filter(key => typeof (sample as Record<string, unknown>)[key] === 'string')
})

const filteredItems = computed(() => {
  const term = searchQuery.value.trim().toLowerCase()
  if (!term) {
    return tableItems.value
  }
  return tableItems.value.filter(item =>
    effectiveSearchKeys.value.some(key => String(item[key as keyof typeof item] ?? '').toLowerCase().includes(term))
  )
})

const setTableItems = (items: GenericTableItem[]) => {
  tableItems.value = items
}

const fetchItems = async () => {
  if (loadingTable.value) {
    return
  }
  loadingTable.value = true
  try {
    const response = await $api(listEndpoint.value, {
      method: listMethod.value
    })
    const raw = transformList.value ? transformList.value(response) : ((response as any)?.data ?? response)
    const items = Array.isArray(raw) ? (raw as GenericTableItem[]) : []
    setTableItems(items)
    emit('fetch:success', items)
  } catch (error) {
    emit('fetch:error', error)
    setTableItems([])
  } finally {
    loadingTable.value = false
  }
}

if (!props.disableAutoFetch) {
  onMounted(fetchItems)
}

const clearFilters = () => {
  searchQuery.value = ''
}

const handleReload = () => {
  if (!loadingTable.value) {
    fetchItems()
  }
}

const handleAdd = () => {
  selectedItem.value = null
  showRegisterModal.value = true
}

const handleRowClick = (item: GenericTableItem) => {
  if (!enableActions.value) {
    emit('row-click', item)
    return
  }
  handleEdit(item)
}

const setModalVisible = (value: boolean) => {
  showRegisterModal.value = value
  if (!value) {
    selectedItem.value = null
  }
}

const getItemId = (item: GenericTableItem | null | undefined) => {
  if (!item) {
    return null
  }
  if (extractItemId.value) {
    return extractItemId.value(item)
  }
  const itemRecord = item as Record<string, unknown>
  const candidate = itemRecord.id
    ?? (isRecord(itemRecord.value) ? (itemRecord.value as Record<string, unknown>).id : undefined)
    ?? (isRecord(itemRecord.raw) ? (itemRecord.raw as Record<string, unknown>).id : undefined)
  if (candidate == null) {
    return null
  }
  if (typeof candidate === 'string' || typeof candidate === 'number') {
    return candidate
  }
  return null
}

const handleEdit = (item: GenericTableItem) => {
  selectedItem.value = { ...item }
  showRegisterModal.value = true
}

const isItemActionLoading = (item: GenericTableItem) => {
  const id = getItemId(item)
  if (id == null) {
    return false
  }
  return deletingIds.value.has(id)
}

const handleDelete = async (item: GenericTableItem) => {
  const id = getItemId(item)
  if (id == null || !softDeleteField.value) {
    return
  }
  deletingIds.value.add(id)
  try {
    await $api(`${updateEndpoint.value}/${id}`, {
      method: updateMethod.value,
      body: {
        [props.resourceKey]: {
          [softDeleteField.value]: softDeleteValue.value
        }
      }
    })
    deletingIds.value.delete(id)
    emit('delete:success', { id })
    await fetchItems()
  } catch (error) {
    deletingIds.value.delete(id)
    emit('delete:error', error)
  }
}

const modalSubmit = async ({ data, id }: { data: Record<string, unknown>; id?: string | number | null }) => {
  if (modalLoading.value) {
    return
  }
  modalLoading.value = true
  const mode: 'create' | 'update' = id != null ? 'update' : 'create'
  try {
    const payload = transformPayload.value
      ? transformPayload.value(data, { mode, id })
      : data

    if (mode === 'update' && id != null) {
      await $api(`${updateEndpoint.value}/${id}`, {
        method: updateMethod.value,
        body: {
          [props.resourceKey]: payload
        }
      })
    } else {
      await $api(createEndpoint.value, {
        method: createMethod.value,
        body: {
          [props.resourceKey]: payload
        }
      })
    }

    emit('submit:success', { mode, id: id ?? null })
    setModalVisible(false)
    await fetchItems()
  } catch (error) {
    emit('submit:error', error)
  } finally {
    modalLoading.value = false
  }
}

const handleRegisterSubmit = (payload: { data: Record<string, unknown>; id?: string | number | null }) => {
  modalSubmit(payload)
}
</script>

<style scoped>
.catalog-section {
  min-height: 100%;
  background-color: white;
}

.catalog-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

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

.action-button--delete {
  background-color: transparent;
  color: #dc2626;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
</style>
