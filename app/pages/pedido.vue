<template>
  <Catalogo
    :items="pedidos"
    :loading="loading"
    search-placeholder="Buscar pedido"
    :search-keys="searchKeys"
    :extract-item-id="extractId"
    @reload="handleReload"
    :excluded-columns="['id_cliente', 'activo']"
    @submit="handleSubmit"
    @delete="handleDelete"
  >
    <template #item.actions.extra="{ item, loading }">
      <button
        type="button"
        class="action-button action-button--edit"
        aria-label="Ver detalle de pedido"
        :disabled="loading"
        @click.stop="handleDetallePedido(item)">
        <Icon name="mdi:clipboard-text-search-outline" class="action-button__icon" aria-hidden="true" />
      </button>
    </template>

    <template #item.id_cliente="{ value }">
      <span>{{ getClienteName(value) || 'Cliente desconocido' }}</span>
    </template>

    <template #item.fecha_pedido="{ value }">
      <span>{{ formatDate(value) }}</span>
    </template>

    <template #item.total="{ value }">
      <span>{{ formatCurrency(value) }}</span>
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
        {{ value ? 'Activo' : 'Inactivo' }}
      </span>
    </template>

    <template #modal="{ visible, setVisible, selectedItem, submit }">
      <PedidoFormulario
        :model-value="visible"
        :pedido="selectedItem"
        :loading="modalLoading"
        @update:modelValue="setVisible"
        @submit="submit"
        :resizable="true"
        :draggable="true"
        :maximizable="true"
        :initial-height="380"
        :initial-width="640"
        :min-height="320"
        :min-width="520"
      />
    </template>
  </Catalogo>

  <DetallePedidoFormulario
    v-if="detalleModalVisible && selectedPedidoId != null"
    :model-value="detalleModalVisible"
    :detalle="detalleSeleccionada"
    :loading="detalleModalLoading"
    :productos="productosOptions"
    :id-pedido="selectedPedidoId"
    :pedido="pedidoSeleccionado"
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
import PedidoFormulario from '~/components/Pedidos/Formulario.vue'
import DetallePedidoFormulario from '~/components/Pedidos/DetallePedido/Formulario.vue'
import type { GenericTableItem } from '~/components/Genericos/Tablas/Tabla.vue'
import { usePedidosApi, type RegistrarDetallePedidoPayload } from '~/composables/usePedidosApi'
import type { DetallePedidoGuardado } from '~/components/Pedidos/DetallePedido/Formulario.vue'
import type { DetalleSubmitPayload } from '~/components/Pedidos/DetallePedido/Formulario.vue'
import { useClientesApi } from '~/composables/useClientesApi'
import { useProductosApi } from '~/composables/useProductosApi'

const searchKeys = ['id_cliente', 'fecha_pedido', 'total']

const {
  obtenerPedidos,
  obtenerDetallesPedidoPorIdPedido,
  createPedido,
  updatePedido,
  deactivatePedido,
  registrarDetallesPedido
} = usePedidosApi()
const { listClientes } = useClientesApi()
const { listProductos } = useProductosApi()
const pedidos = ref<GenericTableItem[]>([])
const clientes = ref<Record<number, string>>({})
const loading = ref(false)
const modalLoading = ref(false)
const detalleModalVisible = ref(false)
const detalleModalLoading = ref(false)

type DetallePedidoLike = {
  id?: string | number | null
  id_pedido?: string | number | null
  cantidad?: string
  precio_unitario?: string
  id_producto?: string
}

type ProductoOption = {
  label: string
  value: string | number
}

const productosOptions = ref<ProductoOption[]>([])
const detalleSeleccionada = ref<DetallePedidoLike | null>(null)
const pedidoSeleccionado = ref<GenericTableItem | null>(null)
const detallesGuardados = ref<DetallePedidoGuardado[]>([])

const fetchClientes = async () => {
  try {
    const response = await listClientes()
    const raw = (response as { data?: unknown }).data ?? response
    if (Array.isArray(raw)) {
      const clientesMap: Record<number, string> = {}
      raw.forEach((cliente: any) => {
        if (cliente.id_cliente && cliente.nombre) {
          clientesMap[cliente.id_cliente] = cliente.nombre
        }
      })
      clientes.value = clientesMap
    }
  } catch (error) {
    console.error('Error al cargar clientes:', error)
  }
}

const fetchPedidos = async () => {
  loading.value = true
  try {
    const response = await obtenerPedidos()
    const raw = (response as { data?: unknown }).data ?? response
    if (Array.isArray(raw)) {
      pedidos.value = (raw as GenericTableItem[]).filter(item => {
        const record = item as Record<string, unknown>
        const activo = record.activo ?? (record.value as Record<string, unknown> | undefined)?.activo
        return activo !== false
      })
    }
  } catch (error) {
    console.error('Error al cargar pedidos:', error)
    pedidos.value = []
  } finally {
    loading.value = false
  }
}

const getClienteName = (id_cliente: unknown): string => {
  const id = Number(id_cliente)
  return clientes.value[id] || ''
}

