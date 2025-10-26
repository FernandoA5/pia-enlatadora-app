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
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Catalogo from '~/components/Catalogos/Catalogo.vue'
import PedidoFormulario from '~/components/Pedidos/Formulario.vue'
import type { GenericTableItem } from '~/components/Genericos/Tablas/Tabla.vue'
import { usePedidosApi } from '~/composables/usePedidosApi'
import { useClientesApi } from '~/composables/useClientesApi'

const searchKeys = ['id_cliente', 'fecha_pedido', 'total']

const { obtenerPedidos, createPedido, updatePedido, deactivatePedido } = usePedidosApi()
const { listClientes } = useClientesApi()
const pedidos = ref<GenericTableItem[]>([])
const clientes = ref<Record<number, string>>({})
const loading = ref(false)
const modalLoading = ref(false)

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