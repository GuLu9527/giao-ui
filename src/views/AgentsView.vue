<template>
  <div class="agents-view">
    <!-- 页面头部 -->
    <header class="page-header">
      <div class="header-content">
        <div class="header-info">
          <h1 class="page-title">智能体管理</h1>
          <p class="page-description">管理和配置AI智能体角色</p>
        </div>
        
        <div class="header-actions">
          <button 
            class="btn btn-primary"
            @click="openCreateDialog"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            新建智能体
          </button>
        </div>
      </div>
    </header>

    <!-- 统计信息 -->
    <div class="stats-section">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="m22 21-3-3"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-number">{{ agentStore.agentStats.totalCount }}</span>
            <span class="stat-label">总智能体</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon active">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-number">{{ agentStore.agentStats.activeCount }}</span>
            <span class="stat-label">活跃智能体</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon builtin">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="m2 17 10 5 10-5"/>
              <path d="m2 12 10 5 10-5"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-number">{{ agentStore.agentStats.builtinCount }}</span>
            <span class="stat-label">内置智能体</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon custom">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-number">{{ agentStore.agentStats.customCount }}</span>
            <span class="stat-label">自定义智能体</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 筛选和搜索 -->
    <div class="filters-section">
      <div class="filters-content">
        <div class="search-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="搜索智能体..."
            class="search-input"
          />
        </div>
        
        <div class="filter-tabs">
          <button
            v-for="tab in filterTabs"
            :key="tab.key"
            :class="['filter-tab', { active: activeFilter === tab.key }]"
            @click="activeFilter = tab.key"
          >
            {{ tab.label }}
            <span class="tab-count">{{ tab.count }}</span>
          </button>
        </div>
        
        <div class="sort-dropdown">
          <select v-model="sortBy" class="sort-select">
            <option value="name">按名称排序</option>
            <option value="category">按分类排序</option>
            <option value="createdAt">按创建时间排序</option>
            <option value="updatedAt">按更新时间排序</option>
          </select>
        </div>
      </div>
    </div>

    <!-- 智能体列表 -->
    <div class="agents-section">
      <div v-if="agentStore.loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>加载智能体中...</p>
      </div>
      
      <div v-else-if="agentStore.error" class="error-state">
        <div class="error-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h3>加载失败</h3>
        <p>{{ agentStore.error }}</p>
        <button class="btn btn-primary" @click="agentStore.loadAgents()">
          重新加载
        </button>
      </div>
      
      <div v-else-if="filteredAgents.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
        </div>
        <h3>未找到智能体</h3>
        <p>尝试调整搜索条件或创建新的智能体</p>
        <button 
          class="btn btn-primary"
          @click="openCreateDialog"
        >
          创建智能体
        </button>
      </div>
      
      <div v-else class="agents-grid">
        <div
          v-for="agent in filteredAgents"
          :key="agent.id"
          class="agent-card"
          :class="{ 
            active: agent.id === agentStore.currentAgent?.id,
            disabled: !agent.isActive
          }"
        >
          <div class="agent-header">
            <div class="agent-avatar">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            
            <div class="agent-info">
              <h3 class="agent-name">{{ agent.name }}</h3>
              <span class="agent-category">{{ agent.category }}</span>
            </div>
            
            <div class="agent-badges">
              <span v-if="agent.isBuiltin" class="badge builtin">内置</span>
              <span v-if="!agent.isActive" class="badge inactive">已停用</span>
              <span v-if="agent.id === agentStore.currentAgent?.id" class="badge current">当前</span>
            </div>
          </div>
          
          <div class="agent-description">
            {{ agent.description }}
          </div>
          
          <div class="agent-tags">
            <span
              v-for="tag in agent.tags.slice(0, 3)"
              :key="tag"
              class="tag"
            >
              {{ tag }}
            </span>
            <span v-if="agent.tags.length > 3" class="tag more">
              +{{ agent.tags.length - 3 }}
            </span>
          </div>
          
          <div class="agent-config">
            <div class="config-item">
              <span class="config-label">温度</span>
              <span class="config-value">{{ agent.config.temperature }}</span>
            </div>
            <div class="config-item">
              <span class="config-label">Token</span>
              <span class="config-value">{{ agent.config.maxTokens }}</span>
            </div>
            <div class="config-item">
              <span class="config-label">Top-P</span>
              <span class="config-value">{{ agent.config.topP }}</span>
            </div>
          </div>
          
          <div class="agent-actions">
            <button
              v-if="agent.id !== agentStore.currentAgent?.id"
              class="action-btn primary"
              @click="selectAgent(agent)"
              :disabled="!agent.isActive"
            >
              选择
            </button>
            
            <button
              class="action-btn"
              @click="editAgent(agent)"
              :disabled="agent.isBuiltin"
            >
              编辑
            </button>
            
            <button
              class="action-btn"
              @click="duplicateAgent(agent)"
            >
              复制
            </button>
            
            <button
              v-if="!agent.isBuiltin"
              class="action-btn danger"
              @click="deleteAgent(agent)"
            >
              删除
            </button>
            
            <button
              class="action-btn"
              @click="toggleAgentActive(agent)"
              :disabled="agent.isBuiltin"
            >
              {{ agent.isActive ? '停用' : '启用' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建/编辑对话框 -->
    <AgentFormDialog
      :visible="showCreateDialog || showEditDialog"
      :agent="editingAgent"
      :loading="isLoading"
      @close="closeDialog"
      @save="handleSave"
    />

    <!-- 通知提示 -->
    <div 
      v-if="notification.show" 
      class="notification"
      :class="[`notification-${notification.type}`]"
    >
      <div class="notification-content">
        <div class="notification-icon">
          <svg v-if="notification.type === 'success'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20,6 9,17 4,12"/>
          </svg>
          <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>
        <span class="notification-message">{{ notification.message }}</span>
        <button class="notification-close" @click="notification.show = false">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAgentStore } from '@/stores/agent'
import AgentFormDialog from '@/components/AgentFormDialog.vue'
import type { Agent, AgentFilter, AgentSort } from '@/types/agent'

const agentStore = useAgentStore()

// 响应式状态
const searchKeyword = ref('')
const activeFilter = ref<'all' | 'active' | 'builtin' | 'custom'>('all')
const sortBy = ref<'name' | 'category' | 'createdAt' | 'updatedAt'>('name')
const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const editingAgent = ref<Agent | null>(null)
const notification = ref<{ show: boolean; type: 'success' | 'error'; message: string }>({ 
  show: false, 
  type: 'success', 
  message: '' 
})
const isLoading = ref(false)

// 计算属性
const filterTabs = computed(() => [
  {
    key: 'all' as const,
    label: '全部',
    count: agentStore.agentStats.totalCount
  },
  {
    key: 'active' as const,
    label: '启用',
    count: agentStore.agentStats.activeCount
  },
  {
    key: 'builtin' as const,
    label: '内置',
    count: agentStore.agentStats.builtinCount
  },
  {
    key: 'custom' as const,
    label: '自定义',
    count: agentStore.agentStats.customCount
  }
])

const filteredAgents = computed(() => {
  const filter: AgentFilter = {
    keyword: searchKeyword.value
  }

  switch (activeFilter.value) {
    case 'active':
      filter.isActive = true
      break
    case 'builtin':
      filter.isBuiltin = true
      break
    case 'custom':
      filter.isBuiltin = false
      break
  }

  const sort: AgentSort = {
    by: sortBy.value,
    order: 'asc'
  }

  return agentStore.getFilteredAgents(filter, sort)
})

// 方法
const showNotification = (type: 'success' | 'error', message: string) => {
  notification.value = { show: true, type, message }
  setTimeout(() => {
    notification.value.show = false
  }, 3000)
}

const selectAgent = (agent: Agent) => {
  agentStore.setCurrentAgent(agent)
}

const openCreateDialog = () => {
  console.log('点击新增按钮')
  editingAgent.value = null
  showCreateDialog.value = true
  console.log('showCreateDialog:', showCreateDialog.value)
}

const editAgent = (agent: Agent) => {
  if (agent.isBuiltin) return
  console.log('点击编辑按钮', agent.name)
  editingAgent.value = agent
  showEditDialog.value = true
  console.log('showEditDialog:', showEditDialog.value)
}

const duplicateAgent = async (agent: Agent) => {
  try {
    const result = await agentStore.duplicateAgent(agent.id)
    if (result.success) {
      showNotification('success', `智能体"${agent.name}"复制成功！`)
    } else {
      showNotification('error', result.message)
    }
  } catch (error) {
    showNotification('error', '复制失败，请稍后重试')
  }
}

const deleteAgent = async (agent: Agent) => {
  if (agent.isBuiltin) return
  
  if (confirm(`确定要删除智能体"${agent.name}"吗？此操作不可恢复。`)) {
    try {
      const result = await agentStore.deleteAgent(agent.id)
      if (result.success) {
        showNotification('success', `智能体"${agent.name}"删除成功！`)
      } else {
        showNotification('error', result.message)
      }
    } catch (error) {
      showNotification('error', '删除失败，请稍后重试')
    }
  }
}

const toggleAgentActive = async (agent: Agent) => {
  if (agent.isBuiltin) return
  
  try {
    const result = await agentStore.toggleAgentActive(agent.id)
    if (result.success) {
      const status = agent.isActive ? '停用' : '启用'
      showNotification('success', `智能体"${agent.name}"${status}成功！`)
    } else {
      showNotification('error', result.message)
    }
  } catch (error) {
    showNotification('error', '操作失败，请稍后重试')
  }
}

const closeDialog = () => {
  showCreateDialog.value = false
  showEditDialog.value = false
  editingAgent.value = null
}

const handleSave = async (formData: any) => {
  try {
    isLoading.value = true
    let result
    
    if (editingAgent.value) {
      result = await agentStore.updateAgent(editingAgent.value.id, formData)
    } else {
      result = await agentStore.createAgent(formData)
    }
    
    if (result.success) {
      showNotification('success', editingAgent.value ? '智能体更新成功！' : '智能体创建成功！')
      closeDialog()
    } else {
      showNotification('error', result.message)
    }
  } catch (error) {
    showNotification('error', '操作失败，请稍后重试')
  } finally {
    isLoading.value = false
  }
}

// 生命周期
onMounted(() => {
  if (agentStore.agents.length === 0) {
    agentStore.initialize()
  }
})
</script>

<style scoped>
.agents-view {
  min-height: 100vh;
  background: var(--primary-white);
  padding: var(--spacing-6);
}

/* 页面头部 */
.page-header {
  margin-bottom: var(--spacing-8);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-info h1 {
  font-size: 28px;
  font-weight: 700;
  color: var(--primary-black);
  margin: 0 0 var(--spacing-2) 0;
}

.header-info p {
  font-size: 16px;
  color: var(--gray-600);
  margin: 0;
}

.header-actions .btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

/* 统计信息 */
.stats-section {
  margin-bottom: var(--spacing-8);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-4);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  padding: var(--spacing-5);
  background: var(--primary-white);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-medium);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.stat-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gray-100);
  border-radius: var(--radius-medium);
  color: var(--gray-600);
}

