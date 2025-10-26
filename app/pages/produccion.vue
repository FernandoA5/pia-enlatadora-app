<template>
  <Catalogo
    :items="producciones"
    :loading="loading"
    search-placeholder="Buscar producción"
    :search-keys="searchKeys"
    :extract-item-id="extractId"
    :excluded-columns="['id_producto']"
    :should-show-edit-button="shouldShowEditButton"
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

    <template #item.actions.extra="{ item, loading }">
      <button
        type="button"
        class="action-button action-button--control"
        aria-label="Registrar control de calidad"
        :disabled="loading"
        @click.stop="handleControlCalidad(item)"
      >
        <Icon name="mdi:clipboard-check-outline" class="action-button__icon" aria-hidden="true" />
      </button>
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

  <ControlCalidadFormulario
    v-if="controlCalidadModalVisible && selectedProduccionId != null"
    :model-value="controlCalidadModalVisible"
    :control="controlCalidadSeleccionada"
    :loading="controlCalidadModalLoading"
    :id-produccion="selectedProduccionId"
    @update:modelValue="handleControlCalidadModalVisibility"
    @submit="handleControlCalidadSubmit"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Catalogo from '~/components/Catalogos/Catalogo.vue'
import ProduccionModal from '~/components/Catalogos/Produccion/Modales/Registrar.vue'
import ControlCalidadFormulario from '~/components/Produccion/ControlesCalidad/Formulario.vue'
import type { GenericTableItem } from '~/components/Genericos/Tablas/Tabla.vue'
import { useProduccionApi } from '~/composables/useProduccionApi'
import { useProductosApi } from '~/composables/useProductosApi'
import { ProduccionEstado } from '~/types/produccion'
import { CONTROL_CALIDAD_RESULTADO_OPTIONS } from '~/types/controlCalidad'

const searchKeys = ['estado']

const {
  listProducciones,
  createProduccion,
  updateProduccion,
  deactivateProduccion,
  getControlCalidadByProduccion,
  createControlCalidad,
  updateControlCalidad
} = useProduccionApi()

const { listProductos } = useProductosApi()

const producciones = ref<GenericTableItem[]>([])
const loading = ref(false)
const modalLoading = ref(false)
const productos = ref<Array<{ id: string | number; nombre: string }>>([])
const controlCalidadModalVisible = ref(false)
const controlCalidadModalLoading = ref(false)
type ControlCalidadLike = {
  id?: number | string | null
  resultado?: string | null
  observaciones?: string | null
  fecha_control?: string | null
}
const controlCalidadSeleccionada = ref<ControlCalidadLike | null>(null)
const produccionSeleccionada = ref<GenericTableItem | null>(null)

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

const toOptionalString = (value: unknown) => {
  if (value === null || value === undefined) {
    return null
  }
  const stringValue = String(value)
  return stringValue.trim().length > 0 ? stringValue : null
}

const extractControlCalidad = (item: GenericTableItem): ControlCalidadLike | null => {
  const record = item as Record<string, unknown>
  const idCandidate = record.id_control ?? record.control_id ?? null
  const resultadoCandidate =
    record.resultado ?? record.resultado_control ?? record.control_resultado ?? null
  const observacionesCandidate =
    record.observaciones ?? record.control_observaciones ?? record.observaciones_control ?? null
  const fechaControlCandidate =
    record.fecha_control ?? record.control_fecha_control ?? record.fecha_revision ?? null

  const resultado = toOptionalString(resultadoCandidate)
  const observaciones = toOptionalString(observacionesCandidate)
  const fecha_control = toOptionalString(fechaControlCandidate)

  if (resultado === null && observaciones === null && idCandidate === null && fecha_control === null) {
    return null
  }

  return {
    id: typeof idCandidate === 'string' || typeof idCandidate === 'number' ? idCandidate : null,
    resultado,
    observaciones,
    fecha_control
  }
}

