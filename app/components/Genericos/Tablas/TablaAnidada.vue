<template>
  <div class="nested-table-wrapper">
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
        <thead class="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th
              v-for="header in computedHeaders"
              :key="`header-${header.key}`"
              :class="[
                'px-4 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white',
                alignmentClass(header.align),
                header.key === EXPAND_COLUMN_KEY ? 'w-12' : ''
              ]"
              :style="headerCellStyle"
            >
              <slot :name="`header.${header.key}`" :header="header">
                <strong>{{ header.title }}</strong>
              </slot>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
          <template v-if="loadingState">
            <tr>
              <td :colspan="computedHeaders.length" class="px-4 py-8">
                <div class="flex justify-center items-center">
                  <UIcon name="i-heroicons-arrow-path" class="animate-spin h-6 w-6" />
                </div>
              </td>
            </tr>
          </template>
          <template v-else-if="tableItems.length === 0">
            <tr>
              <td :colspan="computedHeaders.length" class="px-4 py-8">
                <div class="flex flex-col items-center justify-center gap-3">
                  <slot name="no-data">
                    <span class="text-sm text-gray-500 dark:text-gray-400">No hay datos disponibles</span>
                  </slot>
                </div>
              </td>
            </tr>
          </template>
          <template v-else>
            <template v-for="(item, index) in tableItems" :key="resolveRowKey(item, index)">
              <tr
                :class="[
                  'transition-colors',
                  hoverState ? 'hover:bg-gray-50 dark:hover:bg-gray-800/50' : '',
                  enableRowClickState ? 'cursor-pointer' : '',
                  rowClassName(item, index)
                ]"
                :tabindex="enableRowFocusState ? 0 : undefined"
                @click="handleRowClick(item, index)"
                @dblclick.prevent="handleRowDblClick(item)"
                @keyup.enter.prevent="handleKeyboardActivate(item)"
              >
                <td
                  v-for="header in computedHeaders"
                  :key="`${header.key}-${index}`"
                  :class="[
                    'px-4 py-3.5 text-sm text-gray-500 dark:text-gray-400',
                    alignmentClass(header.align),
                    header.key === EXPAND_COLUMN_KEY ? 'w-12' : ''
                  ]"
                >
                  <template v-if="header.key === EXPAND_COLUMN_KEY">
                    <button
                      v-if="showExpandColumnState"
                      :icon="isRowExpanded(item, index) ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
                      variant="ghost"
                      color="neutral"
                      size="xs"
                      :disabled="!hasNestedItems(item, index)"
                      @click.stop="toggleRowExpansion(item, index)"
                    />
                  </template>
                  <template v-else>
                    <slot
                      :name="`item.${header.key}`"
                      :item="item"
                      :value="(item as any)[header.key]"
                      :index="index"
                    >
                      {{ formatValue((item as any)[header.key]) }}
                    </slot>
                  </template>
                </td>
              </tr>
              <tr v-if="isRowExpanded(item, index) && hasNestedItems(item, index)">
                <td :colspan="computedHeaders.length" class="p-0 bg-gray-50 dark:bg-gray-900/50">
                  <div class="p-4">
                    <slot
                      name="nested-table"
                      :item="item"
                      :index="index"
                      :nested-items="getNestedItems(item, index)"
                      :toggle="() => toggleRowExpansion(item, index)"
                    >
                      <TablaGenerica
                        class="nested-child-table"
                        :headers="nestedHeadersState"
                        :items="getNestedItems(item, index)"
                        :loading="isNestedLoading(item)"
                        :disable-pagination="nestedDisablePaginationState"
                        :hide-footer="nestedHideFooterState"
                        :density="nestedDensityState"
                        :header-color="nestedHeaderColorState"
                        :header-text-color="nestedHeaderTextColorState"
                        :borderless="true"
                        :elevation="0"
                      >
                        <template #no-data>
                          <div class="py-3 text-center">
                            <span class="text-sm text-gray-500 dark:text-gray-400">{{ nestedNoDataTextState }}</span>
                          </div>
                        </template>
                      </TablaGenerica>
                    </slot>
                  </div>
                </td>
              </tr>
            </template>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import TablaGenerica, { type GenericTableHeader, type GenericTableItem } from './Tabla.vue'

