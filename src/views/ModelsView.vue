<template>
  <div class="models-view">
    <!-- 页面头部 -->
    <header class="page-header">
      <div class="header-content">
        <div class="header-info">
          <h1 class="page-title">模型管理</h1>
          <p class="page-description">管理您的AI模型库</p>
        </div>
        
        <div class="header-actions">
          <div class="search-box">
            <IconSearch class="search-icon" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索模型..."
              class="search-input"
            />
          </div>
          
          <button 
            @click="showPullDialog = true"
            class="btn btn-primary"
            :disabled="isLoading"
          >
            <IconDownload class="btn-icon" />
            下载模型
          </button>
          
          <button 
            @click="refreshModels"
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

    <!-- 模型统计 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">
          <IconModel />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ localModels.length }}</div>
          <div class="stat-label">本地模型</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon running">
          <IconPlay />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ runningModels.length }}</div>
          <div class="stat-label">运行中</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon storage">
          <IconDownload />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ totalSize }}</div>
          <div class="stat-label">总大小</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" :class="{ connected: connectionStatus === '已连接' }">
          <IconNetwork />
        </div>
        <div class="stat-content">
          <div class="stat-value" :class="{ 'text-success': connectionStatus === '已连接', 'text-error': connectionStatus !== '已连接' }">{{ connectionStatus }}</div>
          <div class="stat-label">连接状态</div>
        </div>
      </div>
    </div>

    <!-- 模型列表 -->
    <div class="models-section">
      <div class="section-header">
        <h2 class="section-title">本地模型</h2>
        <div class="view-controls">
          <button 
            @click="viewMode = 'grid'"
            class="view-btn"
            :class="{ active: viewMode === 'grid' }"
          >
            网格视图
          </button>
          <button 
            @click="viewMode = 'list'"
            class="view-btn"
            :class="{ active: viewMode === 'list' }"
          >
            列表视图
          </button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredModels.length === 0 && !isLoading" class="empty-state">
        <IconModel class="empty-icon" />
        <h3 class="empty-title">
          {{ searchQuery ? '未找到匹配的模型' : '暂无模型' }}
        </h3>
        <p class="empty-description">
          {{ searchQuery ? '尝试调整搜索条件' : '点击"下载模型"按钮开始添加AI模型' }}
        </p>
      </div>

      <!-- 模型网格视图 -->
      <div v-else-if="viewMode === 'grid'" class="models-grid">
        <div 
          v-for="model in filteredModels" 
          :key="model.name"
          class="model-card"
        >
          <div class="model-header">
            <div class="model-info">
              <h3 class="model-name">{{ model.name }}</h3>
              <div class="model-details">
                <span class="model-size">{{ formatModelSize(model.size) }}</span>
                <span class="model-family">{{ model.details.family || 'Unknown' }}</span>
              </div>
            </div>
            
            <div class="model-status">
              <div 
                class="status-indicator"
                :class="{ active: isModelRunning(model.name) }"
              ></div>
            </div>
          </div>

          <div class="model-body">
            <div class="model-meta">
              <div class="meta-item">
                <span class="meta-label">参数规模:</span>
                <span class="meta-value">{{ model.details.parameter_size || 'N/A' }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">量化级别:</span>
                <span class="meta-value">{{ model.details.quantization_level || 'N/A' }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">格式:</span>
                <span class="meta-value">{{ model.details.format || 'N/A' }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">修改时间:</span>
                <span class="meta-value">{{ formatDate(model.modified_at) }}</span>
              </div>
            </div>
          </div>

          <div class="model-actions">
            <button 
              v-if="isModelRunning(model.name)"
              @click="unloadModel(model.name)"
              class="btn btn-secondary btn-small"
              :disabled="isLoading"
            >
              <IconStop class="btn-icon" />
              停止
            </button>
            <button 
              v-else
              @click="loadModel(model.name)"
              class="btn btn-primary btn-small"
              :disabled="isLoading"
            >
              <IconPlay class="btn-icon" />
              启动
            </button>
            
            <button 
              @click="showModelInfo(model)"
              class="btn btn-ghost btn-small"
            >
              <IconInfo class="btn-icon" />
              详情
            </button>
            
            <button 
              @click="copyModel(model.name)"
              class="btn btn-ghost btn-small"
              :disabled="isLoading"
            >
              <IconCopy class="btn-icon" />
              复制
            </button>
            
            <button 
              @click="deleteModel(model.name)"
              class="btn btn-ghost btn-small text-danger"
              :disabled="isLoading"
            >
              <IconTrash class="btn-icon" />
              删除
            </button>
          </div>
        </div>
      </div>

      <!-- 模型列表视图 -->
      <div v-else class="models-table">
        <table class="table">
          <thead>
            <tr>
              <th>名称</th>
              <th>状态</th>
              <th>大小</th>
              <th>参数</th>
              <th>格式</th>
              <th>修改时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="model in filteredModels" :key="model.name">
              <td>
                <div class="model-name-cell">
                  <strong>{{ model.name }}</strong>
                  <div class="model-family">{{ model.details.family || 'Unknown' }}</div>
                </div>
              </td>
              <td>
                <div class="status-cell">
                  <div 
                    class="status-indicator"
                    :class="{ active: isModelRunning(model.name) }"
                  ></div>
                  <span>{{ isModelRunning(model.name) ? '运行中' : '已停止' }}</span>
                </div>
              </td>
              <td>{{ formatModelSize(model.size) }}</td>
              <td>{{ model.details.parameter_size || 'N/A' }}</td>
              <td>{{ model.details.format || 'N/A' }}</td>
              <td>{{ formatDate(model.modified_at) }}</td>
              <td>
                <div class="table-actions">
                  <button 
                    v-if="isModelRunning(model.name)"
                    @click="unloadModel(model.name)"
                    class="btn btn-icon"
                    :disabled="isLoading"
                  >
                    <IconStop />
                  </button>
                  <button 
                    v-else
                    @click="loadModel(model.name)"
                    class="btn btn-icon"
                    :disabled="isLoading"
                  >
                    <IconPlay />
                  </button>
                  
                  <button 
                    @click="showModelInfo(model)"
                    class="btn btn-icon"
                  >
                    <IconInfo />
                  </button>
                  
                  <button 
                    @click="deleteModel(model.name)"
                    class="btn btn-icon text-danger"
                    :disabled="isLoading"
                  >
                    <IconTrash />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 下载模型对话框 -->
    <div v-if="showPullDialog" class="modal-overlay" @click="showPullDialog = false">
      <div class="modal" @click.stop>
        <header class="modal-header">
          <h3>下载模型</h3>
          <button @click="showPullDialog = false" class="btn btn-ghost btn-icon">
            <IconClose />
          </button>
        </header>
        
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">模型名称</label>
            <input
              v-model="pullModelName"
              type="text"
              placeholder="例如: llama3.2, qwen:7b"
              class="input"
            />
            <p class="form-help">
              输入完整的模型名称，支持标签版本，例如 llama3.2:latest
            </p>
          </div>
        </div>
        
        <footer class="modal-footer">
          <button @click="showPullDialog = false" class="btn btn-secondary">
            取消
          </button>
          <button 
            @click="handlePullModel"
            class="btn btn-primary"
            :disabled="!pullModelName.trim() || isPulling"
          >
            <div v-if="isPulling" class="animate-spin">
              <IconLoader class="btn-icon" />
            </div>
            <template v-else>下载</template>
          </button>
        </footer>
      </div>
    </div>

    <!-- 模型详情对话框 -->
    <div v-if="showInfoDialog" class="modal-overlay" @click="showInfoDialog = false">
      <div class="modal modal-large" @click.stop>
        <header class="modal-header">
          <h3>模型详情</h3>
          <button @click="showInfoDialog = false" class="btn btn-ghost btn-icon">
            <IconClose />
          </button>
        </header>
        
        <div class="modal-body">
          <div v-if="selectedModelInfo" class="model-info">
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">名称</span>
                <span class="info-value">{{ selectedModel?.name }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">大小</span>
                <span class="info-value">{{ formatModelSize(selectedModel?.size || 0) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">参数规模</span>
                <span class="info-value">{{ selectedModel?.details.parameter_size || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">模型家族</span>
                <span class="info-value">{{ selectedModel?.details.family || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">格式</span>
                <span class="info-value">{{ selectedModel?.details.format || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">量化级别</span>
                <span class="info-value">{{ selectedModel?.details.quantization_level || 'N/A' }}</span>
              </div>
            </div>
            
            <div class="model-capabilities" v-if="selectedModelInfo.capabilities">
              <h4>支持的功能</h4>
              <div class="capabilities-list">
                <span 
                  v-for="capability in selectedModelInfo.capabilities" 
                  :key="capability"
                  class="capability-tag"
                >
                  {{ capability }}
                </span>
              </div>
            </div>
            
            <div class="model-template" v-if="selectedModelInfo.template">
              <h4>提示词模板</h4>
              <pre class="template-code">{{ selectedModelInfo.template }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useOllamaStore } from '@/stores/ollama'
import { ollamaService } from '@/services/ollama'
import type { OllamaModel, OllamaModelInfo } from '@/types/ollama'

import IconModel from '@/components/icons/IconModel.vue'
import IconDownload from '@/components/icons/IconDownload.vue'
import IconLoader from '@/components/icons/IconLoader.vue'
import IconSearch from '@/components/icons/IconSearch.vue'
import IconPlay from '@/components/icons/IconPlay.vue'
import IconStop from '@/components/icons/IconStop.vue'
import IconInfo from '@/components/icons/IconInfo.vue'
import IconCopy from '@/components/icons/IconCopy.vue'
import IconTrash from '@/components/icons/IconTrash.vue'
import IconNetwork from '@/components/icons/IconNetwork.vue'
import IconClose from '@/components/icons/IconClose.vue'

const ollamaStore = useOllamaStore()

// 响应式状态
const searchQuery = ref('')
const viewMode = ref<'grid' | 'list'>('grid')
const isLoading = ref(false)
const isPulling = ref(false)
const showPullDialog = ref(false)
const showInfoDialog = ref(false)
const pullModelName = ref('')
const selectedModel = ref<OllamaModel | null>(null)
const selectedModelInfo = ref<OllamaModelInfo | null>(null)

// 计算属性
const localModels = computed(() => ollamaStore.availableModels)
const runningModels = computed(() => ollamaStore.runningModels)
const isConnected = computed(() => ollamaStore.isConnected)

const filteredModels = computed(() => {
  if (!searchQuery.value.trim()) {
    return localModels.value
  }
  
  const query = searchQuery.value.toLowerCase()
  return localModels.value.filter(model => 
    model.name.toLowerCase().includes(query) ||
    model.details.family?.toLowerCase().includes(query)
  )
})

const totalSize = computed(() => {
  const total = localModels.value.reduce((sum, model) => sum + model.size, 0)
  return formatModelSize(total)
})

const connectionStatus = computed(() => {
  return isConnected.value ? '已连接' : '未连接'
})

// 方法
function isModelRunning(modelName: string): boolean {
  return runningModels.value.some(model => model.name === modelName)
}

function formatModelSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

async function refreshModels() {
  try {
    isLoading.value = true
    await ollamaStore.fetchModels()
    await ollamaStore.fetchRunningModels()
  } catch (error) {
    console.error('Failed to refresh models:', error)
    // TODO: 显示错误提示
  } finally {
    isLoading.value = false
  }
}

async function loadModel(modelName: string) {
  try {
    isLoading.value = true
    await ollamaStore.loadModel(modelName)
    // TODO: 显示成功提示
  } catch (error) {
    console.error('Failed to load model:', error)
    // TODO: 显示错误提示
  } finally {
    isLoading.value = false
  }
}

async function unloadModel(modelName: string) {
  try {
    isLoading.value = true
    await ollamaStore.unloadModel(modelName)
    // TODO: 显示成功提示
  } catch (error) {
    console.error('Failed to unload model:', error)
    // TODO: 显示错误提示
  } finally {
    isLoading.value = false
  }
}

async function handlePullModel() {
  if (!pullModelName.value.trim()) return
  
  try {
    isPulling.value = true
    await ollamaStore.pullModel(pullModelName.value.trim())
    showPullDialog.value = false
    pullModelName.value = ''
    // TODO: 显示成功提示
  } catch (error) {
    console.error('Failed to pull model:', error)
    // TODO: 显示错误提示
  } finally {
    isPulling.value = false
  }
}

async function deleteModel(modelName: string) {
  // TODO: 添加确认对话框
  if (!confirm(`确定要删除模型 "${modelName}" 吗？此操作不可撤销。`)) {
    return
  }
  
  try {
    isLoading.value = true
    await ollamaStore.deleteModel(modelName)
    // TODO: 显示成功提示
  } catch (error) {
    console.error('Failed to delete model:', error)
    // TODO: 显示错误提示
  } finally {
    isLoading.value = false
  }
}

async function copyModel(modelName: string) {
  const newName = prompt(`输入新模型名称:`, `${modelName}-copy`)
  if (!newName || newName === modelName) return
  
  try {
    isLoading.value = true
    await ollamaService.copyModel(modelName, newName)
    await refreshModels()
    // TODO: 显示成功提示
  } catch (error) {
    console.error('Failed to copy model:', error)
    // TODO: 显示错误提示
  } finally {
    isLoading.value = false
  }
}

async function showModelInfo(model: OllamaModel) {
  try {
    selectedModel.value = model
    showInfoDialog.value = true
    
    // 获取详细信息
    const info = await ollamaService.getModelInfo(model.name, true)
    selectedModelInfo.value = info
  } catch (error) {
    console.error('Failed to get model info:', error)
    // TODO: 显示错误提示
  }
}

// 组件挂载时加载数据
onMounted(async () => {
  if (isConnected.value) {
    await refreshModels()
  }
})
</script>

<style scoped>
.models-view {
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

.search-box {
  position: relative;
  min-width: 300px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: var(--gray-400);
  pointer-events: none;
}

.search-input {
  padding-left: 40px;
  min-width: 300px;
}

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-8);
}

.stat-card {
  background: var(--primary-white);
  border: 1px solid var(--gray-100);
  border-radius: var(--radius-large);
  padding: var(--spacing-6);
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  transition: all var(--duration-normal) var(--ease-out);
}

.stat-card:hover {
  box-shadow: var(--shadow-medium);
  border-color: var(--gray-200);
}

.stat-icon {
  width: 48px;
  height: 48px;
  background: var(--gray-50);
  border-radius: var(--radius-medium);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--gray-500);
  flex-shrink: 0;
}

.stat-icon.running {
  background: color-mix(in srgb, var(--success-green) 10%, transparent);
  color: var(--success-green);
}

.stat-icon.storage {
  background: color-mix(in srgb, #007AFF 10%, transparent);
  color: #007AFF;
}

.stat-icon.connected {
  background: color-mix(in srgb, var(--success-green) 10%, transparent);
  color: var(--success-green);
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--primary-black);
  margin-bottom: var(--spacing-1);
}

.stat-label {
  font-size: 14px;
  color: var(--gray-500);
}

/* 模型部分 */
.models-section {
  background: var(--primary-white);
  border: 1px solid var(--gray-100);
  border-radius: var(--radius-large);
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-6);
  border-bottom: 1px solid var(--gray-100);
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--primary-black);
}

.view-controls {
  display: flex;
  gap: var(--spacing-1);
}

.view-btn {
  padding: 6px 12px;
  font-size: 14px;
  border: 1px solid var(--gray-200);
  background: var(--primary-white);
  color: var(--gray-600);
  border-radius: var(--radius-small);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}

.view-btn:hover {
  background: var(--gray-50);
}

.view-btn.active {
  background: var(--primary-black);
  color: var(--primary-white);
  border-color: var(--primary-black);
}

/* 空状态 */
.empty-state {
  padding: var(--spacing-12) var(--spacing-6);
  text-align: center;
  color: var(--gray-500);
}

.empty-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto var(--spacing-4);
  opacity: 0.5;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: var(--spacing-2);
  color: var(--primary-black);
}

.empty-description {
  font-size: 14px;
  max-width: 400px;
  margin: 0 auto;
}

/* 模型网格 */
.models-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: var(--spacing-6);
  padding: var(--spacing-6);
}

.model-card {
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-medium);
  padding: var(--spacing-4);
  transition: all var(--duration-normal) var(--ease-out);
}

.model-card:hover {
  border-color: var(--gray-300);
  box-shadow: var(--shadow-medium);
}

.model-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: var(--spacing-4);
}

.model-info {
  flex: 1;
}

.model-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--primary-black);
  margin-bottom: var(--spacing-1);
}

.model-details {
  display: flex;
  gap: var(--spacing-2);
  font-size: 12px;
  color: var(--gray-500);
}

.model-size,
.model-family {
  padding: 2px 6px;
  background: var(--gray-100);
  border-radius: var(--radius-small);
}

.model-status {
  display: flex;
  align-items: center;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--gray-300);
  transition: all var(--duration-normal) var(--ease-out);
}

.status-indicator.active {
  background: var(--success-green);
}

.model-meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-4);
}

