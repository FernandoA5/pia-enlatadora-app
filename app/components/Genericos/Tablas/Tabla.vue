<template>
  <div class="table-container">
    <div v-if="loadingState" class="loading-bar">
      <slot name="loading">
        <div class="progress-container">
          <div class="progress-bar"></div>
        </div>
      </slot>
    </div>
    <div class="table-wrapper">
      <div class="table-scroll-x">
        <div :class="scrollContainerClasses" :style="scrollContainerStyle">
          <table class="data-table">
            <thead v-if="computedHeaders.length" :class="theadClasses">
              <tr>
                <th
                  v-for="header in computedHeaders"
                  :key="`header-${normalizeKey(header.key)}`"
                  :class="headerCellClass(header)"
                  :style="headerCellStyle(header)"
                  :scope="'col'"
                >
                  <slot :name="`header.${normalizeKey(header.key)}`" :header="header">
                    <strong>{{ header.title }}</strong>
                  </slot>
                </th>
              </tr>
            </thead>
            <tbody class="table-body">
              <template v-if="!tableItems.length && !loadingState">
                <tr>
                  <td :colspan="Math.max(computedHeaders.length, 1)" class="no-data-cell">
                    <slot name="no-data">
                      No hay datos disponibles
                    </slot>
                  </td>
                </tr>
              </template>
              <template v-else>
                <tr
                  v-for="(item, rowIndex) in paginatedItems"
                  :key="resolveRowKey(item, rowIndex)"
                  :class="rowClasses(item, rowIndex)"
                  :tabindex="enableRowFocusState ? 0 : undefined"
                  @click="handleRowClick(item)"
                  @keyup.enter.prevent="handleRowActivate(item)"
                >
                  <td
                    v-for="header in computedHeaders"
                    :key="`${normalizeKey(header.key)}-${rowIndex}`"
                    :class="cellClass(header)"
                    :style="cellStyle(header)"
                  >
                    <slot
                      :name="`item.${normalizeKey(header.key)}`"
                      :item="extractRawItem(item)"
                      :value="resolveValue(item, header.key)"
                      :index="rowIndex"
                    >
                      {{ formatValue(resolveValue(item, header.key)) }}
                    </slot>
                  </td>
                </tr>
              </template>
              <slot
                name="body.append"
                :items="tableItems"
                :headers="computedHeaders"
              />
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <footer v-if="!hideFooterState" class="table-footer">
      <div class="footer-content">
        <div v-if="!disablePaginationState && normalizedItemsPerPageOptions.length" class="items-per-page">
          <span>Elementos por página</span>
          <label class="select-wrapper">
            <span class="sr-only">Seleccionar elementos por página</span>
            <select
              class="page-size-select"
              :value="String(currentItemsPerPage)"
              @change="onChangeItemsPerPage($event)"
            >
              <option
                v-for="option in normalizedItemsPerPageOptions"
                :key="`page-size-${option.value}`"
                :value="String(option.value)"
              >
                {{ option.label }}
              </option>
            </select>
          </label>
        </div>
        <div class="pagination-info">
          <span>{{ paginationLabel }}</span>
          <div v-if="!disablePaginationState" class="pagination-buttons">
            <button
              type="button"
              class="pagination-button"
              :disabled="currentPage <= 1"
              @click="setPage(currentPage - 1)"
            >
              Anterior
            </button>
            <button
              type="button"
              class="pagination-button"
              :disabled="currentPage >= totalPages"
              @click="setPage(currentPage + 1)"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

export type Align = 'start' | 'center' | 'end'

export interface GenericTableHeader {
  key: string
  title: string
  align?: Align
  sortable?: boolean
  width?: string | number
}

export type GenericTableItem = Record<string, unknown>

type ItemsPerPageOption = number | { title: string; value: number }

export type RowClassType =
  | string
  | string[]
  | Record<string, boolean>
  | ((item: GenericTableItem, index: number) => string | string[] | Record<string, boolean>)