.stat-icon.active {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.stat-icon.builtin {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.stat-icon.custom {
  background: rgba(147, 51, 234, 0.1);
  color: #9333ea;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-number {
  font-size: 24px;
  font-weight: 700;
  color: var(--primary-black);
}

.stat-label {
  font-size: 14px;
  color: var(--gray-600);
}

/* 筛选区域 */
.filters-section {
  margin-bottom: var(--spacing-6);
}

.filters-content {
  display: flex;
  gap: var(--spacing-4);
  align-items: center;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 300px;
}

.search-box svg {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--gray-400);
}

.search-input {
  width: 100%;
  padding: 10px 12px 10px 40px;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-small);
  background: var(--primary-white);
  font-size: 14px;
}

.search-input:focus {
  outline: none;
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.1);
}

.filter-tabs {
  display: flex;
  gap: var(--spacing-1);
  background: var(--gray-100);
  border-radius: var(--radius-small);
  padding: var(--spacing-1);
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: 6px 12px;
  border: none;
  background: transparent;
  color: var(--gray-600);
  font-size: 13px;
  border-radius: var(--radius-small);
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-tab:hover {
  background: var(--gray-200);
  color: var(--primary-black);
}

.filter-tab.active {
  background: var(--primary-white);
  color: var(--primary-black);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.tab-count {
  font-size: 11px;
  background: var(--gray-300);
  color: var(--gray-700);
  padding: 1px 6px;
  border-radius: 10px;
}

.filter-tab.active .tab-count {
  background: var(--accent-blue);
  color: white;
}

.sort-select {
  padding: 8px 12px;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-small);
  background: var(--primary-white);
  font-size: 14px;
  cursor: pointer;
}

/* 状态显示 */
.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-12);
  text-align: center;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--gray-200);
  border-top: 3px solid var(--accent-blue);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: var(--spacing-4);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-icon,
