<template>
  <GenericModal
    v-if="modelValue"
    :visible="modelValue"
    :title="modalTitle"
    :draggable="true"
    :resizable="false"
    :padded="false"
    :initial-width="640"
    :initial-height="480"
    :min-width="520"
    :min-height="420"
    :top-bar-background-gradient="'linear-gradient(to right, #0f62fe, #0043ce)'"
    :top-bar-text-color="'#ffffff'"
    :show-close-button="!loading"
    @close="handleClose"
  >
    <form class="modal-content" @submit.prevent="handleSubmit">
      <div class="form-grid">
        <label class="form-field form-field--full">
          <span>Cliente</span>
          <select
            v-model="form.id_cliente"
            :disabled="loading || loadingClientes"
            required
          >
            <option value="">Selecciona un cliente</option>
            <option
              v-for="cliente in clientes"
              :key="cliente.id_cliente"
              :value="String(cliente.id_cliente)"
            >
              {{ cliente.nombre }}
            </option>
          </select>
          <p v-if="errors.id_cliente" class="field-error">{{ errors.id_cliente }}</p>
        </label>

        <label class="form-field">
          <span>Fecha del Pedido</span>
          <input
            v-model="form.fecha_pedido"
            type="date"
            :disabled="loading"
            required
          >
          <p v-if="errors.fecha_pedido" class="field-error">{{ errors.fecha_pedido }}</p>
        </label>

        <label class="form-field">
          <span>Total</span>
          <input
            v-model="form.total"
            type="number"
            step="0.01"
            min="0"
            disabled
            readonly
          >
          <p class="field-hint">El total se calcula automáticamente</p>
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
          :disabled="loading || loadingClientes"
          @click="handleSubmit"
        >
          {{ loading ? 'Guardando…' : submitLabel }}
        </button>
      </div>
    </template>
  </GenericModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch, onMounted } from 'vue'
import GenericModal from '~/components/Genericos/Modal/Modal.vue'
import { useClientesApi } from '~/composables/useClientesApi'

interface PedidoFormValues {
  id_cliente: string
  fecha_pedido: string
  total: number | string
}

interface PedidoLike extends Partial<PedidoFormValues> {
  id?: number | string | null
  id_pedido?: number | string | null
  activo?: boolean
}

interface ClienteOption {
  id_cliente: number
  nombre: string
}

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    pedido?: PedidoLike | null
    loading?: boolean
  }>(),
  {
    pedido: null,
    loading: false
  }
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'submit', payload: { data: Record<string, unknown>; id?: number | string | null }): void
}>()

const { listClientes } = useClientesApi()

const form = reactive<PedidoFormValues>({
  id_cliente: '',
  fecha_pedido: '',
  total: 0
})

const errors = reactive<Record<string, string>>({})
const clientes = ref<ClienteOption[]>([])
const loadingClientes = ref(false)

const modalTitle = computed(() => (props.pedido?.id || props.pedido?.id_pedido ? 'Editar pedido' : 'Registrar pedido'))
const submitLabel = computed(() => (props.pedido?.id || props.pedido?.id_pedido ? 'Actualizar' : 'Registrar'))

const fetchClientes = async () => {
  loadingClientes.value = true
  try {
    const response = await listClientes()
    const raw = (response as { data?: unknown }).data ?? response
    if (Array.isArray(raw)) {
      const next = (raw as Record<string, unknown>[]).reduce<ClienteOption[]>((acc, item) => {
        if (!item || typeof item !== 'object') {
          return acc
        }

        const record = item as Record<string, unknown>
        const nestedValue = (record.value as Record<string, unknown> | undefined) ?? (record.raw as Record<string, unknown> | undefined)
        const idCandidate =
          record.id_cliente ??
          record.id ??
          nestedValue?.id_cliente ??
          nestedValue?.id
        const nombreCandidate =
          record.nombre ??
          nestedValue?.nombre ??
          ''
        const activoCandidate =
          record.activo ??
          nestedValue?.activo

        const numericId = Number(idCandidate)
        if (!Number.isFinite(numericId) || activoCandidate === false) {
          return acc
        }

        const nombre = typeof nombreCandidate === 'string' && nombreCandidate.trim().length > 0 ? nombreCandidate : `Cliente ${numericId}`
        acc.push({ id_cliente: numericId, nombre })
        return acc
      }, [])
      const deduped = new Map<number, string>()
      next.forEach(({ id_cliente, nombre }) => {
        if (!deduped.has(id_cliente)) {
          deduped.set(id_cliente, nombre)
        }
      })
      clientes.value = Array.from(deduped.entries()).map(([id_cliente, nombre]) => ({ id_cliente, nombre }))
    }
  } catch (error) {
    console.error('Error al cargar clientes:', error)
    clientes.value = []
  } finally {
    loadingClientes.value = false
  }
}

const resetErrors = () => {
  Object.keys(errors).forEach(key => {
    delete errors[key]
  })
}

const resetForm = () => {
  form.id_cliente = ''
  form.fecha_pedido = ''
  form.total = 0
  resetErrors()
}

const toStringValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value)
}

const formatDateForInput = (dateValue: unknown): string => {
  if (!dateValue) return ''
  const dateStr = String(dateValue)
  if (dateStr.includes('T')) {
    return dateStr.split('T')[0] || ''
  }
  return dateStr
}

const applyPedido = () => {
  const data = props.pedido
  if (!data) {
    resetForm()
    return
  }
  form.id_cliente = data.id_cliente ? String(data.id_cliente) : ''
  form.fecha_pedido = formatDateForInput(data.fecha_pedido)
  form.total = 0
  resetErrors()
}

const validate = () => {
  resetErrors()

  if (!form.id_cliente) {
    errors.id_cliente = 'Selecciona un cliente'
  }

  if (!form.fecha_pedido) {
    errors.fecha_pedido = 'Ingresa la fecha del pedido'
  }

  return Object.keys(errors).length === 0
}

const handleSubmit = () => {
  if (!validate()) {
    return
  }

  const payload: Record<string, unknown> = {
    id_cliente: Number(form.id_cliente),
    fecha_pedido: form.fecha_pedido,
    total: 0,
    activo: props.pedido?.activo ?? true
  }

  emit('submit', { data: payload, id: props.pedido?.id ?? props.pedido?.id_pedido ?? null })
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
      fetchClientes()
      applyPedido()
    } else {
      resetForm()
    }
  }
)

watch(
  () => props.pedido,
  () => {
    if (props.modelValue) {
      applyPedido()
    }
  },
  { deep: true }
)

onMounted(() => {
  if (props.modelValue) {
    fetchClientes()
  }
})
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

.field-hint {
  margin: 0;
  font-size: 0.75rem;
  color: #64748b;
  font-style: italic;
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
