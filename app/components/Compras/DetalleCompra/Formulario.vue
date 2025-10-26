<template>
  <GenericModal
    v-if="modelValue"
    :visible="modelValue"
    :title="modalTitle"
    :draggable="true"
    :resizable="true"
    :maximizable="true"
    :padded="false"
    :initial-width="1200"
    :initial-height="680"
    :min-width="1040"
    :min-height="360"
    :top-bar-background-gradient="'linear-gradient(to right, #0f62fe, #0043ce)'"
    :top-bar-text-color="'#ffffff'"
    :show-close-button="!loading"
    content-class="detalle-compra-modal-content"
    @close="handleClose"
  >
    <form class="modal-content" @submit.prevent="handleSubmit">
      <div class="form-row">
        <label class="form-field form-field--materia">
          <span>Materia prima</span>
          <select v-model="form.id_materia" :disabled="loading">
            <option value="">Selecciona una materia prima</option>
            <option
              v-for="option in materias"
              :key="option.value"
              :value="String(option.value)"
            >
              {{ option.label }}
            </option>
          </select>
          <p v-if="errors.id_materia" class="field-error">{{ errors.id_materia }}</p>
        </label>

        <label class="form-field form-field--cantidad">
          <span>Cantidad</span>
          <input
            v-model="form.cantidad"
            type="number"
            step="0.01"
            min="0"
            :disabled="loading"
            inputmode="decimal"
          >
          <p v-if="errors.cantidad" class="field-error">{{ errors.cantidad }}</p>
        </label>

        <label class="form-field form-field--precio">
          <span>Precio unitario</span>
          <input
            v-model="form.precio_unitario"
            type="number"
            step="0.01"
            min="0"
            :disabled="loading"
            inputmode="decimal"
          >
          <p v-if="errors.precio_unitario" class="field-error">{{ errors.precio_unitario }}</p>
        </label>

        <button
          type="button"
          class="modal-button modal-button--success"
          :disabled="loading || !canAgregarDetalle"
          @click="agregarDetalle"
        >
          Agregar
        </button>
      </div>

      <p v-if="errors.detalles" class="field-error field-error--table">{{ errors.detalles }}</p>

      <div class="table-section">
        <Tabla
          class="detalles-table"
          :headers="detalleHeaders"
          :items="detalles"
          :disable-pagination="true"
          :hide-footer="true"
        >
          <template #no-data>
            No has agregado materias primas
          </template>

          <template #item.cantidad="{ value }">
            {{ formatNumber(value) }}
          </template>

          <template #item.precio_unitario="{ value }">
            {{ formatCurrency(value) }}
          </template>

          <template #item.subtotal="{ value }">
            {{ formatCurrency(value) }}
          </template>

          <template #item.acciones="{ item }">
            <button
              type="button"
              class="action-button action-button--delete"
              :disabled="loading"
              @click.stop="eliminarDetalle(String(item.uid))"
            >
              <Icon name="mdi:trash-can-outline" class="action-button__icon" aria-hidden="true" />
            </button>
          </template>
        </Tabla>
      </div>
    </form>

    <template #footer>
      <div class="modal-footer">
        <button
          type="button"
          class="modal-button modal-button--ghost"
          :disabled="loading"
          @click="handleClose"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="modal-button modal-button--primary"
          :disabled="loading || !canSubmit"
          @click="handleSubmit"
        >
          {{ loading ? 'Guardando…' : submitLabel }}
        </button>
      </div>
    </template>
  </GenericModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import GenericModal from '~/components/Genericos/Modal/Modal.vue'
import Tabla, { type GenericTableHeader, type GenericTableItem } from '~/components/Genericos/Tablas/Tabla.vue'
import { useComprasMateriaPrimaApi } from '~/composables/useComprasMateriaPrimaApi'

type OptionValue = {
  label: string
  value: string | number
}

type DetalleCompraForm = {
  cantidad: string
  precio_unitario: string
  id_materia: string
}

type DetalleCompraLike = Partial<DetalleCompraForm> & {
  id?: number | string | null
  id_compra?: number | string | null
}

export type DetalleCompraGuardado = {
  id?: number | string | null
  id_compra?: number | string | null
  id_materia?: string | number | null
  cantidad?: number | string | null
  precio_unitario?: number | string | null
  materia?: string | null
}

type DetalleRow = GenericTableItem & {
  uid: string
  detalleId?: string | number | null
  id_materia: string
  materia: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  acciones: string
  persisted: boolean
  updated: boolean
}