const EXPAND_COLUMN_KEY = '__expand__'

export type RowClassType =
  | string
  | string[]
  | Record<string, boolean>
  | ((item: GenericTableItem, index: number) => string | string[] | Record<string, boolean>)

export type NestedTableItemsAccessor = (
  item: GenericTableItem,
  index: number
) => GenericTableItem[] | undefined

export interface NestedRowTogglePayload {
  item: GenericTableItem
  expanded: boolean
}

export interface NestedTableItem extends GenericTableItem {
  [key: string]: unknown
}

interface NestedTableProps {
  headers?: GenericTableHeader[]
  items?: NestedTableItem[]
  loading?: boolean
  itemsPerPage?: number
  itemsPerPageOptions?: number[] | { title: string; value: number }[]
  mobileBreakpoint?: number
  density?: 'default' | 'comfortable' | 'compact'
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
  nestedHeaders?: GenericTableHeader[]
  nestedItemsKey?: string
  nestedNoDataText?: string
  nestedDisablePagination?: boolean
  nestedHideFooter?: boolean
  nestedDensity?: 'default' | 'comfortable' | 'compact'
  nestedItemsAccessor?: NestedTableItemsAccessor
  nestedLoadingKey?: string
  nestedHeaderColor?: string
  nestedHeaderTextColor?: string
  showExpandColumn?: boolean
  expandColumnWidth?: number | string
  rowKey?: string | ((item: GenericTableItem, index: number) => string | number)
  expandOnRowClick?: boolean
  hiddenKeys?: unknown[]
}

const props = withDefaults(defineProps<NestedTableProps>(), {
  headers: () => [],
  items: () => [],
  loading: false,
  itemsPerPage: 15,
  itemsPerPageOptions: () => [15, 30, 50, 100],
  mobileBreakpoint: 0,
  density: 'default',
  fixedHeader: false,
  hover: true,
  enableRowClick: true,
  enableRowDblClick: false,
  enableRowFocus: true,
  emitRowClickOnTouchDevices: true,
  disablePagination: false,
  hideFooter: false,
  headerColor: undefined,
  headerTextColor: undefined,
  nestedHeaders: undefined,
  nestedItemsKey: 'children',
  nestedNoDataText: 'No hay registros relacionados',
  nestedDisablePagination: true,
  nestedHideFooter: true,
  nestedDensity: 'compact',
  nestedItemsAccessor: undefined,
  nestedLoadingKey: undefined,
  nestedHeaderColor: undefined,
  nestedHeaderTextColor: undefined,
  showExpandColumn: true,
  expandColumnWidth: 52,
  rowKey: undefined,
  expandOnRowClick: false,
  hiddenKeys: () => []
})

const emit = defineEmits<{
  (e: 'row-click', item: GenericTableItem): void
  (e: 'row-dblclick', item: GenericTableItem): void
  (e: 'row-toggle', payload: NestedRowTogglePayload): void
}>()

const tableItems = computed(() => props.items ?? [])

const loadingState = computed(() => props.loading)
const itemsPerPageState = computed(() => (props.disablePagination ? -1 : props.itemsPerPage))
const itemsPerPageOptionsState = computed(() => (props.disablePagination ? [] : props.itemsPerPageOptions))
const mobileBreakpointState = computed(() => props.mobileBreakpoint)
const densityState = computed(() => props.density)
const heightState = computed(() => props.height)
const fixedHeaderState = computed(() => props.fixedHeader)
const hoverState = computed(() => props.hover)
const enableRowClickState = computed(() => props.enableRowClick)
const enableRowDblClickState = computed(() => props.enableRowDblClick)
const enableRowFocusState = computed(() => props.enableRowFocus)
const emitRowClickOnTouchDevicesState = computed(() => props.emitRowClickOnTouchDevices)
const rowClassState = computed(() => props.rowClass)
const hideFooterState = computed(() => props.disablePagination || props.hideFooter)
const showExpandColumnState = computed(() => props.showExpandColumn)
const nestedDisablePaginationState = computed(() => Boolean(props.nestedDisablePagination))
const nestedHideFooterState = computed(() => Boolean(props.nestedHideFooter))
const nestedDensityState = computed(() => props.nestedDensity)
const nestedHeaderColorState = computed(() => props.nestedHeaderColor)
const nestedHeaderTextColorState = computed(() => props.nestedHeaderTextColor)
const nestedNoDataTextState = computed(() => props.nestedNoDataText)
const nestedItemsKeyState = computed(() => props.nestedItemsKey)
const expandColumnWidthState = computed(() => props.expandColumnWidth)
const hiddenKeysState = computed(() => props.hiddenKeys ?? [])