interface TableProps {
  headers?: GenericTableHeader[]
  items?: GenericTableItem[]
  loading?: boolean
  itemsPerPage?: number
  itemsPerPageOptions?: ItemsPerPageOption[]
  density?: 'default' | 'comfortable' | 'compact'
  mobileBreakpoint?: number
  height?: string | number | undefined
  fixedHeader?: boolean
  hover?: boolean
  enableRowClick?: boolean
  enableRowDblClick?: boolean
  enableRowFocus?: boolean
  emitRowClickOnTouchDevices?: boolean
  rowClass?: RowClassType
  disablePagination?: boolean
  hideFooter?: boolean
  headerColor?: string
  headerTextColor?: string
  elevation?: number | string
  borderless?: boolean
}

const props = withDefaults(defineProps<TableProps>(), {
  headers: () => [],
  items: () => [],
  loading: false,
  itemsPerPage: 10,
  itemsPerPageOptions: () => [10, 25, 50],
  density: 'default',
  mobileBreakpoint: 0,
  height: undefined,
  fixedHeader: false,
  hover: true,
  enableRowClick: false,
  enableRowDblClick: false,
  enableRowFocus: false,
  emitRowClickOnTouchDevices: false,
  rowClass: undefined,
  disablePagination: false,
  hideFooter: false,
  headerColor: undefined,
  headerTextColor: undefined,
  elevation: 1,
  borderless: false
})

const emit = defineEmits<{ (event: 'row-click', item: GenericTableItem): void }>()

const tableItems = computed(() => props.items ?? [])
const loadingState = computed(() => props.loading)
const disablePaginationState = computed(() => props.disablePagination)
const itemsPerPageState = computed(() => (props.disablePagination ? -1 : props.itemsPerPage))
const itemsPerPageOptionsState = computed(() => (props.disablePagination ? [] : props.itemsPerPageOptions))
const hideFooterState = computed(() => props.disablePagination || props.hideFooter)
const densityState = computed(() => props.density)
const hoverState = computed(() => props.hover)
const enableRowClickState = computed(() => props.enableRowClick)
const enableRowFocusState = computed(() => props.enableRowFocus)
const rowClassState = computed(() => props.rowClass)
const fixedHeaderState = computed(() => props.fixedHeader)
const mobileBreakpointState = computed(() => props.mobileBreakpoint ?? 0)

const internalItemsPerPage = ref(itemsPerPageState.value)

watch(itemsPerPageState, value => {
  internalItemsPerPage.value = value
  if (value === -1) {
    currentPage.value = 1
  }
})

const currentPage = ref(1)

const effectiveItemsPerPage = computed(() => internalItemsPerPage.value ?? -1)

const totalItems = computed(() => tableItems.value.length)

const totalPages = computed(() => {
  const size = effectiveItemsPerPage.value
  if (size <= 0) {
    return 1
  }
  return Math.max(1, Math.ceil(totalItems.value / size))
})

watch([tableItems, effectiveItemsPerPage], () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = totalPages.value
  }
})

const paginatedItems = computed(() => {
  const size = effectiveItemsPerPage.value
  if (size <= 0) {
    return tableItems.value
  }
  const start = (currentPage.value - 1) * size
  return tableItems.value.slice(start, start + size)
})

const paginationLabel = computed(() => {
  if (!totalItems.value) {
    return '0 de 0'
  }
  const size = effectiveItemsPerPage.value
  if (size <= 0) {
    return `${totalItems.value} de ${totalItems.value}`
  }
  const start = (currentPage.value - 1) * size + 1
  const end = Math.min(currentPage.value * size, totalItems.value)
  return `${start} - ${end} de ${totalItems.value}`
})

const normalizedItemsPerPageOptions = computed(() => {
  return (itemsPerPageOptionsState.value ?? []).map(option => {
    if (typeof option === 'number') {
      return { label: option.toString(), value: option }
    }
    return { label: option.title, value: option.value }
  })
})