export type DetalleSubmitPayload = {
  id_compra: string | number
  detalles: Array<{
    id_materia: string | number
    cantidad: number
    precio_unitario: number
  }>
}

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    detalle?: DetalleCompraLike | null
    loading?: boolean
    materias?: OptionValue[]
    idCompra: string | number
    compra?: GenericTableItem | null
    detallesGuardados?: DetalleCompraGuardado[]
  }>(),
  {
    detalle: null,
    loading: false,
    materias: () => [],
    compra: null,
    detallesGuardados: () => []
  }
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'submit', payload: DetalleSubmitPayload): void
  (event: 'close'): void
  (event: 'updated'): void
}>()

const form = reactive<DetalleCompraForm>({
  cantidad: '',
  precio_unitario: '',
  id_materia: ''
})

const errors = reactive<Record<string, string>>({})

const detalleHeaders: GenericTableHeader[] = [
  { key: 'materia', title: 'Materia prima', align: 'start' },
  { key: 'cantidad', title: 'Cantidad', align: 'end' },
  { key: 'precio_unitario', title: 'Precio unitario', align: 'end' },
  { key: 'subtotal', title: 'Subtotal', align: 'end' },
  { key: 'acciones', title: 'Acciones', align: 'center' }
]

const detalles = ref<DetalleRow[]>([])
let detalleUid = 0

const { updateDetalleCompra, deactivateDetalleCompra } = useComprasMateriaPrimaApi()

const hasNewDetalles = computed(() => detalles.value.some(detalle => !detalle.persisted))
const hasUpdatedDetalles = computed(() => detalles.value.some(detalle => detalle.persisted && detalle.updated))
const canSubmit = computed(() => hasNewDetalles.value || hasUpdatedDetalles.value)
const canAgregarDetalle = computed(() => {
  if (props.loading) {
    return false
  }

  const cantidadValue = parseNumeric(form.cantidad)
  if (cantidadValue === null || cantidadValue <= 0) {
    return false
  }

  const precioValue = parseNumeric(form.precio_unitario)
  if (precioValue === null || precioValue < 0) {
    return false
  }

  if (!toStringValue(form.id_materia).trim()) {
    return false
  }

  return true
})

const modalTitle = computed(() => (props.detalle?.id ? 'Editar detalle de compra' : 'Registrar detalle de compra'))
const submitLabel = computed(() => (props.detalle?.id ? 'Actualizar' : 'Registrar'))

const resetErrors = () => {
  Object.keys(errors).forEach(key => {
    delete errors[key]
  })
}

const resetForm = () => {
  form.cantidad = ''
  form.precio_unitario = ''
  form.id_materia = ''
  resetErrors()
  resetDetalles()
}

const toStringValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value)
}

const normalizeDecimal = (value: unknown): string => toStringValue(value).replace(',', '.').trim()

const applyDetalle = () => {
  const data = props.detalle

  if (!data) {
    resetForm()
    return
  }

  form.cantidad = toStringValue(data.cantidad ?? '')
  form.precio_unitario = toStringValue(data.precio_unitario ?? '')
  form.id_materia = toStringValue(data.id_materia ?? '')

  resetErrors()
  resetDetalles()
}

const validate = () => {
  resetErrors()

  const cantidadValue = toStringValue(form.cantidad).trim()
  if (!cantidadValue) {
    errors.cantidad = 'Ingresa la cantidad'
  } else {
    const normalizedCantidad = normalizeDecimal(cantidadValue)
    const parsedCantidad = Number.parseFloat(normalizedCantidad)
    if (!Number.isFinite(parsedCantidad) || parsedCantidad <= 0) {
      errors.cantidad = 'Ingresa una cantidad válida'
    }
  }

  const precioValue = toStringValue(form.precio_unitario).trim()
  if (!precioValue) {
    errors.precio_unitario = 'Ingresa el precio unitario'
  } else {
    const normalizedPrecio = normalizeDecimal(precioValue)
    const parsedPrecio = Number.parseFloat(normalizedPrecio)
    if (!Number.isFinite(parsedPrecio) || parsedPrecio < 0) {
      errors.precio_unitario = 'Ingresa un precio válido'
    }
  }

  if (!toStringValue(form.id_materia).trim()) {
    errors.id_materia = 'Selecciona una materia prima'
  }

  return Object.keys(errors).length === 0
}