const formatDate = (value: unknown): string => {
  if (!value) return '—'
  try {
    const dateStr = String(value)
    if (dateStr.includes('T')) {
      const date = new Date(dateStr)
      return date.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' })
    }
    return dateStr
  } catch {
    return '—'
  }
}

const formatCurrency = (value: unknown): string => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return '—'
  }
  return parsed.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

const handleReload = () => {
  fetchPedidos()
}

const handleSubmit = async ({ data, id, closeModal }: { data: Record<string, unknown>; id?: string | number | null; closeModal: () => void }) => {
  modalLoading.value = true
  try {
    const payload = {
      id_cliente: Number(data.id_cliente),
      fecha_pedido: String(data.fecha_pedido),
      total: Number(data.total),
      activo: data.activo !== undefined ? Boolean(data.activo) : true
    }

    if (id != null) {
      await updatePedido(id, payload)
    } else {
      await createPedido(payload)
    }

    await fetchPedidos()
    closeModal()
  } catch (error) {
    console.error('Error al guardar pedido:', error)
  } finally {
    modalLoading.value = false
  }
}

const handleDelete = async (item: GenericTableItem) => {
  const id = extractId(item)
  if (id == null) return

  try {
    await deactivatePedido(id)
    await fetchPedidos()
  } catch (error) {
    console.error('Error al eliminar pedido:', error)
  }
}

const fetchProductos = async () => {
  if (productosOptions.value.length > 0) {
    return
  }

  try {
    const response = await listProductos()
    const raw = (response as { data?: unknown }).data ?? response

    if (Array.isArray(raw)) {
      productosOptions.value = (raw as GenericTableItem[])
        .map(item => {
          const record = item as Record<string, unknown>
          const valueCandidate = record.id ?? record.id_producto ?? record.value

          if (typeof valueCandidate === 'number' || typeof valueCandidate === 'string') {
            const option: ProductoOption = {
              label: String(record.nombre ?? record.label ?? 'Producto sin nombre'),
              value: String(valueCandidate)
            }
            return option
          }

          return null
        })
        .filter((option): option is ProductoOption => option !== null)
    } else {
      productosOptions.value = []
    }
  } catch (error) {
    console.error('Error al cargar productos:', error)
    productosOptions.value = []
  }
}

const handleDetallePedido = (item: GenericTableItem) => {
  const id = extractId(item)
  if (id == null) return

  pedidoSeleccionado.value = item
  detalleSeleccionada.value = null
  detallesGuardados.value = []
  detalleModalVisible.value = true
  detalleModalLoading.value = true

  fetchProductos()

  obtenerDetallesPedidoPorIdPedido(id)
    .then(response => {
      const raw = (response as { data?: unknown }).data ?? response

      if (Array.isArray(raw)) {
        detallesGuardados.value = raw as DetallePedidoGuardado[]
      } else if (raw) {
        detallesGuardados.value = [raw as DetallePedidoGuardado]
      } else {
        detallesGuardados.value = []
      }
    })
    .catch(error => {
      console.error('Error al obtener detalles del pedido:', error)
      detallesGuardados.value = []
    })
    .finally(() => {
      detalleModalLoading.value = false
    })
}

const selectedPedidoId = computed(() => {
  const item = pedidoSeleccionado.value
  if (!item) {
    return null
  }
  return extractId(item)
})

const handleDetalleModalVisibility = (value: boolean) => {
  detalleModalVisible.value = value
  if (!value) {
    detalleSeleccionada.value = null
    pedidoSeleccionado.value = null
    detallesGuardados.value = []
  }
}

const handleDetalleModalClosed = async () => {
  await fetchPedidos()
}

const handleDetalleModalUpdated = async () => {
  await fetchPedidos()
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
    const idPedidoValue = toNumericIfPossible(payload.id_pedido)

    const detallesPayload: RegistrarDetallePedidoPayload['detalles'] = payload.detalles.map(
      (detalle: DetalleSubmitPayload['detalles'][number]) => ({
        id_producto: toNumericIfPossible(detalle.id_producto),
        cantidad: normalizeDecimal(detalle.cantidad),
        precio_unitario: normalizeDecimal(detalle.precio_unitario)
      })
    )

    await registrarDetallesPedido({
      id_pedido: idPedidoValue ?? payload.id_pedido,
      detalles: detallesPayload
    })

    await fetchPedidos()
    handleDetalleModalVisibility(false)
  } catch (error) {
    console.error('Error al guardar detalle de pedido:', error)
  } finally {
    detalleModalLoading.value = false
  }
}

onMounted(async () => {
  await fetchClientes()
  await fetchPedidos()
})

const extractId = (item: GenericTableItem) => {
  const record = item as Record<string, unknown>
  const candidate =
    record.id_pedido ??
    record.id ??
    (record.value as Record<string, unknown> | undefined)?.id ??
    (record.raw as Record<string, unknown> | undefined)?.id

  if (typeof candidate === 'string' || typeof candidate === 'number') {
    return candidate
  }

  return null
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