const currentItemsPerPage = computed(() => {
  const value = effectiveItemsPerPage.value
  if (value <= 0) {
    return -1
  }
  return value
})

const setPage = (page: number) => {
  const next = Math.min(Math.max(page, 1), totalPages.value)
  currentPage.value = next
}

const onChangeItemsPerPage = (event: Event) => {
  const target = event.target as HTMLSelectElement | null
  const rawValue = target?.value
  if (!rawValue) {
    return
  }
  const parsed = Number.parseInt(rawValue, 10)
  if (Number.isNaN(parsed) || parsed <= 0) {
    internalItemsPerPage.value = -1
  } else {
    internalItemsPerPage.value = parsed
  }
  currentPage.value = 1
}

const humanizeKey = (key: string) =>
  key
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .replace(/^./, char => char.toUpperCase())

const normalizeKey = (key: unknown): string => {
  if (typeof key === 'string') {
    return key
  }
  if (typeof key === 'number') {
    return key.toString()
  }
  if (typeof key === 'symbol') {
    return key.description ?? key.toString()
  }
  return ''
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object'

const resolveContainer = (item: unknown): GenericTableItem => {
  if (!isObject(item)) {
    return {} as GenericTableItem
  }

  if (isObject(item.raw)) {
    return item.raw as GenericTableItem
  }

  if (isObject(item.value)) {
    return item.value as GenericTableItem
  }

  return item as GenericTableItem
}

const extractRawItem = (item: unknown): GenericTableItem => resolveContainer(item)

const resolveValue = (item: unknown, key: unknown) => {
  const container = resolveContainer(item)
  const normalizedKey = normalizeKey(key)
  if (!normalizedKey) {
    return undefined
  }
  return container[normalizedKey]
}

const formatValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return ''
  }
  if (value instanceof Date) {
    return value.toLocaleString()
  }
  if (typeof value === 'number') {
    return value.toLocaleString('es-MX')
  }
  if (typeof value === 'string') {
    return value
  }
  return JSON.stringify(value)
}

const alignmentClass = (align: Align | undefined) => {
  switch (align) {
    case 'center':
      return 'text-center'
    case 'end':
      return 'text-right'
    default:
      return 'text-left'
  }
}

const autoGenerateHeaders = (items: GenericTableItem[]): GenericTableHeader[] => {
  const sample = items[0]
  if (!sample) {
    return []
  }
  const container = resolveContainer(sample)
  return Object.keys(container).map(key => ({
    key,
    title: humanizeKey(key),
    align: 'start' as const,
    sortable: false
  }))
}

const computedHeaders = computed<GenericTableHeader[]>(() => {
  if (props.headers && props.headers.length > 0) {
    return props.headers
  }
  return autoGenerateHeaders(tableItems.value)
})

const resolveRowKey = (item: GenericTableItem, index: number) => {
  const rawItem = extractRawItem(item)
  if (isObject(rawItem) && 'id' in rawItem && rawItem.id != null) {
    return String(rawItem.id)
  }
  return `${index}`
}

const rowClasses = (item: GenericTableItem, index: number) => {
  const rawItem = extractRawItem(item)
  const classes: Array<string | string[] | Record<string, boolean>> = [
    'table-row',
    hoverState.value ? 'row-hover' : '',
    enableRowClickState.value ? 'row-clickable' : '',
    enableRowFocusState.value ? 'row-focusable' : ''
  ]

  const value = rowClassState.value
  if (typeof value === 'function') {
    classes.push(value(rawItem, index))
  } else if (value) {
    classes.push(value)
  }

  return classes
}

const densityPadding = computed(() => {
  switch (densityState.value) {
    case 'compact':
      return { header: 'px-3 py-2', cell: 'px-3 py-2' }
    case 'comfortable':
      return { header: 'px-4 py-3', cell: 'px-4 py-3' }
    default:
      return { header: 'px-4 py-3.5', cell: 'px-4 py-3.5' }
  }
})

