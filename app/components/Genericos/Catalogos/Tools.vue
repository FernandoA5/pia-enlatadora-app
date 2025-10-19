<template>
  <div class="toolbar">
    <div class="search-container">
      <Icon name="mdi:magnify" class="search-icon" aria-hidden="true" />
      <input
        v-model="searchQuery"
        :placeholder="placeholder"
        :aria-label="placeholder"
        class="search-input"
        type="search"
      >
    </div>
    <button
      type="button"
      class="toolbar-action"
      @click="emit('clear')"
    >
      <Icon name="mdi:filter-variant-remove" class="button-icon" aria-hidden="true" />
      <span>Limpiar filtros</span>
    </button>
    <button
      type="button"
      class="toolbar-button"
      :class="{ loading }"
      :title="loading ? 'Recargando…' : 'Recargar'"
      :disabled="loading"
      @click="emit('reload')"
    >
      <Icon name="mdi:reload" class="button-icon" aria-hidden="true" />
    </button>
    <button
      type="button"
      class="toolbar-button"
      title="Añadir nuevo"
      @click="emit('add')"
    >
      <Icon name="mdi:plus" class="button-icon" aria-hidden="true" />
    </button>
  </div>
</template>

<script lang="ts" setup>
import { toRefs } from 'vue'

const searchQuery = defineModel<string>({ default: '' })

const props = withDefaults(
  defineProps<{
    loading?: boolean
    placeholder?: string
  }>(),
  {
    loading: false,
    placeholder: 'Buscar por nombre o usuario'
  }
)

const emit = defineEmits<{
  (e: 'clear'): void
  (e: 'reload'): void
  (e: 'add'): void
}>()

const { loading, placeholder } = toRefs(props)
</script>

<style scoped>
.toolbar {
  margin: 24px 40px 0 40px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(250, 250, 250, 0.98));
  backdrop-filter: blur(20px) saturate(120%);
  border: 1px solid rgba(0, 120, 212, 0.15);
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.08),
    0 1px 3px rgba(0, 0, 0, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.3s ease;
}

.toolbar:hover {
  box-shadow:
    0 6px 28px rgba(0, 120, 212, 0.12),
    0 2px 6px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  border-color: rgba(0, 120, 212, 0.25);
}

.search-container {
  flex: 1;
  position: relative;
}

.search-input {
  width: 100%;
  padding: 10px 16px 10px 44px;
  border: 1px solid rgba(0, 120, 212, 0.2);
  border-radius: 8px;
  font-size: 14px;
  font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
  background: rgba(255, 255, 255, 0.8);
  transition: all 0.25s ease;
  color: #333;
}

.search-input:focus {
  outline: none;
  border-color: #0078d4;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(0, 120, 212, 0.1);
}

.search-input::placeholder {
  color: #999;
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: #666;
}

.toolbar-action {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(0, 120, 212, 0.2);
  border-radius: 8px;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.9), rgba(245, 245, 245, 0.95));
  color: #0078d4;
  cursor: pointer;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.toolbar-action:hover {
  background: linear-gradient(to bottom, rgba(0, 120, 212, 0.1), rgba(0, 120, 212, 0.15));
  border-color: #0078d4;
  box-shadow: 0 4px 12px rgba(0, 120, 212, 0.15);
  transform: translateY(-1px);
}

.toolbar-action:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 120, 212, 0.2);
}

.toolbar-button {
  width: 40px;
  height: 40px;
  border: 1px solid rgba(0, 120, 212, 0.2);
  border-radius: 8px;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.9), rgba(245, 245, 245, 0.95));
  color: #0078d4;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.toolbar-button:hover {
  background: linear-gradient(to bottom, rgba(0, 120, 212, 0.1), rgba(0, 120, 212, 0.15));
  border-color: #0078d4;
  box-shadow: 0 4px 12px rgba(0, 120, 212, 0.15);
  transform: translateY(-1px);
}

.toolbar-button:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toolbar-button:disabled {
  cursor: not-allowed;
  opacity: 0.7;
  box-shadow: none;
}

.button-icon {
  width: 20px;
  height: 20px;
}

.toolbar-button.loading .button-icon {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
