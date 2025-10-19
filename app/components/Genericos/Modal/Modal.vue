<template>
  <div
    ref="modalRef"
    class="generic-modal"
    :class="modalClasses"
    :style="modalStyles"
  >
    <ModalTopBar
      :title="title"
      :close-label="closeLabel"
      :draggable="draggable && !isResizing"
      :maximizable="maximizable"
      :background-color="topBarBackgroundColor"
      :background-gradient="topBarBackgroundGradient"
      :text-color="topBarTextColor"
      :show-close-button="showCloseButton"
      @close="handleClose"
      @maximize="handleMaximize"
      @drag-start="handleDragStart"
      @drag-move="handleDragMove"
      @drag-end="handleDragEnd"
    >
      <template v-if="$slots.subtitle" #subtitle>
        <slot name="subtitle" />
      </template>
      <template v-if="$slots['header-actions']" #actions>
        <slot name="header-actions" />
      </template>
    </ModalTopBar>

    <ModalBody :padded="padded" :content-class="contentClass">
      <slot />
      <template v-if="$slots.footer" #footer>
        <slot name="footer" />
      </template>
    </ModalBody>

    <template v-if="resizable">
      <div
        class="resize-handle resize-handle--left"
        @pointerdown.prevent="event => startResize('left', event)"
        @pointermove="handleResizeMove"
        @pointerup="handleResizeEnd"
        @pointercancel="handleResizeCancel"
        @lostpointercapture="handleResizeCancel"
      ></div>
      <div
        class="resize-handle resize-handle--right"
        @pointerdown.prevent="event => startResize('right', event)"
        @pointermove="handleResizeMove"
        @pointerup="handleResizeEnd"
        @pointercancel="handleResizeCancel"
        @lostpointercapture="handleResizeCancel"
      ></div>
      <div
        class="resize-handle resize-handle--bottom"
        @pointerdown.prevent="event => startResize('bottom', event)"
        @pointermove="handleResizeMove"
        @pointerup="handleResizeEnd"
        @pointercancel="handleResizeCancel"
        @lostpointercapture="handleResizeCancel"
      ></div>
      <div
        class="resize-handle resize-handle--top"
        @pointerdown.prevent="event => startResize('top', event)"
        @pointermove="handleResizeMove"
        @pointerup="handleResizeEnd"
        @pointercancel="handleResizeCancel"
        @lostpointercapture="handleResizeCancel"
      ></div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import ModalTopBar from '@/components/Genericos/Modal/TopBar.vue'
import ModalBody from '@/components/Genericos/Modal/ModalBody.vue'

type ResizeDirection = 'left' | 'right' | 'bottom' | 'top'

interface DragMovePayload {
  deltaX: number
  deltaY: number
}

interface SizePayload {
  width: number
  height: number
}

interface PositionPayload {
  x: number
  y: number
}

const props = withDefaults(
  defineProps<{
    title: string
    closeLabel?: string
    draggable?: boolean
    resizable?: boolean
    maximizable?: boolean
    visible?: boolean
    minWidth?: number
    minHeight?: number
    maxWidth?: number
    maxHeight?: number
    initialWidth?: number | string
    initialHeight?: number | string
    padded?: boolean
    contentClass?: string | string[] | Record<string, boolean>
    topBarBackgroundColor?: string
    topBarBackgroundGradient?: string
    topBarTextColor?: string
    zIndex?: number
    maximizable_w?: number
    maximizable_h?: number
    showCloseButton?: boolean
  }>(),
  {
    closeLabel: 'Cerrar',
    draggable: true,
    resizable: true,
    maximizable: false,
    visible: true,
    minWidth: 320,
    minHeight: 240,
    maxWidth: undefined,
    maxHeight: undefined,
    initialWidth: 480,
    initialHeight: 360,
    padded: true,
    contentClass: undefined,
    topBarBackgroundColor: '#3F51B5',
    topBarBackgroundGradient: undefined,
    topBarTextColor: '#ffffff',
    zIndex: undefined as number | undefined,
    maximizable_w: 100,
    maximizable_h: 100,
    showCloseButton: true
  }
)

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'update:size', payload: SizePayload): void
  (event: 'update:position', payload: PositionPayload): void
  (event: 'drag-start'): void
  (event: 'drag-end'): void
  (event: 'resize-start', payload: { direction: ResizeDirection }): void
  (event: 'resize-end', payload: { direction: ResizeDirection }): void
}>()

const modalRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)
const isResizing = ref(false)
const activeResizeDirection = ref<ResizeDirection | null>(null)
const isMaximized = ref(false)
const savedSize = reactive<SizePayload>({ width: 0, height: 0 })
const savedPosition = reactive<PositionPayload>({ x: 0, y: 0 })

const topBarBackgroundColor = computed(() => props.topBarBackgroundColor)
const topBarBackgroundGradient = computed(() => props.topBarBackgroundGradient)
const topBarTextColor = computed(() => props.topBarTextColor)

const maximizableWidthPercent = computed(() => {
  const value = Number(props.maximizable_w)
  return Number.isFinite(value) ? value : 100
})

const maximizableHeightPercent = computed(() => {
  const value = Number(props.maximizable_h)
  return Number.isFinite(value) ? value : 100
})

const maximizableHeightDvh = computed(() => `${maximizableHeightPercent.value}dvh`)

const minWidthValue = computed(() => Math.max(0, props.minWidth ?? 0))
const minHeightValue = computed(() => Math.max(0, props.minHeight ?? 0))
const maxWidthValue = computed(() => {
  if (props.maxWidth === undefined || props.maxWidth === null) {
    return Number.POSITIVE_INFINITY
  }
  return Math.max(props.maxWidth, minWidthValue.value)
})
const maxHeightValue = computed(() => {
  if (props.maxHeight === undefined || props.maxHeight === null) {
    return Number.POSITIVE_INFINITY
  }
  return Math.max(props.maxHeight, minHeightValue.value)
})

const getDynamicViewportHeight = (): number => {
  if (typeof window === 'undefined') {
    return Number.POSITIVE_INFINITY
  }

  const viewport = window.visualViewport
  if (viewport && typeof viewport.height === 'number') {
    return viewport.height
  }

  return window.innerHeight
}

const viewportWidth = ref(
  typeof window !== 'undefined' ? window.innerWidth : Number.POSITIVE_INFINITY
)
const viewportHeight = ref(getDynamicViewportHeight())

const dynamicMaxHeightValue = computed(() => {
  if (!Number.isFinite(viewportHeight.value)) {
    return Number.POSITIVE_INFINITY
  }
  return viewportHeight.value * (maximizableHeightPercent.value / 100)
})

const resolveWidthValue = (value: number | string | undefined, fallback: number): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return fallback
    }

    if (trimmed.endsWith('vw')) {
      const viewport = viewportWidth.value
      const numeric = Number(trimmed.slice(0, -2))
      if (Number.isFinite(viewport) && Number.isFinite(numeric)) {
        return (numeric / 100) * viewport
      }
      return fallback
    }

    if (trimmed.endsWith('px')) {
      const numeric = Number(trimmed.slice(0, -2))
      return Number.isFinite(numeric) ? numeric : fallback
    }

    const numeric = Number(trimmed)
    return Number.isFinite(numeric) ? numeric : fallback
  }

  return fallback
}

const VIEWPORT_WIDTH_PADDING = 32

const viewportHorizontalPadding = computed(() =>
  isMaximized.value ? 0 : VIEWPORT_WIDTH_PADDING
)

const updateViewportWidth = () => {
  if (typeof window === 'undefined') {
    return
  }
  viewportWidth.value = window.innerWidth
  viewportHeight.value = getDynamicViewportHeight()
  applyResize(size.width, size.height, position.x, position.y)
}

const handleOrientationChange = () => {
  if (typeof window === 'undefined') {
    return
  }
  window.requestAnimationFrame(() => {
    updateViewportWidth()
  })
}

onMounted(() => {
  updateViewportWidth()
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateViewportWidth, { passive: true })
    window.addEventListener('orientationchange', handleOrientationChange)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewportWidth, {
        passive: true
      })
    }
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateViewportWidth)
    window.removeEventListener('orientationchange', handleOrientationChange)
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', updateViewportWidth)
    }
  }
})

const availableViewportWidth = computed(() => {
  if (!Number.isFinite(viewportWidth.value)) {
    return Number.POSITIVE_INFINITY
  }
  return Math.max(viewportWidth.value - viewportHorizontalPadding.value, 0)
})

const effectiveMinWidthValue = computed(() =>
  Math.min(minWidthValue.value, Math.max(availableViewportWidth.value, 0))
)
const effectiveMaxWidthValue = computed(() =>
  Math.min(maxWidthValue.value, Math.max(availableViewportWidth.value, 0))
)

const clampWidth = (value: number | string | undefined) => {
  const base = resolveWidthValue(value, effectiveMinWidthValue.value)
  const clampedMin = Math.max(base, effectiveMinWidthValue.value)
  return Math.min(clampedMin, effectiveMaxWidthValue.value)
}

