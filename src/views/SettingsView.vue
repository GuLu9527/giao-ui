<template>
  <div class="settings-view">
    <!-- 页面头部 -->
    <header class="page-header">
      <div class="header-content">
        <div class="header-info">
          <h1 class="page-title">设置</h1>
          <p class="page-description">个性化您的AI助手体验</p>
        </div>
        
        <div class="header-actions">
          <div class="auto-save-indicator">
            <span class="indicator-text">设置自动保存</span>
            <div class="indicator-dot"></div>
          </div>
        </div>
      </div>
    </header>

    <div class="settings-container">
      <!-- 设置导航 -->
      <aside class="settings-sidebar">
        <nav class="settings-nav">
          <button 
            v-for="section in settingSections" 
            :key="section.id"
            @click="activeSection = section.id"
            class="nav-item"
            :class="{ active: activeSection === section.id }"
          >
            <component :is="section.icon" class="nav-icon" />
            <span class="nav-label">{{ section.label }}</span>
          </button>
        </nav>
      </aside>

      <!-- 设置内容 -->
      <main class="settings-content">
        <!-- 常规设置 -->
        <div v-if="activeSection === 'general'" class="settings-section">
          <div class="section-header">
            <h2 class="section-title">常规设置</h2>
            <p class="section-description">基础应用配置选项</p>
          </div>

          <div class="settings-group">
            <div class="setting-item">
              <div class="setting-info">
                <h3 class="setting-title">自动保存对话</h3>
                <p class="setting-description">自动保存聊天记录到本地存储</p>
              </div>
              <div class="setting-control">
                <label class="toggle">
                  <input 
                    type="checkbox" 
                    v-model="settings.general.autoSave"
                  />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div class="setting-item">
              <div class="setting-info">
                <h3 class="setting-title">清理间隔</h3>
                <p class="setting-description">自动清理过期聊天记录的间隔天数</p>
              </div>
              <div class="setting-control">
                <input 
                  type="number" 
                  v-model="settings.general.cleanupDays"
                  min="1"
                  max="365"
                  class="input input-small"
                />
              </div>
            </div>

          </div>
        </div>

        <!-- 服务器设置 -->
        <div v-if="activeSection === 'server'" class="settings-section">
          <div class="section-header">
            <h2 class="section-title">服务器配置</h2>
            <p class="section-description">Ollama服务器连接配置</p>
          </div>

          <div class="settings-group">
            <div class="setting-item">
              <div class="setting-info">
                <h3 class="setting-title">自动重连</h3>
                <p class="setting-description">连接断开时自动重新连接</p>
              </div>
              <div class="setting-control">
                <label class="toggle">
                  <input 
                    type="checkbox" 
                    v-model="settings.server.autoReconnect"
                  />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div class="setting-item">
              <div class="setting-info">
                <h3 class="setting-title">健康检查</h3>
                <p class="setting-description">定期检查服务器连接状态</p>
              </div>
              <div class="setting-control">
                <label class="toggle">
                  <input 
                    type="checkbox" 
                    v-model="settings.server.healthCheck"
                  />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>

          <div class="settings-group">
            <div class="setting-test">
              <button 
                @click="testConnection"
                class="btn btn-secondary"
                :disabled="isTesting"
              >
                <div v-if="isTesting" class="animate-spin">
                  <IconLoader class="btn-icon" />
                </div>
                <template v-else>测试连接</template>
              </button>
              
              <div v-if="connectionTestResult" class="test-result" :class="connectionTestResult.status">
                <IconStatus v-if="connectionTestResult.status === 'success'" class="result-icon" />
                <IconClose v-else class="result-icon" />
                <span>{{ connectionTestResult.message }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 主题设置 -->
        <div v-if="activeSection === 'appearance'" class="settings-section">
          <div class="section-header">
            <h2 class="section-title">外观主题</h2>
            <p class="section-description">自定义界面外观和主题</p>
          </div>

          <div class="settings-group">
            <div class="setting-item">
              <div class="setting-info">
                <h3 class="setting-title">主题模式</h3>
                <p class="setting-description">选择浅色或深色主题</p>
              </div>
              <div class="setting-control">
                <select v-model="settings.appearance.theme" class="select">
                  <option value="light">浅色主题</option>
                  <option value="dark">深色主题</option>
                  <option value="auto">跟随系统</option>
                </select>
              </div>
            </div>

          </div>
        </div>

      </main>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, shallowRef } from 'vue'
