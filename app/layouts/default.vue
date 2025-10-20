<template>
  <div class="layout">
    <aside class="sidebar" :class="{ collapsed: isCollapsed }">
      <div class="sidebar-header">
        <button
          type="button"
          class="sidebar-toggle"
          aria-label="Alternar navegación"
          @click="toggleSidebar"
        >
          <Icon name="mdi:menu" aria-hidden="true" />
        </button>
        
        <div v-if="!isCollapsed" class="sidebar-brand">Enlatadora</div>
        <Icon
          v-if="!isCollapsed"
          name="mdi:factory"
          class="sidebar-brand-icon"
          aria-hidden="true"
        />
      </div>
      <nav class="nav-section">
        <template v-for="item in menuItems" :key="item.label">
          <button
            v-if="item.to"
            type="button"
            class="nav-item"
            :class="{ active: isMenuItemActive(item) }"
            :aria-label="isCollapsed ? item.label : undefined"
            :title="isCollapsed ? item.label : undefined"
            @click="navigateTo(item)"
          >
            <Icon v-if="item.icon" :name="item.icon" class="nav-icon" aria-hidden="true" />
            <span v-if="!isCollapsed">{{ item.label }}</span>
          </button>
          <div v-else class="nav-group">
            <div
              class="nav-group-label"
              :class="{ active: isMenuItemActive(item) }"
              :aria-label="isCollapsed ? item.label : undefined"
              :title="isCollapsed ? item.label : undefined"
            >
              <Icon v-if="item.icon" :name="item.icon" class="nav-icon" aria-hidden="true" />
              <span v-if="!isCollapsed">{{ item.label }}</span>
            </div>
            <button
              v-for="child in item.children"
              :key="child.label"
              type="button"
              class="nav-item nav-child"
              :class="{ active: isMenuItemActive(child) }"
              :aria-label="isCollapsed ? child.label : undefined"
              :title="isCollapsed ? child.label : undefined"
              @click="navigateTo(child)"
            >
              <Icon v-if="child.icon" :name="child.icon" class="nav-icon" aria-hidden="true" />
              <span v-if="!isCollapsed">{{ child.label }}</span>
            </button>
          </div>
        </template>
      </nav>
    </aside>
    <main class="content">
      <!-- <div class="content-header">{{ currentRouteTitle }}</div> -->
      <div class="content-body">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const route = useRoute()
const router = useRouter()

interface MenuItem {
  label: string
  icon?: string
  to?: string
  children?: MenuItem[]
}

const COLLAPSE_BREAKPOINT = 1150

const isCollapsed = ref(false)
const autoCollapsed = ref(false)

const menuItems = computed<MenuItem[]>(() => [
  {
    label: 'Dashboard',
    icon: 'material-symbols:home-rounded',
    to: '/'
  },
  {
    label: 'Catálogos',
    icon: 'mdi:folder-multiple',
    children: [
      {
        label: 'Materia Prima',
        icon: 'mdi:cube-outline',
        to: '/materia_prima'
      },
      {
        label: 'Proveedores',
        icon: 'mdi:handshake-outline',
        to: '/proveedores'
      },
      {
        label: 'Clientes',
        icon: 'mdi:account-multiple-outline',
        to: '/clientes'
      },
      {
        label: 'Productos',
        icon: 'mdi:package-variant-closed',
        to: '/productos'
      }
    ]
  }
])

const currentRouteTitle = computed(() => {
  const slug = route.path.replace(/\/+$/, '').split('/').pop() || 'dashboard'
  return slug
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
})

const isMenuItemActive = (item: MenuItem): boolean => {
  if (item.to) {
    if (item.to === '/') return route.path === '/'
    return route.path.startsWith(item.to)
  }
  return item.children?.some((child) => isMenuItemActive(child)) ?? false
}

const navigateTo = (item: MenuItem) => {
  if (!item.to) return
  if (route.path !== item.to) router.push(item.to)
}

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
  autoCollapsed.value = false
}

const updateCollapseState = () => {
  if (typeof window === 'undefined') return
  if (window.innerWidth <= COLLAPSE_BREAKPOINT) {
    isCollapsed.value = true
    autoCollapsed.value = true
  } else if (autoCollapsed.value) {
    isCollapsed.value = false
    autoCollapsed.value = false
  }
}

onMounted(() => {
  updateCollapseState()
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateCollapseState, { passive: true })
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateCollapseState)
  }
})
</script>

