<template>
  <header
    ref="topbarRef"
    class="modal-topbar"
    :class="{
      'modal-topbar--draggable': props.draggable,
      'modal-topbar--dragging': props.draggable && isDragging
    }"
    :style="topbarStyle"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointercancel="handlePointerCancel"
    @lostpointercapture="handlePointerCancel"
  >
    <div class="modal-topbar__title">
      <h3>{{ title }}</h3>
      <slot name="subtitle" />
    </div>

    <div class="modal-topbar__actions">
      <slot name="actions" />
      <button
        v-if="maximizable"
        class="maximize-button"
        title="Maximizar"
        @click="$emit('maximize')"
        aria-label="Maximizar"
      >
        <span class="maximize-button__icon" aria-hidden="true"></span>
      </button>
      <button
        v-if="showCloseButton"
        class="close-button"
        :title="closeLabel"
        @click="$emit('close')"
        :aria-label="closeLabel"
      >
        <span aria-hidden="true">✕</span>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    title: string
    closeLabel?: string
    draggable?: boolean
    maximizable?: boolean
    backgroundColor?: string
    backgroundGradient?: string
    textColor?: string
    showCloseButton?: boolean
  }>(),
  {
    closeLabel: 'Cerrar',
    draggable: false,
    maximizable: false,
    backgroundColor: '#3F51B5',
    backgroundGradient: undefined,
    textColor: '#ffffff',
    showCloseButton: true
  }
)

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'maximize'): void
  (event: 'drag-start'): void
  (event: 'drag-move', payload: { deltaX: number; deltaY: number }): void
  (event: 'drag-end'): void
}>()

const topbarRef = ref<HTMLElement | null>(null)
const pointerId = ref<number | null>(null)
const isDragging = ref(false)
const lastPosition = reactive({ x: 0, y: 0 })

const topbarStyle = computed(() => ({
  background: props.backgroundGradient ?? props.backgroundColor,
  color: props.textColor
}))

const hasInteractiveAncestor = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  return Boolean(
    target.closest('button, a, input, select, textarea, [data-draggable-ignore="true"]')
  )
}

const handlePointerDown = (event: PointerEvent) => {
  if (!props.draggable || event.button !== 0) {
    return
  }

  if (hasInteractiveAncestor(event.target)) {
    return
  }

  try {
    topbarRef.value?.setPointerCapture(event.pointerId)
  } catch (error) {
    // Ignorar errores de captura en navegadores que no lo soporten
  }

  pointerId.value = event.pointerId
  isDragging.value = true
  lastPosition.x = event.clientX
  lastPosition.y = event.clientY
  emit('drag-start')
  event.preventDefault()
}

const handlePointerMove = (event: PointerEvent) => {
  if (!props.draggable || !isDragging.value || pointerId.value !== event.pointerId) {
    return
  }

  const deltaX = event.clientX - lastPosition.x
  const deltaY = event.clientY - lastPosition.y

  if (deltaX === 0 && deltaY === 0) {
    return
  }

  lastPosition.x = event.clientX
  lastPosition.y = event.clientY

  emit('drag-move', { deltaX, deltaY })
}

const endDrag = () => {
  if (!isDragging.value) {
    return
  }

  isDragging.value = false
  pointerId.value = null
  emit('drag-end')
}

const handlePointerUp = (event: PointerEvent) => {
  if (!props.draggable || pointerId.value !== event.pointerId) {
    return
  }

  try {
    topbarRef.value?.releasePointerCapture(event.pointerId)
  } catch (error) {
    // Ignorar errores de liberación en navegadores que no lo soporten
  }

  endDrag()
}

const handlePointerCancel = () => {
  endDrag()
}
</script>

<style scoped>
.modal-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.2rem;
  padding: 0.4rem 1rem;
  color: #ffffff;
  border-bottom: 1px solid rgba(43, 45, 66, 0.1);
}

.modal-topbar h3 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.modal-topbar__title {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.modal-topbar__actions {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
}

.close-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: none;
  border-radius: 0.75rem;
  background: transparent;
  color: #ffffff;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease;
  outline: none;
}

.close-button span {
  pointer-events: none;
}

.close-button:hover {
  transform: translateY(-2px) scale(1.1);
  background: rgba(255, 255, 255, 0.12);
}

.close-button:active {
  transform: translateY(0) scale(1);
}

.close-button:focus-visible {
  box-shadow: 0 0 0 2px rgba(43, 45, 66, 0.2);
}

.maximize-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: none;
  border-radius: 0.75rem;
  background: transparent;
  color: #ffffff;
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease;
  outline: none;
}

.maximize-button span {
  pointer-events: none;
}

.maximize-button__icon {
  display: inline-block;
  width: 1.2rem;
  height: 1.2rem;
  border: 2px solid currentColor;
  border-radius: 0.2rem;
  box-sizing: border-box;
}

.maximize-button:hover {
  transform: translateY(-2px) scale(1.1);
  background: rgba(255, 255, 255, 0.12);
}

.maximize-button:active {
  transform: translateY(0) scale(1);
}

.maximize-button:focus-visible {
  box-shadow: 0 0 0 2px rgba(43, 45, 66, 0.2);
}

.modal-topbar--draggable {
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.modal-topbar--dragging {
  cursor: grabbing;
}
</style>
