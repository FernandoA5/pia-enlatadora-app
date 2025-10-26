<template>
  <Catalogo
    :items="compras"
    :loading="loading"
    search-placeholder="Buscar compra de materia prima"
    :search-keys="searchKeys"
    :extract-item-id="extractId"
    :excluded-columns="['id_proveedor', 'id_compra']"
    @reload="handleReload"
    @submit="handleSubmit"
    @delete="handleDelete"
  >
    <template #item.actions.extra="{ item, loading }">
      <button
        type="button"
        class="action-button action-button--edit"
        aria-label="Ver detalle de compra"
        :disabled="loading"
        @click.stop="handleDetalleCompra(item)">
        <Icon name="mdi:clipboard-text-search-outline" class="action-button__icon" aria-hidden="true" />
      </button>
    </template>

    <template #item.fecha_compra="{ value }">
      <span>{{ formatDate(value) }}</span>
    </template>

    <template #item.total="{ value }">
      <span class="font-semibold">{{ formatCurrency(value) }}</span>
    </template>

    <template #item.activo="{ value }">
      <span
        :class="[
          'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold',
          value ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
        ]"
      >
        <Icon
          :name="value ? 'mdi:check-circle' : 'mdi:close-circle'"
          class="h-4 w-4"
        />
        {{ value ? 'Activa' : 'Inactiva' }}
      </span>
    </template>

    <template #modal="{ visible, setVisible, selectedItem, submit }">
      <Formulario
        :model-value="visible"
        :compra="selectedItem"
        :loading="modalLoading"
        :proveedores="proveedoresOptions"
        @update:modelValue="setVisible"
        @submit="submit"
      />
    </template>
  </Catalogo>

  <DetalleFormulario
    v-if="detalleModalVisible && selectedCompraId != null"
    :model-value="detalleModalVisible"
    :detalle="detalleSeleccionada"
    :loading="detalleModalLoading"
    :materias="materiasOptions"
    :id-compra="selectedCompraId"
    :compra="compraSeleccionada"
    :detalles-guardados="detallesGuardados"
    @update:modelValue="handleDetalleModalVisibility"
    @submit="handleDetalleSubmit"
    @close="handleDetalleModalClosed"
    @updated="handleDetalleModalUpdated"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import Catalogo from '~/components/Catalogos/Catalogo.vue'
import Formulario from '~/components/Catalogos/CompraMateriaPrima/Modales/Formulario.vue'
import DetalleFormulario from '~/components/Compras/DetalleCompra/Formulario.vue'
import type { GenericTableItem } from '~/components/Genericos/Tablas/Tabla.vue'
import { useComprasMateriaPrimaApi, type RegistrarDetalleCompraPayload } from '~/composables/useComprasMateriaPrimaApi'
import type { DetalleCompraGuardado } from '~/components/Compras/DetalleCompra/Formulario.vue'
import type { DetalleSubmitPayload } from '~/components/Compras/DetalleCompra/Formulario.vue'
import { useProveedoresApi } from '~/composables/useProveedoresApi'
import { useMateriaPrimaApi } from '~/composables/useMateriaPrimaApi'

const searchKeys = ['id', 'fecha_compra']

const {
  obtenerComprasMateriaPrima,
  obtenerDetallesCompraPorIdCompra,
  createCompraMateriaPrima,
  updateCompraMateriaPrima,
  deactivateCompraMateriaPrima,
  registrarDetallesCompra
} =
  useComprasMateriaPrimaApi()
const { listProveedores } = useProveedoresApi()
const { listMateriasPrimas } = useMateriaPrimaApi()

const compras = ref<GenericTableItem[]>([])
const loading = ref(false)
const modalLoading = ref(false)
const detalleModalVisible = ref(false)
const detalleModalLoading = ref(false)

type DetalleCompraLike = {
  id?: string | number | null
  id_compra?: string | number | null
  cantidad?: string
  precio_unitario?: string
  id_materia?: string
}

type ProveedorOption = {
  label: string
  value: string | number
}

type MateriaOption = {
  label: string
  value: string | number
}