<style scoped>
:global(body) {
  margin: 0;
  font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
}

.layout {
  display: flex;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: linear-gradient(135deg, #0078d4 0%, #0063b1 25%, #005a9e 50%, #004578 100%);
}

.sidebar {
  width: 280px;
  flex: 0 0 280px;
  background: linear-gradient(to bottom, rgba(0, 30, 60, 0.85), rgba(0, 20, 45, 0.9));
  backdrop-filter: blur(40px) saturate(180%);
  border-right: 1px solid rgba(0, 180, 255, 0.2);
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.3), inset -1px 0 0 rgba(0, 180, 255, 0.1);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.sidebar.collapsed {
  width: 80px;
  flex: 0 0 80px;
}

.sidebar-header {
  font-size: 24px;
  font-weight: 300;
  letter-spacing: 0.5px;
  padding: 30px 24px 20px 24px;
  color: white;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  gap: 12px;
}

.sidebar.collapsed .sidebar-header {
  justify-content: center;
  padding: 24px 16px;
}

.sidebar-brand {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.sidebar.collapsed .sidebar-brand,
.sidebar.collapsed .sidebar-brand-icon {
  opacity: 0;
  transform: translateY(-4px);
  pointer-events: none;
}

.sidebar-brand-icon {
  width: 28px;
  height: 28px;
}

.sidebar-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid rgba(0, 180, 255, 0.25);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(0, 120, 212, 0.1));
  color: #e5f6ff;
  cursor: pointer;
  transition: all 0.25s ease;
  margin-left: -1rem;
}

.sidebar-toggle:hover {
  border-color: rgba(0, 180, 255, 0.5);
  background: linear-gradient(135deg, rgba(0, 180, 255, 0.2), rgba(0, 120, 212, 0.2));
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.sidebar.collapsed .sidebar-toggle {
  width: 44px;
  height: 44px;
}

.nav-section {
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  background: transparent;
  border: none;
  border-left: 3px solid transparent;
  padding: 16px 24px;
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 15px;
  font-weight: 400;
  position: relative;
  overflow: hidden;
  width: 100%;
  text-align: left;
}

.sidebar.collapsed .nav-item {
  justify-content: center;
  padding: 16px;
  border-left-width: 0;
}

.nav-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 0%;
  height: 100%;
  background: linear-gradient(to right, rgba(0, 180, 255, 0.15), transparent);
  transition: width 0.3s ease;
}

.nav-item:hover {
  color: white;
  background: rgba(0, 180, 255, 0.08);
  border-left-color: rgba(0, 180, 255, 0.5);
}

.nav-item:hover::before {
  width: 100%;
}

.nav-item.active {
  background: linear-gradient(to right, rgba(0, 120, 212, 0.25), rgba(0, 120, 212, 0.08));
  border-left-color: #00b4ff;
  color: white;
  font-weight: 500;
  box-shadow: inset 0 0 20px rgba(0, 180, 255, 0.1);
}

.nav-group {
  display: flex;
  flex-direction: column;
}

.nav-group-label {
  padding: 16px 24px 8px 24px;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: rgba(255, 255, 255, 0.6);
  display: flex;
  align-items: center;
  gap: 12px;
}

.sidebar.collapsed .nav-group-label {
  justify-content: center;
  padding: 16px;
}

.nav-group-label.active {
  color: white;
}

.nav-child {
  padding-left: 48px;
  font-size: 14px;
}

.sidebar.collapsed .nav-child {
  padding-left: 16px;
}

.sidebar.collapsed .nav-child::before {
  display: none;
}

.nav-icon {
  width: 20px;
  height: 20px;
  color: rgba(255, 255, 255, 0.85);
}

.sidebar.collapsed .nav-icon {
  width: 22px;
  height: 22px;
}

.content {
  flex: 1;
  background: white;
  display: flex;
  flex-direction: column;
  color: #1f2933;
}

.content-header {
  font-size: 32px;
  font-weight: 300;
  letter-spacing: 0.3px;
  padding: 40px;
  color: white;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

.content-body {
  flex: 1;
  overflow-y: auto;
}

::-webkit-scrollbar {
  width: 10px;
}

::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
}

::-webkit-scrollbar-thumb {
  background: linear-gradient(to bottom, rgba(0, 180, 255, 0.5), rgba(0, 120, 212, 0.5));
  border-radius: 5px;
}

::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(to bottom, rgba(0, 180, 255, 0.7), rgba(0, 120, 212, 0.7));
}
</style>