.empty-icon {
  color: var(--gray-400);
  margin-bottom: var(--spacing-4);
}

/* 智能体网格 */
.agents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: var(--spacing-5);
}

.agent-card {
  background: var(--primary-white);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-large);
  padding: var(--spacing-5);
  transition: all 0.2s ease;
  position: relative;
}

.agent-card:hover {
  border-color: var(--gray-300);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.agent-card.active {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 1px var(--accent-blue);
}

.agent-card.disabled {
  opacity: 0.6;
}

.agent-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-4);
}

.agent-avatar {
  width: 48px;
  height: 48px;
  background: var(--gray-100);
  border-radius: var(--radius-medium);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--gray-600);
  flex-shrink: 0;
}

.agent-info {
  flex: 1;
  min-width: 0;
}

.agent-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--primary-black);
  margin: 0 0 2px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.agent-category {
  font-size: 12px;
  color: var(--gray-500);
}

.agent-badges {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-end;
}

.badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 500;
  white-space: nowrap;
}

.badge.builtin {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.badge.inactive {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.badge.current {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.agent-description {
  font-size: 14px;
  color: var(--gray-600);
  line-height: 1.5;
  margin-bottom: var(--spacing-4);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.agent-tags {
  display: flex;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-4);
  flex-wrap: wrap;
}

.tag {
  font-size: 11px;
  padding: 2px 6px;
  background: var(--gray-100);
  color: var(--gray-600);
  border-radius: 4px;
  white-space: nowrap;
}

.tag.more {
  background: var(--gray-200);
  color: var(--gray-700);
}

.agent-config {
  display: flex;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-4);
  font-size: 12px;
}

.config-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.config-label {
  color: var(--gray-500);
  margin-bottom: 2px;
}

.config-value {
  color: var(--primary-black);
  font-weight: 500;
}

.agent-actions {
  display: flex;
  gap: var(--spacing-2);
  flex-wrap: wrap;
}

.action-btn {
  flex: 1;
  padding: 6px 12px;
  border: 1px solid var(--gray-200);
  background: var(--primary-white);
  color: var(--primary-black);
  border-radius: var(--radius-small);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 60px;
}

.action-btn:hover {
  background: var(--gray-50);
  border-color: var(--gray-300);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.primary {
  background: var(--accent-blue);
  color: white;
  border-color: var(--accent-blue);
}

.action-btn.primary:hover:not(:disabled) {
  background: #0056b3;
}

.action-btn.danger {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.3);
}

.action-btn.danger:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.2);
}

/* 通知组件样式 */
.notification {
  position: fixed;
  top: var(--spacing-6);
  right: var(--spacing-6);
  z-index: 2000;
  border-radius: var(--radius-medium);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  animation: slideInRight 0.3s ease-out;
  max-width: 400px;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.notification-success {
  background: white;
  border-left: 4px solid #22c55e;
}

.notification-error {
  background: white;
  border-left: 4px solid #ef4444;
}

.notification-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
}

.notification-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.notification-success .notification-icon {
  color: #22c55e;
}

.notification-error .notification-icon {
  color: #ef4444;
}

.notification-message {
  flex: 1;
  font-size: 14px;
  color: var(--primary-black);
  line-height: 1.4;
}

.notification-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--gray-500);
  cursor: pointer;
  border-radius: var(--radius-small);
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.notification-close:hover {
  background: var(--gray-100);
  color: var(--primary-black);
}
</style>