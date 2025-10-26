<template>
  <section class="catalog-section">
    <div class="catalog-wrapper">
      <CatalogTools
        v-model="searchQuery"
        :loading="loading"
        :placeholder="searchPlaceholder"
        @clear="clearFilters"
        @reload="handleReload"
        @add="handleAdd"
      />

      <Tabla
        :items="filteredItems"
        :loading="loading"
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
        <template v-else-if="enableActions" #item.actions="slotProps">
          <div class="action-buttons">
            <template v-if="hasItemActionsExtraSlot">
              <slot
                name="item.actions.extra"
                v-bind="{
                  ...slotProps,
                  edit: () => handleEdit(slotProps.item),
                  remove: () => handleDelete(slotProps.item),
                  loading: isItemActionLoading(slotProps.item)
                }"
              />
            </template>
            <button
              v-if="!shouldShowEditButton || shouldShowEditButton(slotProps.item)"
              type="button"
              class="action-button action-button--edit"
              aria-label="Editar"
              @click.stop="handleEdit(slotProps.item)"
            >
              <Icon name="mdi:pencil" class="action-button__icon" aria-hidden="true" />
            </button>
            <button
              v-if="!shouldShowDeleteButton || shouldShowDeleteButton(slotProps.item)"
              type="button"
              class="action-button action-button--delete"
              aria-label="Eliminar"
              :disabled="isItemActionLoading(slotProps.item)"
              @click.stop="handleDelete(slotProps.item)"
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
        :submit="handleRegisterSubmit"
      />
    </div>
  </section>
</template>

<script lang="ts" setup>
import { computed, ref, toRefs, useSlots } from 'vue'
import CatalogTools from '~/components/Genericos/Catalogos/Tools.vue'
import Tabla from '~/components/Genericos/Tablas/Tabla.vue'
import type { GenericTableHeader, GenericTableItem } from '~/components/Genericos/Tablas/Tabla.vue'

const BASE_EXCLUDED_COLUMNS = ['id', 'inserted_at', 'updated_at', 'activo']

const props = withDefaults(
  defineProps<{
    items: GenericTableItem[]
    loading?: boolean
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
    extractItemId?: (item: GenericTableItem) => string | number | null
    searchKeys?: string[]
    defaultSearchKeys?: string[]
    shouldShowEditButton?: (item: GenericTableItem) => boolean
    shouldShowDeleteButton?: (item: GenericTableItem) => boolean
  }>(),
  {
    items: () => [],
    loading: false,
    searchPlaceholder: 'Buscar en catálogo',
    itemsPerPage: 8,
    itemsPerPageOptions: () => [5, 8, 12, 20] as number[],
    mobileBreakpoint: 640,
    tableHeight: '28rem',
    excludedColumns: () => [] as string[],
    additionalHeaders: () => [{ key: 'actions', title: 'Acciones', align: 'end', width: '144px' }] as GenericTableHeader[],
    enableActions: true,
    enableRowClick: true,
    enableRowFocus: true,
    hover: true,
    fixedHeader: true,
    headerColor: 'var(--ui-primary-100)',
    headerTextColor: 'var(--ui-primary-900)'
  }
)

const emit = defineEmits<{
  (event: 'add'): void
  (event: 'edit', item: GenericTableItem): void
  (event: 'delete', item: GenericTableItem): void
  (event: 'submit', payload: { data: Record<string, unknown>; id?: string | number | null; closeModal: () => void }): void
  (event: 'reload'): void
  (event: 'row-click', item: GenericTableItem): void
}>()

const slots = useSlots()
const {
  searchKeys,
  defaultSearchKeys,
  extractItemId
} = toRefs(props)

const searchQuery = ref('')
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

const computedExcludedColumns = computed<string[]>(() => {
  const extras = props.excludedColumns ?? []
  return Array.from(new Set([...BASE_EXCLUDED_COLUMNS, ...extras]))
})
const computedAdditionalHeaders = computed<GenericTableHeader[]>(() => props.additionalHeaders ?? [])
const searchPlaceholder = computed(() => props.searchPlaceholder)

const hasHeaderActionsSlot = computed(() => Boolean(slots['header.actions']))
const hasItemActionsSlot = computed(() => Boolean(slots['item.actions']))
const hasItemActionsExtraSlot = computed(() => Boolean(slots['item.actions.extra']))
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
  const sample = props.items[0]
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
  const sample = props.items[0] ?? {}
  return availableKeys.value.filter(key => typeof (sample as Record<string, unknown>)[key] === 'string')
})

const filteredItems = computed(() => {
  const term = searchQuery.value.trim().toLowerCase()
  if (!term) {
    return props.items
  }
  return props.items.filter(item =>
    effectiveSearchKeys.value.some(key => String(item[key as keyof typeof item] ?? '').toLowerCase().includes(term))
  )
})


const clearFilters = () => {
  searchQuery.value = ''
}

const handleReload = () => {
  emit('reload')
}

const handleAdd = () => {
  selectedItem.value = null
  showRegisterModal.value = true
  emit('add')
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
  emit('edit', item)
}

const isItemActionLoading = (item: GenericTableItem) => {
  const id = getItemId(item)
  if (id == null) {
    return false
  }
  return deletingIds.value.has(id)
}

const handleDelete = (item: GenericTableItem) => {
  const id = getItemId(item)
  if (id == null) {
    return
  }
  emit('delete', item)
}

const modalSubmit = ({ data, id }: { data: Record<string, unknown>; id?: string | number | null }) => {
  emit('submit', { data, id, closeModal: () => setModalVisible(false) })
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