const resolveHeightValue = (value: number | string | undefined, fallback: number): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return fallback
    }

    if (trimmed.endsWith('dvh')) {
      const viewport = getDynamicViewportHeight()
      const numeric = Number(trimmed.slice(0, -3))
      if (Number.isFinite(viewport) && Number.isFinite(numeric)) {
        return (numeric / 100) * viewport
      }
      return fallback
    }

    if (trimmed.endsWith('vh')) {
      const viewport = typeof window !== 'undefined' ? window.innerHeight : Number.POSITIVE_INFINITY
      const numeric = Number(trimmed.slice(0, -2))
      if (Number.isFinite(viewport) && Number.isFinite(numeric)) {
        return (numeric / 100) * viewport
      }
      return fallback
    }

    if (trimmed.endsWith('px')) {
      const numeric = Number(trimmed.slice(0, -2))
      return Number.isFinite(numeric) ? numeric : fallback
    }

    const numeric = Number(trimmed)
    return Number.isFinite(numeric) ? numeric : fallback
  }

  return fallback
}

const clampHeight = (value: number | string | undefined) => {
  const next = resolveHeightValue(value, minHeightValue.value)
  
  // El límite dinámico configurado tiene prioridad sobre minHeight
  let effectiveMinHeight = minHeightValue.value
  if (Number.isFinite(dynamicMaxHeightValue.value)) {
    effectiveMinHeight = Math.min(effectiveMinHeight, dynamicMaxHeightValue.value)
  }
  
  let clamped = Math.max(next, effectiveMinHeight)

  if (Number.isFinite(maxHeightValue.value)) {
    clamped = Math.min(clamped, maxHeightValue.value)
  }

  if (Number.isFinite(dynamicMaxHeightValue.value)) {
    clamped = Math.min(clamped, dynamicMaxHeightValue.value)
  }

  return clamped
}

const size = reactive<SizePayload>({
  width: clampWidth(props.initialWidth ?? minWidthValue.value),
  height: clampHeight(props.initialHeight ?? minHeightValue.value)
})

const position = reactive<PositionPayload>({ x: 0, y: 0 })

const isViewportHeightCapped = computed(() => {
  if (!Number.isFinite(dynamicMaxHeightValue.value)) {
    return false
  }
  return Math.abs(size.height - dynamicMaxHeightValue.value) <= 1
})

const modalStyles = computed(() => {
  const clampedViewportWidth = viewportWidth.value
  const viewportAllowance = availableViewportWidth.value
  const effectiveMaxWidth = Math.min(clampedViewportWidth, viewportAllowance, maxWidthValue.value)
  const appliedWidth = Math.min(size.width, effectiveMaxWidth)

  const styles: Record<string, string> = {
    width: `${appliedWidth}px`,
    height: `${size.height}px`,
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: `translate(-50%, -50%) translate3d(${position.x}px, ${position.y}px, 0)`,
    boxSizing: 'border-box'
  }

  if (isViewportHeightCapped.value) {
    styles.height = maximizableHeightDvh.value
  }

  styles.minWidth = `${effectiveMinWidthValue.value}px`
  
  // minHeight debe respetar el límite dinámico configurado
  if (Number.isFinite(dynamicMaxHeightValue.value)) {
    const effectiveMinHeight = Math.min(minHeightValue.value, dynamicMaxHeightValue.value)
    styles.minHeight = `min(${effectiveMinHeight}px, ${maximizableHeightDvh.value})`
  } else {
    styles.minHeight = `${minHeightValue.value}px`
  }

  if (Number.isFinite(effectiveMaxWidthValue.value)) {
    const effectiveMax = Math.min(effectiveMaxWidthValue.value, viewportAllowance)
    styles.maxWidth = `${effectiveMax}px`
  } else if (Number.isFinite(viewportAllowance)) {
    styles.maxWidth = `${viewportAllowance}px`
  } else {
    styles.maxWidth = '100vw'
  }

  if (Number.isFinite(dynamicMaxHeightValue.value)) {
    const fallbackPx = Math.round(dynamicMaxHeightValue.value)
    if (Number.isFinite(maxHeightValue.value)) {
      const fallbackMax = Math.min(maxHeightValue.value, fallbackPx)
      styles.maxHeight = `min(${fallbackMax}px, ${maximizableHeightDvh.value})`
    } else {
      styles.maxHeight = `min(${fallbackPx}px, ${maximizableHeightDvh.value})`
    }
  } else if (Number.isFinite(maxHeightValue.value)) {
    styles.maxHeight = `${maxHeightValue.value}px`
  }

  if (props.zIndex !== undefined) {
    const numericZIndex = Number(props.zIndex)
    if (Number.isFinite(numericZIndex)) {
      styles.zIndex = `${numericZIndex}`
    }
  }

  return styles
})

