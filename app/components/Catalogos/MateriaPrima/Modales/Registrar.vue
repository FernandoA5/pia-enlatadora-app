<template>
  <GenericModal
    v-if="modelValue"
    :visible="modelValue"
    :title="modalTitle"
    :draggable="true"
    :resizable="false"
    :padded="false"
    :initial-width="680"
    :initial-height="520"
    :min-width="560"
    :min-height="420"
    :top-bar-background-gradient="'linear-gradient(to bottom, #004dBAEF, #003d6eFC)'"
    :top-bar-text-color="'#ffffff'"
    :show-close-button="!loading"
    @close="handleClose"
  >
    <form class="modal-content" @submit.prevent="handleSubmit">
      <div class="form-grid">
        <label class="form-field">
          <span>Nombre</span>
          <input
            v-model="form.nombre"
            type="text"
            :disabled="loading"
            autocomplete="off"
          >
          <p v-if="errors.nombre" class="field-error">{{ errors.nombre }}</p>
        </label>
        <label class="form-field">
          <span>Unidad de medida</span>
          <select v-model="form.unidad_medida" :disabled="loading">
            <option value="">Selecciona una unidad</option>
            <option v-for="unidad in unidadOptions" :key="unidad" :value="unidad">
              {{ unidad }}
            </option>
          </select>
          <p v-if="errors.unidad_medida" class="field-error">{{ errors.unidad_medida }}</p>
        </label>
        <label class="form-field form-field--full">
          <span>Descripción</span>
          <textarea
            v-model="form.descripcion"
            rows="3"
            :disabled="loading"
          ></textarea>
          <p v-if="errors.descripcion" class="field-error">{{ errors.descripcion }}</p>
        </label>
        <label class="form-field">
          <span>Stock actual</span>
          <input
            v-model="form.stock_actual"
            type="number"
            step="0.01"
            min="0"
            :disabled="loading"
            inputmode="decimal"
          >
          <p v-if="errors.stock_actual" class="field-error">{{ errors.stock_actual }}</p>
        </label>
        <label class="form-field">
          <span>Stock mínimo</span>
          <input
            v-model="form.stock_minimo"
            type="number"
            step="0.01"
            min="0"
            :disabled="loading"
            inputmode="decimal"
          >
          <p v-if="errors.stock_minimo" class="field-error">{{ errors.stock_minimo }}</p>
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

type MateriaPrimaFormValues = {
  nombre: string
  descripcion: string
  unidad_medida: string
  stock_actual: string
  stock_minimo: string
}

type MateriaPrimaInput = Partial<MateriaPrimaFormValues> & {
  id?: number | string | null
  unidad?: unknown
  stock?: unknown
  stock_min?: unknown
}

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    materiaPrima?: MateriaPrimaInput | null
    loading?: boolean
  }>(),
  {
    materiaPrima: null,
    loading: false
  }
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'submit', payload: { data: MateriaPrimaFormValues; id?: number | string | null }): void
}>()

const unidadOptions = ['kg', 'g', 'l', 'ml', 'pz']

const form = reactive<MateriaPrimaFormValues>({
  nombre: '',
  descripcion: '',
  unidad_medida: '',
  stock_actual: '',
  stock_minimo: ''
})

const errors = reactive<Record<string, string>>({})

const modalTitle = computed(() => (props.materiaPrima?.id ? 'Editar materia prima' : 'Registrar materia prima'))
const submitLabel = computed(() => (props.materiaPrima?.id ? 'Actualizar' : 'Registrar'))

const resetErrors = () => {
  Object.keys(errors).forEach(key => {
    delete errors[key]
  })
}

const resetForm = () => {
  form.nombre = ''
  form.descripcion = ''
  form.unidad_medida = ''
  form.stock_actual = ''
  form.stock_minimo = ''
  resetErrors()
}

const toStringValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value)
}

const applyMateriaPrima = () => {
  const data = props.materiaPrima
  if (!data) {
    resetForm()
    return
  }
  form.nombre = toStringValue(data.nombre)
  form.descripcion = toStringValue(data.descripcion)
  form.unidad_medida = toStringValue(data.unidad_medida ?? data.unidad)
  form.stock_actual = toStringValue(data.stock_actual ?? data.stock)
  form.stock_minimo = toStringValue(data.stock_minimo ?? data.stock_min)
  resetErrors()
}

const normalizeDecimal = (value: string): string => {
  return value.trim().replace(',', '.')
}

const validate = () => {
  resetErrors()
  if (!form.nombre.trim()) {
    errors.nombre = 'Ingresa un nombre'
  }
  if (!form.unidad_medida.trim()) {
    errors.unidad_medida = 'Selecciona una unidad de medida'
  }
  if (!form.stock_actual.trim()) {
    errors.stock_actual = 'Ingresa el stock actual'
  } else {
    const parsed = Number.parseFloat(normalizeDecimal(form.stock_actual))
    if (!Number.isFinite(parsed) || parsed < 0) {
      errors.stock_actual = 'Ingresa un valor numérico válido'
    }
  }
  if (!form.stock_minimo.trim()) {
    errors.stock_minimo = 'Ingresa el stock mínimo'
  } else {
    const parsed = Number.parseFloat(normalizeDecimal(form.stock_minimo))
    if (!Number.isFinite(parsed) || parsed < 0) {
      errors.stock_minimo = 'Ingresa un valor numérico válido'
    }
  }
  return Object.keys(errors).length === 0
}

const handleSubmit = () => {
  if (!validate()) {
    return
  }
  const payload: MateriaPrimaFormValues = {
    nombre: form.nombre.trim(),
    descripcion: form.descripcion.trim(),
    unidad_medida: form.unidad_medida.trim(),
    stock_actual: normalizeDecimal(form.stock_actual),
    stock_minimo: normalizeDecimal(form.stock_minimo)
  }
  emit('submit', { data: payload, id: props.materiaPrima?.id ?? null })
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
      applyMateriaPrima()
    } else {
      resetForm()
    }
  }
)

watch(
  () => props.materiaPrima,
  () => {
    if (props.modelValue) {
      applyMateriaPrima()
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
.form-field select,
.form-field textarea {
  border: 1px solid rgba(0, 120, 212, 0.25);
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
.form-field select:focus,
.form-field textarea:focus {
  outline: none;
  border-color: rgba(0, 180, 255, 0.6);
  box-shadow: 0 0 0 3px rgba(0, 120, 212, 0.15);
}

.form-field textarea {
  resize: vertical;
  min-height: 120px;
}

.form-field--full {
  grid-column: span 2;
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

  .form-field--full {
    grid-column: span 1;
  }
}
</style>
