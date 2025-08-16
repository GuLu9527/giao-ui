<template>
  <div class="dashboard-view">
    <!-- 页面头部 -->
    <header class="page-header">
      <div class="header-content">
        <div class="header-info">
          <h1 class="page-title">系统状态</h1>
          <p class="page-description">Ollama API连接状态和基础信息</p>
        </div>
        
        <div class="header-actions">
          <button 
            @click="refreshData"
            class="btn btn-secondary"
            :disabled="isLoading"
          >
            <div v-if="isLoading" class="animate-spin">
              <IconLoader class="btn-icon" />
            </div>
            <template v-else>刷新</template>
          </button>
        </div>
      </div>
    </header>

    <!-- API状态信息 -->
    <div class="api-status">
      <div class="status-card">
        <div class="status-icon">
          <IconStatus />
        </div>
        <div class="status-content">
          <div class="status-value" :class="{ 'text-success': isConnected, 'text-error': !isConnected }">
            {{ isConnected ? '已连接' : '连接失败' }}
          </div>
          <div class="status-label">Ollama API状态</div>
        </div>
      </div>

      <div class="status-card">
        <div class="status-icon">
          <IconModel />
        </div>
        <div class="status-content">
          <div class="status-value">{{ localModels.length }}</div>
          <div class="status-label">本地模型数量</div>
        </div>
      </div>

      <div class="status-card">
        <div class="status-icon">
          <IconServer />
        </div>
        <div class="status-content">
          <div class="status-value">{{ runningModels.length }}</div>
          <div class="status-label">运行中模型</div>
        </div>
      </div>

      <div class="status-card">
        <div class="status-icon">
          <IconInfo />
        </div>
        <div class="status-content">
          <div class="status-value">{{ version || '--' }}</div>
          <div class="status-label">Ollama版本</div>
        </div>
      </div>
    </div>


  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useOllamaStore } from '@/stores/ollama'
import { ollamaService } from '@/services/ollama'

// 图标组件
import IconLoader from '@/components/icons/IconLoader.vue'
import IconStatus from '@/components/icons/IconStatus.vue'
import IconModel from '@/components/icons/IconModel.vue'
import IconServer from '@/components/icons/IconServer.vue'
import IconInfo from '@/components/icons/IconInfo.vue'

const ollamaStore = useOllamaStore()

// 响应式状态
const isLoading = ref(false)
const version = ref('')

// 计算属性
const isConnected = computed(() => ollamaStore.isConnected)
const localModels = computed(() => ollamaStore.availableModels)
const runningModels = computed(() => ollamaStore.runningModels)

// 获取API状态数据
async function getApiStatus() {
  try {
    // 检查连接状态
    await ollamaStore.checkConnection()
    
    if (ollamaStore.isConnected) {
      // 获取版本信息
      const versionInfo = await ollamaService.getVersion()
      version.value = versionInfo.version
      
      // 获取模型数据
      await ollamaStore.fetchModels()
      await ollamaStore.fetchRunningModels()
    }
  } catch (error) {
    console.error('Failed to get API status:', error)
  }
}


// 刷新数据
async function refreshData() {
  try {
    isLoading.value = true
    await getApiStatus()
  } catch (error) {
    console.error('Failed to refresh data:', error)
  } finally {
    isLoading.value = false
  }
}

// 组件生命周期
onMounted(async () => {
  await getApiStatus()
})
</script>

<style scoped>
.dashboard-view {
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

/* API状态信息 */
.api-status {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-4);
}

.status-card {
  background: var(--primary-white);
  border: 1px solid var(--gray-100);
  border-radius: var(--radius-large);
  padding: var(--spacing-6);
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
}

.status-icon {
  width: 48px;
  height: 48px;
  background: var(--gray-50);
  border-radius: var(--radius-medium);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--gray-500);
}

.status-content {
  flex: 1;
}

.status-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--primary-black);
  margin-bottom: var(--spacing-1);
}

.status-label {
  font-size: 14px;
  color: var(--gray-500);
}

/* 工具类 */
.text-success {
  color: var(--success-green) !important;
}

.text-error {
  color: var(--error-red) !important;
}

</style>