const modalClasses = computed(() => ({
  'generic-modal--dragging': isDragging.value,
  'generic-modal--resizing': isResizing.value,
  'generic-modal--resizable': props.resizable,
  'generic-modal--draggable': props.draggable
}))

const resizeState = reactive({
  startX: 0,
  startY: 0,
  startWidth: size.width,
  startHeight: size.height,
  startPosX: position.x,
  startPosY: position.y
})

const resizePointerId = ref<number | null>(null)
let lastResizeDirection: ResizeDirection | null = null

const emitSize = () => {
  emit('update:size', { width: size.width, height: size.height })
}

const emitPosition = () => {
  emit('update:position', { x: position.x, y: position.y })
}

const resetPosition = () => {
  position.x = 0
  position.y = 0
  emitPosition()
}

const resetSize = () => {
  size.width = clampWidth(props.initialWidth ?? size.width)
  size.height = clampHeight(props.initialHeight ?? size.height)
  emitSize()
}

const resetState = () => {
  isDragging.value = false
  isResizing.value = false
  isMaximized.value = false
  activeResizeDirection.value = null
  resizePointerId.value = null
  lastResizeDirection = null
  resetPosition()
  resetSize()
}

const handleClose = () => {
  emit('close')
}

const handleMaximize = () => {
  if (!props.maximizable) {
    return
  }

  if (isMaximized.value) {
    // Restaurar tamaño y posición anterior
    size.width = savedSize.width
    size.height = savedSize.height
    position.x = savedPosition.x
    position.y = savedPosition.y
    isMaximized.value = false
  } else {
    // Guardar tamaño y posición actual antes de maximizar
    savedSize.width = size.width
    savedSize.height = size.height
    savedPosition.x = position.x
    savedPosition.y = position.y

    const viewportWidthValue = typeof window !== 'undefined' ? window.innerWidth : 1920
    const viewportHeightValue = typeof window !== 'undefined' ? window.innerHeight : 1080

    isMaximized.value = true

    const targetWidth = viewportWidthValue * (maximizableWidthPercent.value / 100)
    const targetHeight = viewportHeightValue * (maximizableHeightPercent.value / 100)

    // Maximizar usando los valores configurables
    size.width = clampWidth(targetWidth)
    size.height = clampHeight(targetHeight)
    position.x = 0
    position.y = 0
  }
  
  emitSize()
  emitPosition()
}

const handleDragStart = () => {
  if (!props.draggable) {
    return
  }
  isDragging.value = true
  emit('drag-start')
}

const handleDragMove = ({ deltaX, deltaY }: DragMovePayload) => {
  if (!props.draggable || isResizing.value) {
    return
  }
  if (deltaX === 0 && deltaY === 0) {
    return
  }
  position.x += deltaX
  position.y += deltaY
  emitPosition()
}

const handleDragEnd = () => {
  if (!props.draggable) {
    return
  }
  if (isDragging.value) {
    isDragging.value = false
    emit('drag-end')
  }
}

const startResize = (direction: ResizeDirection, event: PointerEvent) => {
  if (!props.resizable || isDragging.value || event.button !== 0) {
    return
  }

  lastResizeDirection = direction
  activeResizeDirection.value = direction
  isResizing.value = true
  resizePointerId.value = event.pointerId

  resizeState.startX = event.clientX
  resizeState.startY = event.clientY
  resizeState.startWidth = size.width
  resizeState.startHeight = size.height
  resizeState.startPosX = position.x
  resizeState.startPosY = position.y

  try {
    (event.currentTarget as HTMLElement | null)?.setPointerCapture(event.pointerId)
  } catch (error) {
    // Ignorar navegadores sin soporte de pointer capture
  }

  emit('resize-start', { direction })
}

const applyResize = (newWidth: number, newHeight: number, newX: number, newY: number) => {
  let widthChanged = false
  let heightChanged = false
  let positionChanged = false

  const clampedWidth = clampWidth(newWidth)
  if (clampedWidth !== size.width) {
    size.width = clampedWidth
    widthChanged = true
  }

  const clampedHeight = clampHeight(newHeight)
  if (clampedHeight !== size.height) {
    size.height = clampedHeight
    heightChanged = true
  }

  if (newX !== position.x || newY !== position.y) {
    position.x = newX
    position.y = newY
    positionChanged = true
  }

  if (widthChanged || heightChanged) {
    emitSize()
  }

  if (positionChanged) {
    emitPosition()
  }
}

