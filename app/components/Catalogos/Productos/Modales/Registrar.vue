<template>
  <GenericModal
    v-if="modelValue"
    :visible="modelValue"
    :title="modalTitle"
    :draggable="true"
    :resizable="false"
    :padded="false"
    :initial-width="700"
    :initial-height="480"
    :min-width="560"
    :min-height="380"
    :top-bar-background-gradient="'linear-gradient(to right, #0f62fe, #0043ce)'"
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

        <label class="form-field form-field--full">
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

interface ProductoFormValues {
  nombre: string
  descripcion: string
  unidad_medida: string
  stock_actual: string
}

interface ProductoLike extends Partial<ProductoFormValues> {
  id?: number | string | null
  activo?: boolean
}

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    producto?: ProductoLike | null
    loading?: boolean
  }>(),
  {
    producto: null,
    loading: false
  }
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'submit', payload: { data: Record<string, unknown>; id?: number | string | null }): void
}>()

const form = reactive<ProductoFormValues>({
  nombre: '',
  descripcion: '',
  unidad_medida: '',
  stock_actual: ''
})

const errors = reactive<Record<string, string>>({})

const unidadOptions = ['kg', 'g', 'l', 'ml', 'pz']

const modalTitle = computed(() => (props.producto?.id ? 'Editar producto' : 'Registrar producto'))
const submitLabel = computed(() => (props.producto?.id ? 'Actualizar' : 'Registrar'))

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
  resetErrors()
}

const toStringValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value)
}

const applyProducto = () => {
  const data = props.producto
  if (!data) {
    resetForm()
    return
  }
  form.nombre = toStringValue(data.nombre)
  form.descripcion = toStringValue(data.descripcion)
  form.unidad_medida = toStringValue(data.unidad_medida)
  form.stock_actual = toStringValue(data.stock_actual)
  resetErrors()
}

const normalizeDecimal = (value: unknown) => toStringValue(value).replace(',', '.').trim()

const validate = () => {
  resetErrors()

  if (!form.nombre.trim()) {
    errors.nombre = 'Ingresa el nombre del producto'
  }

  if (!form.descripcion.trim()) {
    errors.descripcion = 'Ingresa la descripción del producto'
  }

  if (!form.unidad_medida.trim()) {
    errors.unidad_medida = 'Selecciona una unidad de medida'
  }

  const stockValue = toStringValue(form.stock_actual).trim()
  if (!stockValue) {
    errors.stock_actual = 'Ingresa el stock actual'
  } else {
    const normalized = normalizeDecimal(stockValue)
    const parsed = Number.parseFloat(normalized)
    if (!Number.isFinite(parsed) || parsed < 0) {
      errors.stock_actual = 'Ingresa un valor numérico válido'
    }
  }

  return Object.keys(errors).length === 0
}

const handleSubmit = () => {
  if (!validate()) {
    return
  }

  const payload: Record<string, unknown> = {
    nombre: form.nombre.trim(),
    descripcion: form.descripcion.trim(),
    unidad_medida: form.unidad_medida.trim(),
    stock_actual: Number.parseFloat(normalizeDecimal(form.stock_actual)),
    activo: props.producto?.activo ?? true
  }

  emit('submit', { data: payload, id: props.producto?.id ?? null })
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
      applyProducto()
    } else {
      resetForm()
    }
  }
)

watch(
  () => props.producto,
  () => {
    if (props.modelValue) {
      applyProducto()
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
.form-field textarea,
.form-field select {
  border: 1px solid rgba(15, 97, 255, 0.25);
  border-radius: 10px;
  padding: 0.75rem 0.85rem;
  font-size: 0.95rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  background: rgba(255, 255, 255, 0.95);
  color: #0f172a;
}

.form-field textarea {
  resize: vertical;
  min-height: 110px;
}

.form-field input:focus,
.form-field textarea:focus,
.form-field select:focus {
  outline: none;
  border-color: rgba(15, 97, 255, 0.6);
  box-shadow: 0 0 0 3px rgba(15, 97, 255, 0.18);
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

  .form-field--full {
    grid-column: span 1;
  }
}
</style>
