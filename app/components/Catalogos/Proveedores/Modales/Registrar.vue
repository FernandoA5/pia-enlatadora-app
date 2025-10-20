<template>
  <GenericModal
    v-if="modelValue"
    :visible="modelValue"
    :title="modalTitle"
    :draggable="true"
    :resizable="false"
    :padded="false"
    :initial-width="640"
    :initial-height="420"
    :min-width="520"
    :min-height="360"
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
          <span>Teléfono</span>
          <input
            v-model="form.telefono"
            type="tel"
            :disabled="loading"
            autocomplete="off"
            inputmode="tel"
          >
          <p v-if="errors.telefono" class="field-error">{{ errors.telefono }}</p>
        </label>

        <label class="form-field form-field--full">
          <span>Dirección</span>
          <textarea
            v-model="form.direccion"
            rows="3"
            :disabled="loading"
          ></textarea>
          <p v-if="errors.direccion" class="field-error">{{ errors.direccion }}</p>
        </label>

        <label class="form-field form-field--full">
          <span>Correo</span>
          <input
            v-model="form.correo"
            type="email"
            :disabled="loading"
            autocomplete="off"
          >
          <p v-if="errors.correo" class="field-error">{{ errors.correo }}</p>
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

interface ProveedorFormValues {
  nombre: string
  telefono: string
  direccion: string
  correo: string
}

interface ProveedorLike extends Partial<ProveedorFormValues> {
  id?: number | string | null
  activo?: boolean
}

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    proveedor?: ProveedorLike | null
    loading?: boolean
  }>(),
  {
    proveedor: null,
    loading: false
  }
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'submit', payload: { data: Record<string, unknown>; id?: number | string | null }): void
}>()

const form = reactive<ProveedorFormValues>({
  nombre: '',
  telefono: '',
  direccion: '',
  correo: ''
})

const errors = reactive<Record<string, string>>({})

const modalTitle = computed(() => (props.proveedor?.id ? 'Editar proveedor' : 'Registrar proveedor'))
const submitLabel = computed(() => (props.proveedor?.id ? 'Actualizar' : 'Registrar'))

const resetErrors = () => {
  Object.keys(errors).forEach(key => {
    delete errors[key]
  })
}

const resetForm = () => {
  form.nombre = ''
  form.telefono = ''
  form.direccion = ''
  form.correo = ''
  resetErrors()
}

const toStringValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value)
}

const applyProveedor = () => {
  const data = props.proveedor
  if (!data) {
    resetForm()
    return
  }
  form.nombre = toStringValue(data.nombre)
  form.telefono = toStringValue(data.telefono)
  form.direccion = toStringValue(data.direccion)
  form.correo = toStringValue(data.correo)
  resetErrors()
}

const emailRegex = /^[\w.!#$%&'*+/=?`{|}~-]+@[\w-]+(?:\.[\w-]+)+$/
const phoneRegex = /^([+]?\d[\d\s-]{5,20})$/

const validate = () => {
  resetErrors()

  if (!form.nombre.trim()) {
    errors.nombre = 'Ingresa el nombre del proveedor'
  }

  const telefonoValue = form.telefono.trim()
  if (!telefonoValue) {
    errors.telefono = 'Ingresa el teléfono de contacto'
  } else if (!phoneRegex.test(telefonoValue.replace(/\s+/g, ''))) {
    errors.telefono = 'Ingresa un teléfono válido'
  }

  if (!form.direccion.trim()) {
    errors.direccion = 'Ingresa la dirección del proveedor'
  }

  const correoValue = form.correo.trim()
  if (!correoValue) {
    errors.correo = 'Ingresa el correo de contacto'
  } else if (!emailRegex.test(correoValue)) {
    errors.correo = 'Ingresa un correo electrónico válido'
  }

  return Object.keys(errors).length === 0
}

const handleSubmit = () => {
  if (!validate()) {
    return
  }

  const payload: Record<string, unknown> = {
    nombre: form.nombre.trim(),
    telefono: form.telefono.trim(),
    direccion: form.direccion.trim(),
    correo: form.correo.trim(),
    activo: props.proveedor?.activo ?? true
  }

  emit('submit', { data: payload, id: props.proveedor?.id ?? null })
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
      applyProveedor()
    } else {
      resetForm()
    }
  }
)

watch(
  () => props.proveedor,
  () => {
    if (props.modelValue) {
      applyProveedor()
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
.form-field textarea {
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
.form-field textarea:focus {
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
