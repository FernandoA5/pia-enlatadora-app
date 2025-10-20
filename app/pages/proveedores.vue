<template>
  <Catalogo
    list-endpoint="/api/proveedores"
    create-endpoint="/api/proveedores"
    update-endpoint="/api/proveedores"
    resource-key="proveedor"
    search-placeholder="Buscar proveedor"
    :search-keys="searchKeys"
    :transform-payload="transformPayload"
    :transform-list="transformList"
    :extract-item-id="extractId"
  >
    <template #item.telefono="{ value }">
      <span>{{ value || 'Sin teléfono' }}</span>
    </template>

    <template #item.direccion="{ value }">
      <span>{{ value || 'Sin dirección' }}</span>
    </template>

    <template #item.correo="{ value }">
      <a
        v-if="value"
        :href="`mailto:${value}`"
        class="text-primary-600 hover:underline"
      >
        {{ value }}
      </a>
      <span v-else>Sin correo</span>
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

    <template #modal="{ visible, setVisible, selectedItem, loading, submit }">
      <ProveedorModal
        :model-value="visible"
        :proveedor="selectedItem"
        :loading="loading"
        @update:modelValue="setVisible"
        @submit="submit"
        :resizable="true"
        :draggable="true"
        :maximizable="true"
        :initial-height="520"
        :initial-width="640"
        :min-height="520"
        :min-width="640"
      />
    </template>
  </Catalogo>
</template>

<script setup lang="ts">
import Catalogo from '~/components/Catalogos/Catalogo.vue'
import ProveedorModal from '~/components/Catalogos/Proveedores/Modales/Registrar.vue'
import type { GenericTableItem } from '~/components/Genericos/Tablas/Tabla.vue'

const searchKeys = ['nombre', 'telefono', 'direccion', 'correo']

const transformPayload = (
  data: Record<string, unknown>,
  _context: { mode: 'create' | 'update'; id?: string | number | null }
) => ({
  nombre: String(data.nombre ?? '').trim(),
  telefono: data.telefono ? String(data.telefono).trim() : null,
  direccion: data.direccion ? String(data.direccion).trim() : null,
  correo: data.correo ? String(data.correo).trim() : null,
  activo: data.activo !== undefined ? Boolean(data.activo) : true
})

const transformList = (response: unknown) => {
  const raw = (response as { data?: unknown }).data ?? response
  if (!Array.isArray(raw)) {
    return []
  }
  return (raw as GenericTableItem[]).filter(item => {
    const record = item as Record<string, unknown>
    const activo = record.activo ?? (record.value as Record<string, unknown> | undefined)?.activo
    return activo !== false
  })
}

const extractId = (item: GenericTableItem) => {
  const record = item as Record<string, unknown>
  const candidate =
    record.id_proveedor ??
    record.id ??
    (record.value as Record<string, unknown> | undefined)?.id ??
    (record.raw as Record<string, unknown> | undefined)?.id

  if (typeof candidate === 'string' || typeof candidate === 'number') {
    return candidate
  }

  return null
}
</script>