const parseNumeric = (value: string) => {
  const normalized = normalizeDecimal(value)
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const parseIdMateria = (value: string): string | number => {
  const trimmed = value.trim()
  if (trimmed === '') {
    return ''
  }

  const numeric = Number(trimmed)
  return Number.isFinite(numeric) ? numeric : trimmed
}

const findMateriaLabel = (value: string) => {
  const option = props.materias?.find(option => String(option.value) === String(value))
  return option?.label ?? 'Materia prima sin nombre'
}

const createDetalleRow = (params: {
  idMateria: string
  cantidad: number
  precioUnitario: number
  detalleId?: string | number | null
  materiaNombre?: string | null
  persisted?: boolean
  updated?: boolean
}) => {
  const subtotal = Number((params.cantidad * params.precioUnitario).toFixed(2))
  return {
    uid: params.detalleId != null ? `detalle-${params.detalleId}` : `detalle-${++detalleUid}`,
    detalleId: params.detalleId ?? null,
    id_materia: params.idMateria,
    materia: params.materiaNombre ?? findMateriaLabel(params.idMateria),
    cantidad: params.cantidad,
    precio_unitario: params.precioUnitario,
    subtotal,
    acciones: '',
    persisted: Boolean(params.persisted),
    updated: Boolean(params.updated)
  } satisfies DetalleRow
}

const resetDetalles = () => {
  detalles.value = []
}

const syncDetallesGuardados = () => {
  if (!props.modelValue) {
    return
  }

  const registros = props.detallesGuardados ?? []

  if (!Array.isArray(registros) || registros.length === 0) {
    resetDetalles()
    return
  }

  const rows: DetalleRow[] = []

  registros.forEach(registro => {
    const idMateria = toStringValue(registro.id_materia ?? '')
    if (!idMateria) {
      return
    }

    const cantidad = parseNumeric(toStringValue(registro.cantidad ?? ''))
    const precioUnitario = parseNumeric(toStringValue(registro.precio_unitario ?? ''))

    if (cantidad === null || precioUnitario === null) {
      return
    }

    const row = createDetalleRow({
      idMateria,
      cantidad,
      precioUnitario,
      detalleId: registro.id ?? registro.id_compra ?? null,
      materiaNombre: registro.materia ?? null,
      persisted: true,
      updated: false
    })

    rows.push(row)
  })

  detalles.value = rows
}

const agregarDetalle = async () => {
  if (!validate()) {
    return
  }

  const cantidad = parseNumeric(form.cantidad)
  const precioUnitario = parseNumeric(form.precio_unitario)

  if (cantidad === null || precioUnitario === null) {
    return
  }

  const idMateria = form.id_materia
  const detalleNuevo = createDetalleRow({
    idMateria,
    cantidad,
    precioUnitario,
    detalleId: null,
    materiaNombre: null,
    persisted: false,
    updated: false
  })

  detalles.value.push(detalleNuevo)

  delete errors.detalles

  form.cantidad = ''
  form.precio_unitario = ''
}

const eliminarDetalle = async (uid: string) => {
  const detalle = detalles.value.find(item => {
    const currentUid = typeof item.uid === 'string' ? item.uid : String(item.uid ?? '')
    return currentUid === uid
  })

  if (!detalle) {
    return
  }

  if (detalle.persisted && detalle.detalleId != null) {
    try {
      await deactivateDetalleCompra(detalle.detalleId, {
        cantidad: detalle.cantidad,
        precio_unitario: detalle.precio_unitario
      })
      emit('updated')
    } catch (error) {
      console.error('Error al desactivar detalle de compra:', error)
      errors.detalles = 'No se pudo desactivar el detalle. Intenta nuevamente.'
      return
    }
  }

  detalles.value = detalles.value.filter(item => {
    const currentUid = typeof item.uid === 'string' ? item.uid : String(item.uid ?? '')
    return currentUid !== uid
  })
}

const formatNumber = (value: unknown) => {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) {
    return '—'
  }
  return numeric.toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const formatCurrency = (value: unknown) => {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) {
    return '—'
  }
  return numeric.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN'
  })
}

const handleSubmit = () => {
  if (!detalles.value.length) {
    errors.detalles = 'Agrega al menos un detalle'
    return
  }

  const detallesNuevos = detalles.value.filter(detalle => !detalle.persisted)

  if (detallesNuevos.length === 0) {
    delete errors.detalles
    emit('update:modelValue', false)
    return
  }

  const detallesPayload = detallesNuevos.map(detalle => ({
    id_materia: parseIdMateria(detalle.id_materia),
    cantidad: Number(detalle.cantidad.toFixed(4)),
    precio_unitario: Number(detalle.precio_unitario.toFixed(4))
  }))

  emit('submit', {
    id_compra: props.idCompra,
    detalles: detallesPayload
  })
}

const handleClose = () => {
  if (props.loading) {
    return
  }
  emit('update:modelValue', false)
  emit('close')
}

watch(
  () => props.modelValue,
  value => {
    if (value) {
      applyDetalle()
      syncDetallesGuardados()
    } else {
      resetForm()
    }
  }
)