const handleResizeMove = (event: PointerEvent) => {
  if (!isResizing.value || resizePointerId.value !== event.pointerId || !activeResizeDirection.value) {
    return
  }

  event.preventDefault()

  const deltaX = event.clientX - resizeState.startX
  const deltaY = event.clientY - resizeState.startY

  let nextWidth = resizeState.startWidth
  let nextHeight = resizeState.startHeight
  let nextX = resizeState.startPosX
  let nextY = resizeState.startPosY
  const leftEdge = resizeState.startPosX - resizeState.startWidth / 2
  const rightEdge = resizeState.startPosX + resizeState.startWidth / 2
  const topEdge = resizeState.startPosY - resizeState.startHeight / 2
  const bottomEdge = resizeState.startPosY + resizeState.startHeight / 2

  switch (activeResizeDirection.value) {
    case 'left': {
      const candidateWidth = resizeState.startWidth - deltaX
      nextWidth = clampWidth(candidateWidth)
      nextX = rightEdge - nextWidth / 2
      break
    }
    case 'right': {
      const candidateWidth = resizeState.startWidth + deltaX
      nextWidth = clampWidth(candidateWidth)
      nextX = leftEdge + nextWidth / 2
      break
    }
    case 'bottom': {
      const candidateHeight = resizeState.startHeight + deltaY
      nextHeight = clampHeight(candidateHeight)
      nextY = topEdge + nextHeight / 2
      break
    }
    case 'top': {
      const candidateHeight = resizeState.startHeight - deltaY
      nextHeight = clampHeight(candidateHeight)
      nextY = bottomEdge - nextHeight / 2
      break
    }
  }

  applyResize(nextWidth, nextHeight, nextX, nextY)
}

const finishResize = () => {
  if (!isResizing.value) {
    return
  }
  const direction = activeResizeDirection.value ?? lastResizeDirection
  isResizing.value = false
  activeResizeDirection.value = null
  resizePointerId.value = null
  if (direction) {
    emit('resize-end', { direction })
  }
}

const handleResizeEnd = (event: PointerEvent) => {
  if (resizePointerId.value !== event.pointerId) {
    return
  }

  try {
    (event.currentTarget as HTMLElement | null)?.releasePointerCapture(event.pointerId)
  } catch (error) {
    // Ignorar navegadores sin soporte de pointer capture
  }

  finishResize()
}

const handleResizeCancel = () => {
  finishResize()
}

watch(
  () => props.visible,
  visible => {
    if (visible) {
      resetState()
    } else {
      finishResize()
      handleDragEnd()
    }
  },
  { immediate: true }
)

watch([effectiveMinWidthValue, effectiveMaxWidthValue], () => {
  applyResize(size.width, size.height, position.x, position.y)
})

watch([minHeightValue, maxHeightValue], () => {
  applyResize(size.width, size.height, position.x, position.y)
})

watch(dynamicMaxHeightValue, () => {
  applyResize(size.width, size.height, position.x, position.y)
})

watch(
  () => props.initialWidth,
  value => {
    if (value !== undefined) {
      size.width = clampWidth(value)
      emitSize()
    }
  }
)

watch(
  () => props.initialHeight,
  value => {
    if (value !== undefined) {
      size.height = clampHeight(value)
      emitSize()
    }
  }
)

const exposeApi = {
  reset: resetState,
  resetPosition,
  resetSize,
  getSize: () => ({ ...size }),
  getPosition: () => ({ ...position })
}

defineExpose(exposeApi)
</script>

<style scoped>
.generic-modal {
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.25);
  overflow: hidden;
  will-change: transform, width, height;
  transform-origin: top left;
}

.generic-modal--dragging {
  cursor: grabbing;
}

.generic-modal--draggable {
  user-select: none;
}

.generic-modal--resizable .resize-handle {
  position: absolute;
  z-index: 20;
  background: transparent;
}

.resize-handle--left,
.resize-handle--right {
  top: 12px;
  bottom: 12px;
  width: 10px;
}

.resize-handle--left {
  left: -5px;
  cursor: ew-resize;
}

.resize-handle--right {
  right: -5px;
  cursor: ew-resize;
}

.resize-handle--bottom,
.resize-handle--top {
  left: 16px;
  right: 16px;
  height: 10px;
}

.resize-handle--bottom {
  bottom: -5px;
  cursor: ns-resize;
}

.resize-handle--top {
  top: -5px;
  cursor: ns-resize;
}
</style>
