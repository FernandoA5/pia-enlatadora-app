<template>
  <div class="modal-body" :class="containerClasses">
    <div class="modal-body__content" :class="contentClasses">
      <slot />
    </div>

    <template v-if="$slots.footer">
      <div class="modal-body__divider" />
      <div class="modal-body__footer">
        <slot name="footer" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    padded?: boolean
    contentClass?: string | string[] | Record<string, boolean>
  }>(),
  {
    padded: true,
    contentClass: undefined
  }
)

const containerClasses = computed(() => ({
  'modal-body--padded': props.padded
}))

const contentClasses = computed(() => props.contentClass)
</script>

<style scoped>
.modal-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background: #ffffff;
  /* border-radius: 12px; */
  overflow: visible;
}

.modal-body__content {
  flex: 1;
  min-height: 0;
}

.modal-body--padded .modal-body__content {
  padding: 1rem;
}

.modal-body__divider {
  margin: 0;
}

.modal-body__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: auto;
  gap: 0.75rem;
  padding: 0.75rem 1rem 1rem;
}
</style>