const adaptControlCalidadRecord = (raw: unknown): ControlCalidadLike | null => {
  if (Array.isArray(raw)) {
    const [first] = raw
    return adaptControlCalidadRecord(first)
  }

  if (!raw || typeof raw !== 'object') {
    return null
  }

  const record = raw as Record<string, unknown>

  const id = (() => {
    const candidate = record.id ?? record.id_control
    return typeof candidate === 'number' || typeof candidate === 'string' ? candidate : null
  })()

  const resultado = toOptionalString(record.resultado)
  const observaciones = toOptionalString(record.observaciones)
  const fecha_control = toOptionalString(record.fecha_control)

  if (id === null && resultado === null && observaciones === null && fecha_control === null) {
    return null
  }

  return {
    id,
    resultado,
    observaciones,
    fecha_control
  }
}

const handleControlCalidad = async (item: GenericTableItem) => {
  produccionSeleccionada.value = item
  controlCalidadSeleccionada.value = extractControlCalidad(item)
  controlCalidadModalVisible.value = true

  const id = extractId(item)
  if (id == null) {
    return
  }

  controlCalidadModalLoading.value = true
  try {
    const response = await getControlCalidadByProduccion(id)
    const raw = (response as { data?: unknown }).data ?? response
    controlCalidadSeleccionada.value = adaptControlCalidadRecord(raw)
  } catch (error) {
    console.error('Error al obtener control de calidad:', error)
    controlCalidadSeleccionada.value = null
  } finally {
    controlCalidadModalLoading.value = false
  }
}

const handleControlCalidadModalVisibility = (value: boolean) => {
  controlCalidadModalVisible.value = value
  if (!value) {
    controlCalidadSeleccionada.value = null
    produccionSeleccionada.value = null
  }
}

const handleControlCalidadSubmit = async ({
  data,
  id
}: {
  data: Record<string, unknown>
  id?: string | number | null
}) => {
  controlCalidadModalLoading.value = true
  try {
    const resolvedProduccionId = selectedProduccionId.value ?? data.id_produccion

    if (resolvedProduccionId === null || resolvedProduccionId === undefined) {
      throw new Error('No se pudo determinar el ID de la producción para el control de calidad')
    }

    const numericProduccionId = (() => {
      if (typeof resolvedProduccionId === 'number') {
        return resolvedProduccionId
      }
      const parsed = Number(resolvedProduccionId)
      return Number.isNaN(parsed) ? String(resolvedProduccionId) : parsed
    })()

    const basePayload = {
      resultado: String(data.resultado ?? '').trim(),
      observaciones: toOptionalString(data.observaciones ?? '') ?? '',
      fecha_control: String(data.fecha_control ?? '').trim(),
      activo: Boolean(data.activo ?? true),
      id_produccion: numericProduccionId
    }

    if (!basePayload.resultado || !basePayload.fecha_control || basePayload.id_produccion == null) {
      throw new Error('Datos incompletos para registrar el control de calidad')
    }

    if (id != null) {
      await updateControlCalidad(id, basePayload)
    } else {
      await createControlCalidad(basePayload)
    }

    await fetchProducciones()
  } catch (error) {
    console.error('Error al guardar control de calidad:', error)
  } finally {
    controlCalidadModalLoading.value = false
    handleControlCalidadModalVisibility(false)
  }
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

const selectedProduccionId = computed(() => {
  const item = produccionSeleccionada.value
  if (!item) {
    return null
  }
  return extractId(item)
})

const shouldShowEditButton = (item: GenericTableItem) => {
  const record = item as Record<string, unknown>
  const estado = String(record.estado ?? '').trim()

  if (!estado) {
    return true
  }

  if (CONTROL_CALIDAD_RESULTADO_OPTIONS.includes(estado as (typeof CONTROL_CALIDAD_RESULTADO_OPTIONS)[number])) {
    return false
  }

  return Object.values(ProduccionEstado).includes(estado as ProduccionEstado)
}

onMounted(() => {
  fetchProducciones()
  fetchProductos()
})
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
  background: transparent;
  color: #0369a1;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;
  cursor: pointer;
}

.action-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 20px rgba(7, 89, 133, 0.2);
}

.action-button:active {
  transform: translateY(0);
  box-shadow: 0 6px 14px rgba(7, 89, 133, 0.12);
}

.action-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  box-shadow: none;
  transform: none;
}

.action-button__icon {
  width: 1.25rem;
  height: 1.25rem;
}

.action-button--control {
  color: #0369a1;
}

.action-button--control:not(:disabled):hover {
  border-color: rgba(14, 165, 233, 0.5);
  background: transparent;
}
</style>