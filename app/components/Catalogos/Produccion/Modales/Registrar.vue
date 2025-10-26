<template>
  <GenericModal
    v-if="modelValue"
    :visible="modelValue"
    :title="modalTitle"
    :draggable="true"
    :resizable="false"
    :padded="false"
    :initial-width="720"
    :initial-height="350"
    :min-width="560"
    :min-height="350"
    :top-bar-background-gradient="'linear-gradient(to right, #0f62fe, #0043ce)'"
    :top-bar-text-color="'#ffffff'"
    :show-close-button="!loading"
    @close="handleClose"
  >
    <form class="modal-content" @submit.prevent="handleSubmit">
      <div class="form-grid">
        <label class="form-field">
          <span>Producto asociado</span>
          <select v-model="form.id_producto" :disabled="loading">
            <option value="">Selecciona un producto</option>
            <option
              v-for="producto in productosOptions"
              :key="producto.id"
              :value="String(producto.id)"
            >
              {{ producto.nombre }}
            </option>
          </select>
        </label>
        <label class="form-field">
          <span>Cantidad producida</span>
          <input
            v-model="form.cantidad_producida"
            type="number"
            step="0.01"
            min="0"
            :disabled="loading"
            inputmode="decimal"
          >
          <p v-if="errors.cantidad_producida" class="field-error">{{ errors.cantidad_producida }}</p>
        </label>
        <label class="form-field">
          <span>Estado</span>
          <select v-model="form.estado" :disabled="loading">
            <option value="">Selecciona un estado</option>
            <option v-for="estado in estadoOptions" :key="estado" :value="estado">
              {{ estado }}
            </option>
          </select>
          <p v-if="errors.estado" class="field-error">{{ errors.estado }}</p>
        </label>
        <label class="form-field">
          <span>Fecha de producción</span>
          <input
            v-model="form.fecha_produccion"
            type="date"
            :disabled="loading"
          >
          <p v-if="errors.fecha_produccion" class="field-error">{{ errors.fecha_produccion }}</p>
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
import { computed, reactive, watch } from 'vue'
import GenericModal from '~/components/Genericos/Modal/Modal.vue'
import { PRODUCCION_ESTADO_OPTIONS, ProduccionEstado } from '~/types/produccion'

type ProductoOption = {
  id: string | number
  nombre: string
}

type ProduccionFormValues = {
  fecha_produccion: string
  cantidad_producida: string
  estado: string
  id_producto: string
}

type ProduccionInput = Partial<ProduccionFormValues> & {
  id?: string | number | null
  cantidad_producida?: number | string | null
  id_producto?: string | number | null
}

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    produccion?: ProduccionInput | null
    productos?: ProductoOption[]
    loading?: boolean
  }>(),
  {
    produccion: null,
    productos: () => [] as ProductoOption[],
    loading: false
  }
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'submit', payload: { data: ProduccionFormValues; id?: string | number | null }): void
}>()

const form = reactive<ProduccionFormValues>({
  fecha_produccion: '',
  cantidad_producida: '',
  estado: '',
  id_producto: ''
})

const errors = reactive<Record<string, string>>({})

const productosOptions = computed(() => props.productos ?? [])
const estadoOptions = computed(() => PRODUCCION_ESTADO_OPTIONS)

const modalTitle = computed(() => (props.produccion?.id ? 'Editar producción' : 'Registrar producción'))
const submitLabel = computed(() => (props.produccion?.id ? 'Actualizar' : 'Registrar'))

const resetErrors = () => {
  Object.keys(errors).forEach(key => {
    delete errors[key]
  })
}

const resetForm = () => {
  form.fecha_produccion = ''
  form.cantidad_producida = ''
  form.estado = ''
  form.id_producto = ''
  resetErrors()
}

const toStringValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value)
}

const applyProduccion = () => {
  const data = props.produccion
  if (!data) {
    resetForm()
    return
  }
  form.fecha_produccion = toStringValue(data.fecha_produccion)
  form.cantidad_producida = toStringValue(data.cantidad_producida)
  form.estado = toStringValue(data.estado)
  form.id_producto = toStringValue(data.id_producto)
  resetErrors()
}

const normalizeDecimal = (value: unknown) => toStringValue(value).replace(',', '.').trim()

const validate = () => {
  resetErrors()
  const fechaValue = toStringValue(form.fecha_produccion).trim()
  if (!fechaValue) {
    errors.fecha_produccion = 'Selecciona una fecha'
  }
  const cantidadValue = normalizeDecimal(toStringValue(form.cantidad_producida))
  if (!cantidadValue) {
    errors.cantidad_producida = 'Ingresa la cantidad producida'
  } else {
    const parsed = Number.parseFloat(cantidadValue)
    if (!Number.isFinite(parsed) || parsed < 0) {
      errors.cantidad_producida = 'Ingresa un valor numérico válido'
    }
  }
  const estadoValue = toStringValue(form.estado).trim()
  if (!estadoValue) {
    errors.estado = 'Selecciona un estado'
  } else if (!estadoOptions.value.includes(estadoValue as ProduccionEstado)) {
    errors.estado = 'Selecciona una opción válida'
  }
  return Object.keys(errors).length === 0
}

const handleSubmit = () => {
  if (!validate()) {
    return
  }
  const payload: ProduccionFormValues = {
    fecha_produccion: toStringValue(form.fecha_produccion).trim(),
    cantidad_producida: normalizeDecimal(form.cantidad_producida),
    estado: toStringValue(form.estado).trim(),
    id_producto: toStringValue(form.id_producto).trim()
  }
  emit('submit', { data: payload, id: props.produccion?.id ?? null })
}

const handleClose = () => {
  if (props.loading) {
    return
  }
  emit('update:modelValue', false)
}

watch(
  () => props.modelValue,
  value => {
    if (value) {
      applyProduccion()
    } else {
      resetForm()
    }
  }
)

watch(
  () => props.produccion,
  () => {
    if (props.modelValue) {
      applyProduccion()
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
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 255, 0.95));
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

.form-field--checkbox {
  flex-direction: row;
  align-items: center;
  gap: 0.75rem;
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
  border-color: rgba(0, 120, 212, 0.25);
}

.modal-button--ghost:not(:disabled):hover {
  border-color: rgba(0, 120, 212, 0.5);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.12);
}

.modal-button--primary {
  background: linear-gradient(135deg, #0078d4, #00a6ff);
  color: #ffffff;
  box-shadow: 0 10px 24px rgba(0, 118, 212, 0.35);
}

.modal-button--primary:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 32px rgba(0, 118, 212, 0.45);
}

.modal-button--primary:not(:disabled):active {
  transform: translateY(0);
}

@media (max-width: 720px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-field--checkbox {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