watch(
  () => props.detalle,
  () => {
    if (props.modelValue) {
      applyDetalle()
    }
  },
  { deep: true }
)

watch(
  () => props.materias,
  () => {
    const actualizados: DetalleRow[] = detalles.value.map(detalle => ({
      ...detalle,
      materia: findMateriaLabel(detalle.id_materia)
    }))

    detalles.value = actualizados
  },
  { deep: true }
)

watch(
  () => props.detallesGuardados,
  () => {
    syncDetallesGuardados()
  },
  { deep: true }
)
</script>

<style scoped>
.modal-content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(240, 245, 255, 0.95));
  flex: 1;
  height: 100%;
}

:deep(.detalle-compra-modal-content) {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  min-height: 0;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr auto;
  gap: 1.25rem;
  align-items: end;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-field span {
  font-size: 0.85rem;
  font-weight: 600;
  color: #0f172a;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.form-field input,
.form-field select {
  border: 1px solid rgba(15, 97, 255, 0.25);
  border-radius: 10px;
  padding: 0.75rem 0.85rem;
  font-size: 0.95rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  background: rgba(255, 255, 255, 0.95);
  color: #0f172a;
}

.form-field select {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  padding-right: 2.5rem;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='none' stroke='%230f172a' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' d='M11 1L6 6 1 1'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.85rem center;
  background-size: 0.85rem;
}

.form-field input:focus,
.form-field select:focus {
  outline: none;
  border-color: rgba(15, 97, 255, 0.6);
  box-shadow: 0 0 0 3px rgba(15, 97, 255, 0.18);
}

.form-field--materia {
  grid-column: span 1;
}

.form-field--cantidad,
.form-field--precio {
  grid-column: span 1;
}

.table-section {
  margin-top: 0.75rem;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.detalles-table {
  width: 100%;
}

.table-section :deep(.table-container) {
  margin: 0;
  background: transparent;
  border: none;
  box-shadow: none;
  border-radius: 12px;
}

.table-section :deep(.table-container:hover) {
  box-shadow: none;
}

.table-section :deep(.table-wrapper) {
  padding: 0;
  background: transparent;
}

.table-section :deep(.table-scroll-x) {
  padding: 0;
}

.table-section :deep(.data-table) {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(15, 97, 255, 0.12);
}

.table-section :deep(thead) {
  background: transparent;
  color: #0f172a;
}

.table-section :deep(thead th) {
  color: #0f172a;
  font-weight: 600;
}

.table-section :deep(.table-footer) {
  display: none;
}

.table-section :deep(.table-body) {
  background: transparent;
}

.table-section :deep(.table-body tr:nth-child(even)) {
  background: rgba(15, 97, 255, 0.04);
}

.table-section :deep(.no-data-cell) {
  background: transparent;
}

.table-section {
  margin-bottom: 2rem;
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
  color: #dc2626;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;
  cursor: pointer;
}

.action-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.15);
}

.action-button:active {
  transform: translateY(0);
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.1);
}

.action-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

.action-button__icon {
  width: 1.25rem;
  height: 1.25rem;
}

.action-button--delete {
  background-color: transparent;
  color: #dc2626;
}

.action-button--delete:hover {
  border-color: rgba(220, 38, 38, 0.45);
  background-color: transparent;
}

.action-button--delete:active {
  background-color: transparent;
}

.modal-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 10px;
  border: 1px solid transparent;
  padding: 0.65rem 1.4rem;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.modal-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  box-shadow: none;
  transform: none;
}

.modal-button--ghost {
  background: rgba(255, 255, 255, 0.2);
  color: #0f172a;
  border-color: rgba(15, 97, 255, 0.25);
}

.modal-button--ghost:not(:disabled):hover {
  border-color: rgba(15, 97, 255, 0.5);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.12);
}

.modal-button--primary {
  background: linear-gradient(135deg, #0f62fe, #0043ce);
  color: #ffffff;
  box-shadow: 0 10px 24px rgba(15, 98, 255, 0.35);
}

.modal-button--primary:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 32px rgba(15, 98, 255, 0.45);
}

.modal-button--primary:not(:disabled):active {
  transform: translateY(0);
}

.modal-button--success {
  background: linear-gradient(135deg, #16a34a, #0d9241);
  color: #ffffff;
  box-shadow: 0 10px 24px rgba(22, 163, 74, 0.38);
}

.modal-button--success:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 32px rgba(22, 163, 74, 0.45);
}

.modal-button--success:not(:disabled):active {
  transform: translateY(0);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  width: 100%;
  padding: 0.5rem;
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(15, 97, 255, 0.12);
}

@media (max-width: 720px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .add-button {
    width: 100%;
  }
}
</style>