const shouldWrapCells = ref(false)

const updateWrapState = () => {
  if (typeof window === 'undefined') {
    return
  }
  const breakpoint = mobileBreakpointState.value
  if (!breakpoint || breakpoint <= 0) {
    shouldWrapCells.value = false
    return
  }
  shouldWrapCells.value = window.innerWidth <= breakpoint
}

onMounted(() => {
  updateWrapState()
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateWrapState, { passive: true })
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateWrapState)
  }
})

watch(mobileBreakpointState, () => {
  updateWrapState()
})

const headerCellClass = (header: GenericTableHeader) => [
  'header-cell',
  alignmentClass(header.align),
  densityPadding.value.header,
  shouldWrapCells.value ? 'wrap-text' : 'nowrap-text'
]

const cellClass = (header: GenericTableHeader) => [
  'data-cell',
  alignmentClass(header.align),
  densityPadding.value.cell,
  shouldWrapCells.value ? 'wrap-text break-words' : 'nowrap-text'
]

const toCssSize = (value: string | number | undefined) => {
  if (value === undefined) {
    return undefined
  }
  return typeof value === 'number' ? `${value}px` : value
}

const headerStyleBase = computed(() => {
  if (!props.headerColor && !props.headerTextColor) {
    return undefined
  }
  return {
    backgroundColor: props.headerColor,
    color: props.headerTextColor
  } as Record<string, string | undefined>
})

const headerCellStyle = (header: GenericTableHeader) => {
  const width = toCssSize(header.width)
  const base = headerStyleBase.value ?? {}
  return {
    ...base,
    width: width
  }
}

const cellStyle = (header: GenericTableHeader) => ({
  width: toCssSize(header.width)
})

const handleRowClick = (item: GenericTableItem) => {
  if (!enableRowClickState.value) {
    return
  }
  emit('row-click', extractRawItem(item))
}

const handleRowActivate = (item: GenericTableItem) => {
  if (!enableRowFocusState.value || !enableRowClickState.value) {
    return
  }
  emit('row-click', extractRawItem(item))
}

const containerClasses = computed(() => {
  return []
})

const tableWrapperClasses = computed(() => '')

const resolvedHeight = computed(() => toCssSize(props.height))

const scrollContainerClasses = computed(() => [
  'scroll-container',
  resolvedHeight.value ? 'with-scroll' : ''
])

const scrollContainerStyle = computed(() => {
  if (!resolvedHeight.value) {
    return undefined
  }
  return {
    maxHeight: resolvedHeight.value
  }
})

const theadClasses = computed(() => {
  const classes: string[] = ['table-header']
  if (fixedHeaderState.value) {
    classes.push('fixed-header')
  }
  return classes
})
</script>

<style scoped>
.table-container {
  margin: 24px 40px;
  background: linear-gradient(135deg, rgba(250, 250, 250, 0.95), rgba(255, 255, 255, 0.98));
  border: 1px solid rgba(0, 120, 212, 0.12);
  border-radius: 12px;
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.06),
    0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
  overflow: hidden;
}

.table-container:hover {
  box-shadow:
    0 8px 28px rgba(0, 0, 0, 0.1),
    0 4px 8px rgba(0, 0, 0, 0.06);
  border-color: rgba(0, 120, 212, 0.25);
}

.loading-bar {
  position: relative;
  width: 100%;
}

.progress-container {
  height: 3px;
  width: 100%;
  overflow: hidden;
  background: linear-gradient(to right, rgba(0, 120, 212, 0.1), rgba(0, 120, 212, 0.2));
}

.progress-bar {
  height: 100%;
  width: 33.333%;
  background: linear-gradient(to right, #0078d4, #00b4ff);
  animation: progress 1.4s ease-in-out infinite;
  box-shadow: 0 0 10px rgba(0, 120, 212, 0.5);
}

@keyframes progress {
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(50%);
  }
  100% {
    transform: translateX(200%);
  }
}