const headerCellStyle = computed(() => {
  if (!props.headerColor && !props.headerTextColor) {
    return undefined
  }

  return {
    backgroundColor: props.headerColor,
    color: props.headerTextColor
  }
})

const isTouchDevice = ref(false)

onMounted(() => {
  if (typeof window !== 'undefined' && 'matchMedia' in window) {
    isTouchDevice.value = window.matchMedia('(pointer: coarse)').matches
  }
})

const alignmentClass = (align: GenericTableHeader['align']) => {
  switch (align) {
    case 'center':
      return 'text-center'
    case 'end':
      return 'text-right'
    default:
      return 'text-left'
  }
}

const humanizeKey = (key: string) => {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .replace(/^./, char => char.toUpperCase())
}

const normalizeKeyForComparison = (key: unknown): string => {
  if (typeof key === 'string') {
    return key.toLowerCase()
  }
  if (typeof key === 'number') {
    return key.toString().toLowerCase()
  }
  if (typeof key === 'symbol') {
    return (key.description ?? key.toString()).toLowerCase()
  }
  return ''
}

const hiddenKeysSet = computed(() => {
  const entries = Array.isArray(hiddenKeysState.value) ? hiddenKeysState.value : []
  return new Set(entries.map(normalizeKeyForComparison))
})

const isHiddenKey = (key: unknown) => hiddenKeysSet.value.has(normalizeKeyForComparison(key))

const filterHiddenHeaders = (headers: GenericTableHeader[]) =>
  headers.filter((header: GenericTableHeader) => !isHiddenKey(header.key))

const computedHeaders = computed<GenericTableHeader[]>(() => {
  const baseHeaders: GenericTableHeader[] =
    props.headers && props.headers.length > 0
      ? props.headers
      : autoGenerateHeaders(tableItems.value)

  const filteredHeaders = filterHiddenHeaders(baseHeaders)

  if (!showExpandColumnState.value) {
    return filteredHeaders
  }

  const hasExpandColumn = filteredHeaders.some(header => normalizeKeyForComparison(header.key) === normalizeKeyForComparison(EXPAND_COLUMN_KEY))
  if (hasExpandColumn) {
    return filteredHeaders
  }

  const expandHeader: GenericTableHeader = {
    key: EXPAND_COLUMN_KEY,
    title: '',
    align: 'center',
    sortable: false,
    width: expandColumnWidthState.value
  }

  return [expandHeader, ...filteredHeaders]
})

const autoGenerateHeaders = (items: GenericTableItem[]): GenericTableHeader[] => {
  const sample = items[0]
  if (!sample) {
    return []
  }

  return Object.keys(sample)
    .filter(key => !isHiddenKey(key))
    .map(key => ({
      key,
      title: humanizeKey(key),
      align: 'start' as const,
      sortable: false
    }))
}

