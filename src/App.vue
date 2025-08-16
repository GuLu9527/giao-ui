<template>
  <div class="app">
    <!-- 侧边导航栏 -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <IconLogo class="logo-icon" />
          <span class="logo-text">OllamaUI</span>
        </div>
      </div>
      
      <nav class="sidebar-nav">
        <router-link 
          v-for="route in navigationRoutes" 
          :key="route.name"
          :to="route.path" 
          class="nav-item"
          :class="{ 'is-active': $route.name === route.name }"
        >
          <component :is="getIconComponent(route.meta?.icon)" class="nav-icon" />
          <span class="nav-text">{{ route.meta?.title }}</span>
        </router-link>
      </nav>
      
      <div class="sidebar-footer">
        <div class="connection-status" :class="{ 'is-connected': isConnected }">
          <div class="status-indicator"></div>
          <span class="status-text">
            {{ isConnected ? '已连接' : '未连接' }}
          </span>
        </div>
      </div>
    </aside>
    
    <!-- 主内容区域 -->
    <main class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useOllamaStore } from '@/stores/ollama'
import { useTheme } from '@/composables/useTheme'
import IconLogo from '@/components/icons/IconLogo.vue'
import IconChat from '@/components/icons/IconChat.vue'
import IconModel from '@/components/icons/IconModel.vue'
import IconDashboard from '@/components/icons/IconDashboard.vue'
import IconSettings from '@/components/icons/IconSettings.vue'
import IconTooling from '@/components/icons/IconTooling.vue'

// 响应式状态
const isConnected = ref(false)

// 获取路由实例
let router: any = null
let ollamaStore: any = null

try {
  router = useRouter()
  ollamaStore = useOllamaStore()
  isConnected.value = ollamaStore.isConnected
} catch (error) {
  console.warn('Router or store not available yet:', error)
}

// 初始化主题系统
const { currentTheme } = useTheme()

// 导航路由
const navigationRoutes = computed(() => {
  if (!router) return []
  return router.getRoutes().filter((route: any) => route.meta?.title)
})

// 图标组件映射
const iconComponents = {
  chat: IconChat,
  model: IconModel,
  dashboard: IconDashboard,
  user: IconTooling,
  settings: IconSettings
}

function getIconComponent(iconName?: string) {
  return iconComponents[iconName as keyof typeof iconComponents] || IconChat
}

// 初始化应用
onMounted(async () => {
  if (ollamaStore && typeof ollamaStore.initialize === 'function') {
    try {
      await ollamaStore.initialize()
      isConnected.value = ollamaStore.isConnected
    } catch (error) {
      console.error('Failed to initialize ollama store:', error)
    }
  }
})
</script>

<style scoped>
.app {
  display: flex;
  height: 100vh;
  background: var(--gray-50);
}

/* 侧边栏 */
.sidebar {
  width: 240px;
  background: var(--primary-white);
  border-right: 1px solid var(--gray-100);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: var(--spacing-4);
  border-bottom: 1px solid var(--gray-100);
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.logo-icon {
  width: 24px;
  height: 24px;
  color: var(--primary-black);
}

.logo-text {
  font-size: 17px;
  font-weight: 600;
  color: var(--primary-black);
}

.sidebar-nav {
  flex: 1;
  padding: var(--spacing-2);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3) var(--spacing-4);
  border-radius: var(--radius-medium);
  text-decoration: none;
  color: var(--gray-600);
  font-size: 15px;
  font-weight: 400;
  transition: all var(--duration-normal) var(--ease-out);
}

.nav-item:hover {
  background: var(--gray-100);
  color: var(--primary-black);
}

.nav-item.is-active {
  background: var(--primary-black);
  color: var(--primary-white);
}

.nav-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.nav-text {
  flex: 1;
}

.sidebar-footer {
  padding: var(--spacing-4);
  border-top: 1px solid var(--gray-100);
}

.connection-status {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--error-red);
  transition: all var(--duration-normal) var(--ease-out);
}

.connection-status.is-connected .status-indicator {
  background: var(--success-green);
}

.status-text {
  font-size: 13px;
  color: var(--gray-500);
}

/* 主内容区域 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100vh;
  overflow: hidden;
}
</style>