const proveedoresOptions = ref<ProveedorOption[]>([])
const materiasOptions = ref<MateriaOption[]>([])
const detalleSeleccionada = ref<DetalleCompraLike | null>(null)
const compraSeleccionada = ref<GenericTableItem | null>(null)
const detallesGuardados = ref<DetalleCompraGuardado[]>([])

const fetchCompras = async () => {
  loading.value = true
  try {
    const response = await obtenerComprasMateriaPrima()
    const raw = (response as { data?: unknown }).data ?? response
    
    if (Array.isArray(raw)) {
      compras.value = (raw as GenericTableItem[]).map(item => {
        const record = item as Record<string, unknown>
        const idCompra =
          record.id ??
          record.id_compra ??
          (record.value as Record<string, unknown> | undefined)?.id ??
          (record.raw as Record<string, unknown> | undefined)?.id
        return {
          ...record,
          id: typeof idCompra === 'string' || typeof idCompra === 'number' ? idCompra : undefined,
          total: record.total ?? record['total']
        }
      })
    }
  } catch (error) {
    console.error('Error al cargar compras de materia prima:', error)
    compras.value = []
  } finally {
    loading.value = false
  }
}

const fetchProveedores = async () => {
  if (proveedoresOptions.value.length > 0) {
    return
  }

  try {
    const response = await listProveedores()
    const raw = (response as { data?: unknown }).data ?? response

    if (Array.isArray(raw)) {
      proveedoresOptions.value = (raw as GenericTableItem[])
        .map(item => {
          const record = item as Record<string, unknown>
          const valueCandidate = record.id ?? record.id_proveedor ?? record.value

          if (typeof valueCandidate === 'number' || typeof valueCandidate === 'string') {
            const option: ProveedorOption = {
              label: String(record.nombre ?? record.label ?? 'Proveedor sin nombre'),
              value: String(valueCandidate)
            }
            return option
          }

          return null
        })
        .filter((option): option is ProveedorOption => option !== null)
    } else {
      proveedoresOptions.value = []
    }
  } catch (error) {
    console.error('Error al cargar proveedores:', error)
    proveedoresOptions.value = []
  }
}

const fetchMaterias = async () => {
  if (materiasOptions.value.length > 0) {
    return
  }

  try {
    const response = await listMateriasPrimas()
    const raw = (response as { data?: unknown }).data ?? response

    if (Array.isArray(raw)) {
      materiasOptions.value = (raw as GenericTableItem[])
        .map(item => {
          const record = item as Record<string, unknown>
          const valueCandidate = record.id ?? record.id_materia ?? record.value

          if (typeof valueCandidate === 'number' || typeof valueCandidate === 'string') {
            const option: MateriaOption = {
              label: String(record.nombre ?? record.label ?? 'Materia prima sin nombre'),
              value: String(valueCandidate)
            }
            return option
          }

          return null
        })
        .filter((option): option is MateriaOption => option !== null)
    } else {
      materiasOptions.value = []
    }
  } catch (error) {
    console.error('Error al cargar materias primas:', error)
    materiasOptions.value = []
  }
}

const handleReload = () => {
  fetchCompras()
}

const handleSubmit = async ({ data, id, closeModal }: { data: Record<string, unknown>; id?: string | number | null; closeModal: () => void }) => {
  modalLoading.value = true
  try {
    await fetchProveedores()

    const rawIdProveedor = data.id_proveedor
    const stringId = String(rawIdProveedor ?? '').trim()
    const idProveedor = stringId

    const fechaCompra = String(data.fecha_compra ?? '').trim()
    const total = Number(data.total ?? 0)

    const payload = {
      id_proveedor: Number.isNaN(Number(idProveedor)) ? idProveedor : Number(idProveedor),
      fecha_compra: fechaCompra,
      total,
      activo: data.activo !== undefined ? Boolean(data.activo) : true
    }

    if (id != null) {
      await updateCompraMateriaPrima(id, payload)
    } else {
      await createCompraMateriaPrima(payload)
    }

    await fetchCompras()
    closeModal()
  } catch (error) {
    console.error('Error al guardar la compra de materia prima:', error)
  } finally {
    modalLoading.value = false
  }
}