import { useOllamaStore } from '@/stores/ollama'
import { useTheme } from '@/composables/useTheme'

// 图标组件
import IconLoader from '@/components/icons/IconLoader.vue'
import IconGeneral from '@/components/icons/IconGeneral.vue'
import IconServer from '@/components/icons/IconServer.vue'
import IconTheme from '@/components/icons/IconTheme.vue'
import IconStatus from '@/components/icons/IconStatus.vue'
import IconClose from '@/components/icons/IconClose.vue'

const ollamaStore = useOllamaStore()
const { currentTheme, setTheme } = useTheme()

// 状态管理
const activeSection = ref('general')
const isTesting = ref(false)

// 连接测试结果
const connectionTestResult = ref<{
  status: 'success' | 'error'
  message: string
} | null>(null)

// 设置分组
const settingSections = [
  { id: 'general', label: '常规', icon: shallowRef(IconGeneral) },
  { id: 'server', label: '服务器', icon: shallowRef(IconServer) },
  { id: 'appearance', label: '外观', icon: shallowRef(IconTheme) }
]

// 设置对象 - 使用 store 中的设置
const settings = reactive({
  general: {
    autoSave: computed({
      get: () => ollamaStore.settings.autoSave,
      set: (value) => ollamaStore.updateSettings({ autoSave: value })
    }),
    cleanupDays: computed({
      get: () => ollamaStore.settings.cleanupDays,
      set: (value) => ollamaStore.updateSettings({ cleanupDays: value })
    })
  },
  server: {
    autoReconnect: computed({
      get: () => ollamaStore.settings.autoReconnect,
      set: (value) => ollamaStore.updateSettings({ autoReconnect: value })
    }),
    healthCheck: computed({
      get: () => ollamaStore.settings.healthCheck,
      set: (value) => ollamaStore.updateSettings({ healthCheck: value })
    })
  },
  appearance: {
    theme: computed({
      get: () => ollamaStore.settings.appearance?.theme || 'light',
      set: (value) => {
        ollamaStore.updateSettings({
          appearance: {
            ...ollamaStore.settings.appearance,
            theme: value
          }
        })
      }
    })
  }
})


// 测试服务器连接
async function testConnection() {
  try {
    isTesting.value = true
    connectionTestResult.value = null
    
    // 直接使用 store 的连接检查方法
    await ollamaStore.checkConnection()
    
    if (ollamaStore.isConnected) {
      connectionTestResult.value = {
        status: 'success',
        message: '连接成功！服务器运行正常'
      }
    } else {
      connectionTestResult.value = {
        status: 'error',
        message: ollamaStore.lastConnectionError || '连接失败'
      }
    }
  } catch (error: any) {
    connectionTestResult.value = {
      status: 'error',
      message: `连接失败：${error.message}`
    }
  } finally {
    isTesting.value = false
  }
}



// 组件挂载时的初始化
onMounted(() => {
  // 主题设置已经通过 store 自动加载，无需额外操作
})

</script>

<style scoped>
.settings-view {
  flex: 1;
  padding: var(--spacing-6);
  height: 100vh;
  overflow-y: auto;
  background: var(--gray-50);
}

/* 页面头部 */
.page-header {
  margin-bottom: var(--spacing-8);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-6);
}

.header-info {
  flex: 1;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--primary-black);
  margin-bottom: var(--spacing-2);
}

.page-description {
  color: var(--gray-500);
  font-size: 16px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

/* 自动保存指示器 */
.auto-save-indicator {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.2);
  border-radius: var(--radius-medium);
}

.indicator-text {
  font-size: 12px;
  color: rgba(34, 197, 94, 0.8);
  font-weight: 500;
}

