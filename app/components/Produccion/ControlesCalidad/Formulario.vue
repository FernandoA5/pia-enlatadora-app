<template>
  <GenericModal
    v-if="modelValue"
    :visible="modelValue"
    :title="modalTitle"
    :draggable="true"
    :resizable="true"
    :padded="false"
    :initial-width="560"
    :initial-height="550"
    :min-width="480"
    :min-height="550"
    :top-bar-background-gradient="'linear-gradient(to right, #22d3ee, #0284c7)'"
    :top-bar-text-color="'#ffffff'"
    :show-close-button="!loading"
    @close="handleClose"
  >
    <form class="modal-content" @submit.prevent="handleSubmit">
      <div class="form-grid">
        <label class="form-field form-field--full">
          <span>Resultado</span>
          <select v-model="form.resultado" :disabled="loading">
            <option value="">
              Selecciona el resultado
            </option>
            <option
              v-for="option in resultadoOptions"
              :key="option"
              :value="option"
            >
              {{ option }}
            </option>
          </select>
          <p v-if="errors.resultado" class="field-error">{{ errors.resultado }}</p>
        </label>

        <label class="form-field form-field--full">
          <span>Observaciones</span>
          <textarea
            v-model="form.observaciones"
            rows="4"
            :disabled="loading"
            placeholder="Añade comentarios del control de calidad"
          />
          <p v-if="errors.observaciones" class="field-error">{{ errors.observaciones }}</p>
        </label>

        <label v-if="props.control?.id" class="form-field form-field--full">
          <span>Fecha de Revisión</span>
          <input
            v-model="form.fecha_control"
            type="text"
            readonly
            disabled
          />
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
import { CONTROL_CALIDAD_RESULTADO_OPTIONS } from '~/types/controlCalidad'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    idProduccion: number | string
    loading?: boolean
    control?: {
      id?: number | string | null
      resultado?: string | null
      observaciones?: string | null
      fecha_control?: string | null
    } | null
  }>(),
  {
    loading: false,
    control: null
  }
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'submit', payload: { data: Record<string, unknown>; id?: number | string | null }): void
}>()

const resultadoOptions = CONTROL_CALIDAD_RESULTADO_OPTIONS

const form = reactive({
  resultado: '',
  observaciones: '',
  fecha_control: ''
})

const errors = reactive<Record<string, string>>({})

const modalTitle = computed(() => (props.control?.id ? 'Editar control de calidad' : 'Registrar control de calidad'))
const submitLabel = computed(() => (props.control?.id ? 'Modificar' : 'Registrar'))

const resetErrors = () => {
  Object.keys(errors).forEach(key => {
    delete errors[key]
  })
}

const applyControl = () => {
  const data = props.control

  if (!data) {
    form.resultado = ''
    form.observaciones = ''
    form.fecha_control = ''
    resetErrors()
    return
  }

  form.resultado = data.resultado ?? ''
  form.observaciones = data.observaciones ?? ''
  form.fecha_control = data.fecha_control ?? ''
  resetErrors()
}

const validate = () => {
  resetErrors()

  if (!form.resultado.trim()) {
    errors.resultado = 'Selecciona un resultado'
  }

  if (!form.observaciones.trim()) {
    errors.observaciones = 'Ingresa observaciones del control'
  }

  return Object.keys(errors).length === 0
}

const handleSubmit = () => {
  if (!validate()) {
    return
  }

  const now = new Date()
  const fechaControl = now.toISOString().slice(0, 10)

  const payload: Record<string, unknown> = {
    resultado: form.resultado,
    observaciones: form.observaciones.trim(),
    activo: true,
    fecha_control: fechaControl,
    id_produccion: props.idProduccion
  }

  emit('submit', { data: payload, id: props.control?.id ?? null })
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
      applyControl()
    }
  }
)

watch(
  () => props.control,
  () => {
    if (props.modelValue) {
      applyControl()
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
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(236, 254, 255, 0.95));
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

.form-field select,
.form-field textarea,
.form-field input {
  border: 1px solid rgba(14, 165, 233, 0.35);
  border-radius: 10px;
  padding: 0.75rem 0.85rem;
  font-size: 0.95rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  background: rgba(255, 255, 255, 0.95);
  color: #0f172a;
}

.form-field textarea {
  resize: vertical;
  min-height: 140px;
}

.form-field select:focus,
.form-field textarea:focus {
  outline: none;
  border-color: rgba(14, 165, 233, 0.6);
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.2);
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
  border-color: rgba(14, 165, 233, 0.35);
}

.modal-button--ghost:not(:disabled):hover {
  border-color: rgba(14, 165, 233, 0.5);
  box-shadow: 0 8px 20px rgba(14, 165, 233, 0.12);
}

.modal-button--primary {
  background: linear-gradient(135deg, #22d3ee, #0284c7);
  color: #ffffff;
  box-shadow: 0 10px 24px rgba(8, 145, 178, 0.35);
}

.modal-button--primary:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 32px rgba(8, 145, 178, 0.45);
}

.modal-button--primary:not(:disabled):active {
  transform: translateY(0);
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-field--full {
    grid-column: span 1;
  }
}

.form-field--full {
  grid-column: span 2;
}
</style>
