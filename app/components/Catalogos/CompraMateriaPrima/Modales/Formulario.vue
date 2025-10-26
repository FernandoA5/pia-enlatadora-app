<template>
  <GenericModal
    v-if="modelValue"
    :visible="modelValue"
    :title="modalTitle"
    :draggable="true"
    :resizable="false"
    :padded="false"
    :initial-width="680"
    :initial-height="340"
    :min-width="560"
    :min-height="340"
    :top-bar-background-gradient="'linear-gradient(to right, #0f62fe, #0043ce)'"
    :top-bar-text-color="'#ffffff'"
    :show-close-button="!loading"
    @close="handleClose"
  >
    <form class="modal-content" @submit.prevent="handleSubmit">
      <div class="form-grid">
        <label class="form-field">
          <span>Proveedor</span>
          <select v-model="form.id_proveedor" :disabled="loading">
            <option value="">
              Selecciona un proveedor
            </option>
            <option
              v-for="option in proveedoresCombinados"
              :key="option.value"
              :value="String(option.value)"
            >
              {{ option.label }}
            </option>
          </select>
          <p v-if="errors.id_proveedor" class="field-error">{{ errors.id_proveedor }}</p>
        </label>

        <label class="form-field">
          <span>Fecha de compra</span>
          <input
            v-model="form.fecha_compra"
            type="date"
            :disabled="loading"
          >
          <p v-if="errors.fecha_compra" class="field-error">{{ errors.fecha_compra }}</p>
        </label>

        <label class="form-field form-field--full">
          <span>Total</span>
          <input
            v-model="form.total"
            type="number"
            step="0.01"
            min="0"
            :disabled="loading"
            readonly
            inputmode="decimal"
          >
          <p v-if="errors.total" class="field-error">{{ errors.total }}</p>
        </label>
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
          :disabled="loading"
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
import { useProveedoresApi } from '~/composables/useProveedoresApi'

type OptionValue = {
  label: string
  value: string | number
}

type CompraMateriaPrimaForm = {
  id_proveedor: string
  fecha_compra: string
  total: string
}

type CompraMateriaPrimaLike = Partial<CompraMateriaPrimaForm> & {
  id?: number | string | null
  activo?: boolean
}

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    compra?: CompraMateriaPrimaLike | null
    loading?: boolean
    proveedores?: OptionValue[]
  }>(),
  {
    compra: null,
    loading: false,
    proveedores: () => []
  }
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'submit', payload: { data: Record<string, unknown>; id?: number | string | null }): void
}>()

const { listProveedores, getProveedor } = useProveedoresApi()

const proveedoresLocales = ref<OptionValue[]>([])
const proveedoresCombinados = computed<OptionValue[]>(() => {
  const mapa = new Map<string, OptionValue>()

  const externos = props.proveedores ?? []
  externos.forEach(option => {
    const clave = String(option.value)
    if (!mapa.has(clave)) {
      mapa.set(clave, {
        label: option.label,
        value: option.value
      })
    }
  })

  proveedoresLocales.value.forEach(option => {
    const clave = String(option.value)
    if (!mapa.has(clave)) {
      mapa.set(clave, option)
    }
  })

  return Array.from(mapa.values())
})

const form = reactive<CompraMateriaPrimaForm>({
  id_proveedor: '',
  fecha_compra: '',
  total: ''
})

const errors = reactive<Record<string, string>>({})

const modalTitle = computed(() => (props.compra?.id ? 'Editar compra de materia prima' : 'Registrar compra de materia prima'))
const submitLabel = computed(() => (props.compra?.id ? 'Actualizar' : 'Registrar'))

const resetErrors = () => {
  Object.keys(errors).forEach(key => {
    delete errors[key]
  })
}

const resetForm = () => {
  form.id_proveedor = ''
  form.fecha_compra = ''
  form.total = ''
  resetErrors()
}

const toStringValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value)
}

const toDateInputValue = (value: unknown): string => {
  if (!value) {
    return ''
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }
  const stringValue = String(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) {
    return stringValue
  }
  const parsed = Date.parse(stringValue)
  if (Number.isNaN(parsed)) {
    return ''
  }
  return new Date(parsed).toISOString().slice(0, 10)
}

const applyCompra = () => {
  const data = props.compra
  
  if (!data) {
    resetForm()
    return
  }
  
  const idProveedorRaw = data.id_proveedor
  const idProveedorString = toStringValue(idProveedorRaw)
  
  
  form.id_proveedor = idProveedorString
  form.fecha_compra = toDateInputValue(data.fecha_compra)
  form.total = toStringValue(data.total)
  
  
  resetErrors()
}