const extractRawItem = (item: unknown): GenericTableItem => {
  return (item ?? {}) as GenericTableItem
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

const rowClassName = (item: GenericTableItem, index: number) => {
  const value = rowClassState.value
  if (typeof value === 'function') {
    return value(item, index)
  }
  return value
}

const nestedHeadersState = computed<GenericTableHeader[]>(() => {
  if (props.nestedHeaders && props.nestedHeaders.length > 0) {
    return filterHiddenHeaders(props.nestedHeaders)
  }

  for (let index = 0; index < tableItems.value.length; index += 1) {
    const item = tableItems.value[index]
    if (!item) continue
    
    const nestedItems = getNestedItems(item, index)
    if (nestedItems.length > 0) {
      const sample = nestedItems[0]
      if (!sample) continue
      
      return Object.keys(sample)
        .filter(key => !isHiddenKey(key))
        .map(key => ({
          key,
          title: humanizeKey(key),
          align: 'start' as const,
          sortable: false
        }))
    }
  }

  return []
})

const expandedKeys = ref(new Set<string>())

const resolveRowKey = (item: GenericTableItem, index: number): string => {
  const { rowKey } = props
  if (typeof rowKey === 'function') {
    return String(rowKey(item, index))
  }

  if (typeof rowKey === 'string' && rowKey.length > 0) {
    const value = item[rowKey]
    if (value !== undefined && value !== null) {
      return String(value)
    }
  }

  const fallback = item.id ?? index
  return String(fallback)
}

const setExpandedKey = (key: string, expanded: boolean) => {
  const newSet = new Set(expandedKeys.value)
  if (expanded) {
    newSet.add(key)
  } else {
    newSet.delete(key)
  }
  expandedKeys.value = newSet
}

const isRowExpanded = (item: GenericTableItem, index: number) => {
  const key = resolveRowKey(item, index)
  return expandedKeys.value.has(key)
}

const toggleRowExpansion = (item: GenericTableItem, index: number) => {
  const key = resolveRowKey(item, index)
  const willExpand = !expandedKeys.value.has(key)
  setExpandedKey(key, willExpand)
  emit('row-toggle', { item, expanded: willExpand })
}

const hasNestedItems = (item: GenericTableItem, index: number) => {
  return getNestedItems(item, index).length > 0
}

const getNestedItems = (item: GenericTableItem, index: number) => {
  if (typeof props.nestedItemsAccessor === 'function') {
    const result = props.nestedItemsAccessor(item, index)
    return Array.isArray(result) ? result : []
  }

  const key = nestedItemsKeyState.value
  if (!key) {
    return []
  }

  const value = item[key]
  return Array.isArray(value) ? (value as GenericTableItem[]) : []
}

const isNestedLoading = (item: GenericTableItem) => {
  if (!props.nestedLoadingKey) {
    return false
  }

  const value = item[props.nestedLoadingKey]
  return Boolean(value)
}

const handleRowClick = (item: GenericTableItem, index: number) => {
  if (!enableRowClickState.value) {
    return
  }

  emit('row-click', item)

  const shouldEmitToggle =
    props.expandOnRowClick && showExpandColumnState.value && hasNestedItems(item, index)

  if (
    shouldEmitToggle &&
    (!enableRowDblClickState.value || !emitRowClickOnTouchDevicesState.value || !isTouchDevice.value)
  ) {
    toggleRowExpansion(item, index)
  }

  if (
    enableRowDblClickState.value &&
    emitRowClickOnTouchDevicesState.value &&
    isTouchDevice.value
  ) {
    emit('row-dblclick', item)
  }
}

const handleRowDblClick = (item: GenericTableItem) => {
  if (enableRowDblClickState.value) {
    emit('row-dblclick', item)
  }
}

const handleKeyboardActivate = (item: GenericTableItem) => {
  if (enableRowDblClickState.value) {
    emit('row-dblclick', item)
  } else if (enableRowClickState.value) {
    emit('row-click', item)
  }
}

watch(
  tableItems,
  (items) => {
    const validKeys = new Set<string>()
    items.forEach((item, index) => {
      validKeys.add(resolveRowKey(item, index))
    })

    const newSet = new Set<string>()
    expandedKeys.value.forEach(key => {
      if (validKeys.has(key)) {
        newSet.add(key)
      }
    })

    // Solo actualizar si realmente cambió el conjunto de claves válidas
    // Esto previene re-renders innecesarios cuando solo cambian los datos internos
    if (newSet.size !== expandedKeys.value.size) {
      expandedKeys.value = newSet
    }
  },
  { deep: false }
)
</script>

<style scoped>
.nested-table-wrapper {
  width: 100%;
}

.text-center {
  text-align: center;
}

.text-right {
  text-align: right;
}

.text-left {
  text-align: left;
}

.nested-child-table {
  width: 100%;
}
</style>