.meta-item {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.meta-label {
  color: var(--gray-500);
}

.meta-value {
  color: var(--primary-black);
  font-weight: 500;
}

.model-actions {
  display: flex;
  gap: var(--spacing-2);
  flex-wrap: wrap;
}

/* 模型表格 */
.models-table {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  padding: var(--spacing-3) var(--spacing-4);
  text-align: left;
  border-bottom: 1px solid var(--gray-100);
}

.table th {
  background: var(--gray-50);
  font-weight: 600;
  color: var(--primary-black);
  font-size: 14px;
}

.table td {
  font-size: 14px;
}

.model-name-cell strong {
  color: var(--primary-black);
}

.model-family {
  font-size: 12px;
  color: var(--gray-500);
}

.status-cell {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.table-actions {
  display: flex;
  gap: var(--spacing-1);
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

.modal-large {
  max-width: 800px;
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

/* 模型详情 */
.model-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-4);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.info-label {
  font-size: 12px;
  color: var(--gray-500);
  text-transform: uppercase;
  font-weight: 600;
}

.info-value {
  font-size: 14px;
  color: var(--primary-black);
  font-weight: 500;
}

.model-capabilities h4,
.model-template h4 {
  margin-bottom: var(--spacing-3);
  font-size: 16px;
  color: var(--primary-black);
}

.capabilities-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

.capability-tag {
  padding: 4px 8px;
  background: var(--gray-100);
  border-radius: var(--radius-small);
  font-size: 12px;
  color: var(--primary-black);
}

.template-code {
  background: var(--gray-50);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-medium);
  padding: var(--spacing-4);
  font-size: 12px;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* 工具类 */
.text-danger {
  color: var(--error-red) !important;
}

/* 工具类 */
.text-error {
  color: var(--error-red) !important;
}
</style>