<template>
  <Catalogo
    list-endpoint="/api/materias_primas"
    create-endpoint="/api/materias_primas"
    update-endpoint="/api/materias_primas"
    resource-key="materia_prima"
    search-placeholder="Buscar materia prima"
    :search-keys="searchKeys"
    :transform-payload="transformPayload"
  >
    <template #item.stock_actual="{ item, value }">
      <div class="flex justify-end">
        <span class="font-semibold text-default-900 dark:text-default-50">
          {{ Number(value ?? 0).toLocaleString('es-MX') }} {{ item.unidad_medida ?? item.unidad ?? '' }}
        </span>
      </div>
    </template>

    <template #item.stock_minimo="{ item, value }">
      <div class="flex justify-end">
        <span class="font-semibold text-default-900 dark:text-default-50">
          {{ Number(value ?? 0).toLocaleString('es-MX') }} {{ item.unidad_medida ?? item.unidad ?? '' }}
        </span>
      </div>
    </template>

    <template #modal="{ visible, setVisible, selectedItem, loading, submit }">
      <RegistrarModal
        :model-value="visible"
        :materia-prima="selectedItem"
        :loading="loading"
        @update:modelValue="setVisible"
        @submit="submit"
        :resizable="true"
        :draggable="true"
        :maximizable="true"
      />
    </template>
  </Catalogo>
</template>

<script setup lang="ts">
import Catalogo from '~/components/Catalogos/Catalogo.vue'
import RegistrarModal from '~/components/Catalogos/MateriaPrima/Modales/Registrar.vue'

const searchKeys = ['nombre', 'descripcion', 'unidad_medida']

const transformPayload = (
  data: Record<string, unknown>,
  _context: { mode: 'create' | 'update'; id?: string | number | null }
) => ({
  nombre: String(data.nombre ?? '').trim(),
  descripcion: String(data.descripcion ?? '').trim(),
  unidad_medida: String(data.unidad_medida ?? '').trim(),
  stock_actual: Number.parseFloat(String(data.stock_actual ?? 0)),
  stock_minimo: Number.parseFloat(String(data.stock_minimo ?? 0))
})
</script>