.table-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.table-scroll-x {
  overflow-x: auto;
}

.scroll-container {
  position: relative;
}

.scroll-container.with-scroll {
  overflow-y: auto;
}

.data-table {
  min-width: 100%;
  border-collapse: collapse;
  font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
}

.table-header {
  background: linear-gradient(to bottom, #004dBAFF, #003d6e);
  color: white;
}

.table-header.fixed-header {
  position: sticky;
  top: 0;
}

.header-cell {
  padding: 16px 20px;
  text-align: left;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: rgba(255, 255, 255, 0.95);
  border-bottom: 1px solid rgba(0, 180, 255, 0.2);
  background: transparent;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.header-cell strong {
  font-weight: 600;
}

.table-body {
  background: #ffffff;
}

.table-row {
  border-bottom: 1px solid rgba(0, 120, 212, 0.08);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.table-row.row-hover:hover {
  background: linear-gradient(to right,
    rgba(0, 120, 212, 0.06),
    rgba(0, 180, 255, 0.04)
  );
  box-shadow: inset 3px 0 0 rgba(0, 180, 255, 0.4);
}

.table-row.row-clickable {
  cursor: pointer;
}

.table-row.row-focusable:focus {
  outline: none;
  box-shadow: inset 3px 0 0 #0078d4;
  background: rgba(0, 120, 212, 0.05);
}

.table-row.row-focusable:focus-visible {
  outline: 2px solid rgba(0, 120, 212, 0.6);
  outline-offset: -2px;
}

.data-cell {
  padding: 14px 20px;
  font-size: 14px;
  color: #333;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.no-data-cell {
  padding: 48px 20px;
  text-align: center;
  font-size: 15px;
  color: #666;
  font-style: italic;
}

.text-left {
  text-align: left;
}

.text-center {
  text-align: center;
}

.text-right {
  text-align: right;
}

.wrap-text {
  white-space: normal;
}

.nowrap-text {
  white-space: nowrap;
}

.break-words {
  word-break: break-word;
}

.table-footer {
  border-top: 1px solid rgba(0, 120, 212, 0.15);
  background: linear-gradient(to bottom,
    rgba(245, 250, 255, 0.8),
    rgba(250, 252, 255, 0.9)
  );
  backdrop-filter: blur(10px);
}

.footer-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 20px;
}

@media (min-width: 640px) {
  .footer-content {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.items-per-page {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: #555;
}

.select-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 8px;
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

.page-size-select {
  padding: 8px 12px;
  border: 1px solid rgba(0, 120, 212, 0.25);
  border-radius: 6px;
  font-size: 14px;
  font-family: 'Segoe UI', sans-serif;
  background: linear-gradient(to bottom, #fff, rgba(245, 250, 255, 0.8));
  color: #333;
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-size-select:hover {
  border-color: #0078d4;
  background: #fff;
}

.page-size-select:focus {
  outline: none;
  border-color: #0078d4;
  box-shadow: 0 0 0 3px rgba(0, 120, 212, 0.15);
}

.pagination-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
  color: #555;
}

@media (min-width: 640px) {
  .pagination-info {
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    gap: 16px;
  }
}

.pagination-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pagination-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border: 1px solid rgba(0, 120, 212, 0.3);
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #0078d4;
  background: linear-gradient(to bottom,
    rgba(255, 255, 255, 0.95),
    rgba(245, 250, 255, 0.9)
  );
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.pagination-button:hover:not(:disabled) {
  background: linear-gradient(to bottom,
    rgba(0, 120, 212, 0.1),
    rgba(0, 120, 212, 0.15)
  );
  border-color: #0078d4;
  box-shadow: 0 4px 12px rgba(0, 120, 212, 0.15);
  transform: translateY(-1px);
}

.pagination-button:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 120, 212, 0.2);
}

.pagination-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
  color: #999;
  background: rgba(240, 240, 240, 0.8);
  border-color: rgba(0, 0, 0, 0.1);
  box-shadow: none;
}
</style>