.indicator-dot {
  width: 8px;
  height: 8px;
  background: rgba(34, 197, 94, 0.8);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* 设置容器 */
.settings-container {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: var(--spacing-8);
  align-items: start;
}

/* 设置侧边栏 */
.settings-sidebar {
  background: var(--primary-white);
  border: 1px solid var(--gray-100);
  border-radius: var(--radius-large);
  overflow: hidden;
}

.settings-nav {
  padding: var(--spacing-2);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  width: 100%;
  padding: var(--spacing-3) var(--spacing-4);
  border: none;
  background: transparent;
  border-radius: var(--radius-medium);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  text-align: left;
}

.nav-item:hover {
  background: var(--gray-50);
}

.nav-item.active {
  background: var(--primary-black);
  color: var(--primary-white);
}

.nav-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.nav-label {
  font-size: 14px;
  font-weight: 500;
}

/* 设置内容 */
.settings-content {
  background: var(--primary-white);
  border: 1px solid var(--gray-100);
  border-radius: var(--radius-large);
  padding: var(--spacing-8);
}

.settings-section {
  max-width: 800px;
}

.section-header {
  margin-bottom: var(--spacing-8);
  padding-bottom: var(--spacing-4);
  border-bottom: 1px solid var(--gray-100);
}

.section-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--primary-black);
  margin-bottom: var(--spacing-2);
}

.section-description {
  color: var(--gray-500);
  font-size: 16px;
}

.settings-group {
  margin-bottom: var(--spacing-8);
}

.settings-group:last-child {
  margin-bottom: 0;
}

.setting-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-6);
  padding: var(--spacing-6) 0;
  border-bottom: 1px solid var(--gray-50);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-info {
  flex: 1;
}

.setting-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--primary-black);
  margin-bottom: var(--spacing-1);
}

.setting-description {
  font-size: 14px;
  color: var(--gray-500);
}

.setting-control {
  min-width: 200px;
}

.input-small {
  max-width: 120px;
}

/* 切换开关 */
.toggle {
  display: inline-block;
  position: relative;
  width: 48px;
  height: 24px;
  cursor: pointer;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--gray-300);
  border-radius: 24px;
  transition: all var(--duration-normal) var(--ease-out);
}

.toggle-slider::before {
  position: absolute;
  content: '';
  height: 20px;
  width: 20px;
  left: 2px;
  bottom: 2px;
  background: var(--primary-white);
  border-radius: 50%;
  transition: all var(--duration-normal) var(--ease-out);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.toggle input:checked + .toggle-slider {
  background: var(--primary-black);
}

.toggle input:checked + .toggle-slider::before {
  transform: translateX(24px);
}

/* 测试连接 */
.setting-test {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  padding: var(--spacing-4);
  background: var(--gray-25);
  border-radius: var(--radius-medium);
}

.test-result {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: 14px;
  font-weight: 500;
}

.test-result.success {
  color: var(--success-green);
}

.test-result.error {
  color: var(--error-red);
}

.result-icon {
  width: 16px;
  height: 16px;
}

/* 危险区域 */
.danger-zone {
  padding: var(--spacing-6);
  background: color-mix(in srgb, var(--error-red) 5%, transparent);
  border: 1px solid color-mix(in srgb, var(--error-red) 20%, transparent);
  border-radius: var(--radius-medium);
}

.danger-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--error-red);
  margin-bottom: var(--spacing-4);
}

.danger-actions {
  display: flex;
  gap: var(--spacing-3);
  flex-wrap: wrap;
}

/* 模态框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--primary-white);
  border-radius: var(--radius-large);
  box-shadow: var(--shadow-xlarge);
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-4) var(--spacing-6);
  border-bottom: 1px solid var(--gray-100);
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--primary-black);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-6);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-3);
  padding: var(--spacing-4) var(--spacing-6);
  border-top: 1px solid var(--gray-100);
}

.form-group {
  margin-bottom: var(--spacing-4);
}

.form-label {
  display: block;
  margin-bottom: var(--spacing-2);
  font-weight: 500;
  color: var(--primary-black);
}

.form-help {
  margin-top: var(--spacing-1);
  font-size: 12px;
  color: var(--gray-500);
}

/* 工具类 */
.text-danger {
  color: var(--error-red) !important;
}

</style>