const handleDelete = async (item: GenericTableItem) => {
  const id = extractId(item)
  if (id == null) return

  try {
    await deactivateCompraMateriaPrima(id)
    await fetchCompras()
  } catch (error) {
    console.error('Error al desactivar la compra de materia prima:', error)
  }
}

const handleDetalleCompra = (item: GenericTableItem) => {
  const id = extractId(item)
  if (id == null) return

  compraSeleccionada.value = item
  detalleSeleccionada.value = null
  detallesGuardados.value = []
  detalleModalVisible.value = true
  detalleModalLoading.value = true

  fetchMaterias()

  obtenerDetallesCompraPorIdCompra(id)
    .then(response => {
      const raw = (response as { data?: unknown }).data ?? response

      if (Array.isArray(raw)) {
        detallesGuardados.value = raw as DetalleCompraGuardado[]
      } else if (raw) {
        detallesGuardados.value = [raw as DetalleCompraGuardado]
      } else {
        detallesGuardados.value = []
      }
    })
    .catch(error => {
      console.error('Error al obtener detalles de la compra:', error)
      detallesGuardados.value = []
    })
    .finally(() => {
      detalleModalLoading.value = false
    })
}

onMounted(() => {
  fetchCompras()
})

const extractId = (item: GenericTableItem) => {
  const record = item as Record<string, unknown>
  const candidate =
    record.id ??
    record.id_compra ??
    (record.value as Record<string, unknown> | undefined)?.id ??
    (record.raw as Record<string, unknown> | undefined)?.id

  if (typeof candidate === 'string' || typeof candidate === 'number') {
    return candidate
  }

  return null
}

const selectedCompraId = computed(() => {
  const item = compraSeleccionada.value
  if (!item) {
    return null
  }
  return extractId(item)
})

const handleDetalleModalVisibility = (value: boolean) => {
  detalleModalVisible.value = value
  if (!value) {
    detalleSeleccionada.value = null
    compraSeleccionada.value = null
    detallesGuardados.value = []
  }
}

const handleDetalleModalClosed = async () => {
  await fetchCompras()
}

const handleDetalleModalUpdated = async () => {
  await fetchCompras()
}

const toNumericIfPossible = (value: string | number) => {
  if (typeof value === 'number') {
    return value
  }

  const trimmed = value.trim()
  if (trimmed === '') {
    return ''
  }

  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : trimmed
}

const normalizeDecimal = (value: number) => Number(value.toFixed(4))

const handleDetalleSubmit = async (payload: DetalleSubmitPayload) => {
  detalleModalLoading.value = true
  try {
    const idCompraValue = toNumericIfPossible(payload.id_compra)

    const detallesPayload: RegistrarDetalleCompraPayload['detalles'] = payload.detalles.map(
      (detalle: DetalleSubmitPayload['detalles'][number]) => ({
        id_materia: toNumericIfPossible(detalle.id_materia),
        cantidad: normalizeDecimal(detalle.cantidad),
        precio_unitario: normalizeDecimal(detalle.precio_unitario)
      })
    )

    await registrarDetallesCompra({
      id_compra: idCompraValue ?? payload.id_compra,
      detalles: detallesPayload
    })

    await fetchCompras()
    handleDetalleModalVisibility(false)
  } catch (error) {
    console.error('Error al guardar detalle de compra:', error)
  } finally {
    detalleModalLoading.value = false
  }
}

const formatDate = (value: unknown) => {
  if (!value) {
    return '—'
  }
  try {
    const date = new Date(String(value))
    if (Number.isNaN(date.getTime())) {
      return String(value)
    }
    return date.toLocaleDateString('es-MX')
  } catch (error) {
    console.error('Error al formatear fecha:', error)
    return String(value)
  }
}

const formatCurrency = (value: unknown) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return '—'
  }
  return parsed.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN'
  })
}
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
  background: rgba(15, 23, 42, 0.05);
  color: #1d4ed8;
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

.action-button__icon {
  width: 1.25rem;
  height: 1.25rem;
}

.action-button--edit {
  background-color: transparent;
}
</style>