const normalizeDecimal = (value: unknown): string => toStringValue(value).replace(',', '.').trim()

const validate = () => {
  resetErrors()

  if (!toStringValue(form.id_proveedor).trim()) {
    errors.id_proveedor = 'Selecciona un proveedor'
  }

  if (!toStringValue(form.fecha_compra).trim()) {
    errors.fecha_compra = 'Selecciona la fecha de compra'
  }

  const totalValue = toStringValue(form.total).trim()
  if (totalValue) {
    const normalized = normalizeDecimal(totalValue)
    const parsed = Number.parseFloat(normalized)
    if (!Number.isFinite(parsed) || parsed < 0) {
      errors.total = 'Ingresa un valor numérico válido'
    }
  }

  return Object.keys(errors).length === 0
}

const parseIdProveedor = (value: string) => {
  if (value === '') {
    return null
  }
  const numeric = Number(value)
  if (Number.isNaN(numeric)) {
    return value
  }
  return numeric
}

const handleSubmit = () => {
  if (!validate()) {
    return
  }

  const payload: Record<string, unknown> = {
    id_proveedor: parseIdProveedor(form.id_proveedor),
    fecha_compra: form.fecha_compra,
    activo: props.compra?.activo ?? true
  }

  const normalizedTotal = normalizeDecimal(form.total)
  const parsedTotal = Number.parseFloat(normalizedTotal)
  if (Number.isFinite(parsedTotal)) {
    payload.total = parsedTotal
  }

  emit('submit', { data: payload, id: props.compra?.id ?? null })
}

const handleClose = () => {
  if (props.loading) {
    return
  }
  emit('update:modelValue', false)
}

const fetchProveedoresLocales = async () => {
  if ((props.proveedores?.length ?? 0) > 0) {
    proveedoresLocales.value = []
    return
  }

  try {
    const response = await listProveedores()
    const raw = (response as { data?: unknown }).data ?? response

    if (Array.isArray(raw)) {
      proveedoresLocales.value = (raw as Array<Record<string, unknown>>)
        .map(item => {
          const record = item as Record<string, unknown>
          const valueCandidate = record.id ?? record.id_proveedor ?? record.value

          if (typeof valueCandidate === 'string' || typeof valueCandidate === 'number') {
            return {
              label: String(record.nombre ?? record.label ?? 'Proveedor sin nombre'),
              value: typeof valueCandidate === 'number' ? valueCandidate : String(valueCandidate)
            } satisfies OptionValue
          }

          return null
        })
        .filter((option): option is OptionValue => option !== null)
    } else {
      proveedoresLocales.value = []
    }
  } catch (error) {
    console.error('Error al cargar proveedores:', error)
    proveedoresLocales.value = []
  }
}

const ensureProveedorSeleccionado = async () => {
  const currentId = toStringValue(form.id_proveedor)
  if (!currentId) {
    return
  }

  const exists = proveedoresCombinados.value.some(option => String(option.value) === currentId)
  if (exists) {
    return
  }

  try {
    const response = await getProveedor(currentId)
    const raw = (response as { data?: unknown }).data ?? response

    if (raw && typeof raw === 'object') {
      const record = raw as Record<string, unknown>
      const valueCandidate = record.id ?? record.id_proveedor ?? record.value ?? currentId

      if (typeof valueCandidate === 'string' || typeof valueCandidate === 'number') {
        const option: OptionValue = {
          label: String(record.nombre ?? record.label ?? 'Proveedor sin nombre'),
          value: typeof valueCandidate === 'number' ? valueCandidate : String(valueCandidate)
        }

        const clave = String(option.value)
        const restantes = proveedoresLocales.value.filter(current => String(current.value) !== clave)
        proveedoresLocales.value = [...restantes, option]
      }
    }
  } catch (error) {
    console.error('Error al obtener proveedor seleccionado:', error)
  }
}

watch(
  () => props.modelValue,
  value => {
    if (value) {
      fetchProveedoresLocales()
        .catch(error => {
          console.error('Error cargando proveedores locales:', error)
        })
        .finally(() => {
          applyCompra()
          ensureProveedorSeleccionado()
        })
    } else {
      resetForm()
    }
  }
)

watch(
  () => props.compra,
  (newVal, oldVal) => {
    if (props.modelValue) {
      applyCompra()
      ensureProveedorSeleccionado()
    }
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
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem;
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

.field-error {
  margin: 0;
  font-size: 0.75rem;
  color: #b91c1c;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  width: 100%;
  padding: 0.5rem;
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

@media (max-width: 720px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}

.form-field--full {
  grid-column: span 2;
}
</style>
