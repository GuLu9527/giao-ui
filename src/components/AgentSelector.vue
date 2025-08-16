<template>
  <div class="agent-selector">
    <!-- 当前智能体显示 -->
    <div class="current-agent" @click="toggleDropdown">
      <div class="agent-info">
        <div class="agent-avatar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <div class="agent-details">
          <span class="agent-name">{{ currentAgent?.name || '选择智能体' }}</span>
          <span class="agent-category">{{ currentAgent?.category || '智能助手' }}</span>
        </div>
      </div>
      <div class="dropdown-arrow" :class="{ 'rotated': showDropdown }">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4 6l4 4 4-4z"/>
        </svg>
      </div>
    </div>

    <!-- 下拉菜单 -->
    <Transition name="dropdown">
      <div v-if="showDropdown" class="dropdown-menu">
        <div class="dropdown-header">
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="搜索智能体..."
            class="search-input"
            @click.stop
          />
          <div class="filter-tabs">
            <button
              v-for="tab in filterTabs"
              :key="tab.key"
              :class="['tab', { active: activeFilter === tab.key }]"
              @click="activeFilter = tab.key"
            >
              {{ tab.label }}
              <span class="count">{{ tab.count }}</span>
            </button>
          </div>
        </div>

        <div class="dropdown-content">
          <div v-if="filteredAgents.length === 0" class="empty-state">
            <div class="empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <p>未找到匹配的智能体</p>
          </div>
          
          <div v-else class="agent-list">
            <div
              v-for="agent in filteredAgents"
              :key="agent.id"
              :class="['agent-item', { 
                active: agent.id === currentAgent?.id,
                disabled: !agent.isActive 
              }]"
              @click="selectAgent(agent)"
            >
              <div class="agent-avatar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div class="agent-details">
                <div class="agent-header">
                  <span class="agent-name">{{ agent.name }}</span>
                  <div class="agent-badges">
                    <span v-if="agent.isBuiltin" class="badge builtin">内置</span>
                    <span v-if="!agent.isActive" class="badge inactive">已停用</span>
                  </div>
                </div>
                <span class="agent-description">{{ agent.description }}</span>
                <div class="agent-tags">
                  <span
                    v-for="tag in agent.tags.slice(0, 2)"
                    :key="tag"
                    class="tag"
                  >
                    {{ tag }}
                  </span>
                  <span v-if="agent.tags.length > 2" class="tag more">
                    +{{ agent.tags.length - 2 }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="dropdown-footer">
          <button class="manage-btn" @click="handleManage">
            管理智能体
          </button>
        </div>
      </div>
    </Transition>

    <!-- 点击外部关闭 -->
    <div
      v-if="showDropdown"
      class="overlay"
      @click="showDropdown = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAgentStore } from '@/stores/agent'
import IconToggle from '@/components/icons/IconToggle.vue'
import type { Agent, AgentFilter } from '@/types/agent'

// Props
interface Props {
  modelValue?: Agent | null
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [agent: Agent | null]
  'manage': []
  'change': [agent: Agent | null]
}>()

// Store and Router
const agentStore = useAgentStore()
const router = useRouter()

// 响应式数据
const showDropdown = ref(false)
const searchKeyword = ref('')
const activeFilter = ref<'all' | 'active' | 'builtin' | 'custom'>('all')

// 计算属性
const currentAgent = computed(() => props.modelValue || agentStore.currentAgent)

const filterTabs = computed(() => [
  {
    key: 'all' as const,
    label: '全部',
    count: agentStore.agents.length
  },
  {
    key: 'active' as const,
    label: '启用',
    count: agentStore.activeAgents.length
  },
  {
    key: 'builtin' as const,
    label: '内置',
    count: agentStore.builtinAgents.length
  },
  {
    key: 'custom' as const,
    label: '自定义',
    count: agentStore.customAgents.length
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

  return agentStore.getFilteredAgents(filter, { by: 'name', order: 'asc' })
})

// 方法
const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
}

const selectAgent = (agent: Agent) => {
  if (!agent.isActive) return
  
  emit('update:modelValue', agent)
  emit('change', agent)
  agentStore.setCurrentAgent(agent)
  
  // 选择后关闭下拉菜单
  showDropdown.value = false
}

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Element
  if (!target.closest('.agent-selector')) {
    showDropdown.value = false
  }
}

const handleManage = () => {
  showDropdown.value = false
  router.push('/agents')
}

// 生命周期
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// 监听键盘事件
watch(showDropdown, (newVal) => {
  if (newVal) {
    searchKeyword.value = ''
    activeFilter.value = 'all'
  }
})
</script>

<style scoped>
.agent-selector {
  position: relative;
  width: 100%;
  min-width: 320px;
  max-width: 400px;
}

.current-agent {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--primary-white);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-small);
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 44px;
}

.current-agent:hover {
  background: var(--gray-50);
  border-color: var(--gray-300);
}

.current-agent:focus-within {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.1);
}

.agent-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.agent-avatar {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gray-100);
  border-radius: 6px;
  flex-shrink: 0;
  color: var(--gray-600);
}

.agent-details {
  flex: 1;
  min-width: 0;
}

.agent-name {
  display: block;
  font-weight: 500;
  color: var(--primary-black);
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
  max-width: 100%;
}

.agent-category {
  display: block;
  font-size: 11px;
  color: var(--gray-500);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
  max-width: 100%;
}

.dropdown-arrow {
  color: var(--gray-400);
  transition: transform 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dropdown-arrow.rotated {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  min-width: 320px;
  background: var(--primary-white);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-medium);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  z-index: 1000;
  max-height: 400px;
  display: flex;
  flex-direction: column;
}

.dropdown-header {
  padding: 12px;
  border-bottom: 1px solid var(--gray-100);
  background: var(--gray-50);
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-small);
  font-size: 13px;
  background: var(--primary-white);
  color: var(--primary-black);
  margin-bottom: 8px;
}

.search-input:focus {
  outline: none;
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.1);
}

.filter-tabs {
  display: flex;
  gap: 4px;
}

.tab {
  flex: 1;
  padding: 4px 8px;
  border: none;
  background: transparent;
  color: var(--gray-600);
  font-size: 11px;
  border-radius: var(--radius-small);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
}

.tab:hover {
  background: var(--gray-100);
  color: var(--primary-black);
}

.tab.active {
  background: var(--accent-blue);
  color: white;
}

.count {
  font-size: 11px;
  opacity: 0.8;
}

.dropdown-content {
  flex: 1;
  overflow-y: auto;
  max-height: 320px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--color-text-soft);
}

.empty-icon {
  opacity: 0.4;
  margin-bottom: 8px;
  color: var(--gray-400);
}

.agent-list {
  padding: 8px;
}

.agent-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--radius-small);
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 2px;
  border: 1px solid transparent;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.agent-item:last-child {
  margin-bottom: 0;
}

.agent-item:hover {
  background: var(--gray-50);
}

.agent-item.active {
  background: rgba(0, 122, 255, 0.1);
  border-color: var(--accent-blue);
}

.agent-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.agent-item .agent-avatar {
  width: 24px;
  height: 24px;
  background: var(--gray-100);
  border-radius: 4px;
  flex-shrink: 0;
  color: var(--gray-600);
}

.agent-item .agent-details {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  width: calc(100% - 32px);
}

.agent-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2px;
  width: 100%;
  overflow: hidden;
}

.agent-item .agent-name {
  font-weight: 500;
  font-size: 12px;
  color: var(--primary-black);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.agent-badges {
  display: flex;
  gap: 3px;
  flex-shrink: 0;
}

.badge {
  font-size: 8px;
  padding: 1px 3px;
  border-radius: 2px;
  font-weight: 500;
  white-space: nowrap;
}

.badge.builtin {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.badge.inactive {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.agent-item .agent-description {
  font-size: 10px;
  color: var(--gray-500);
  margin-bottom: 3px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
  max-height: 2.6em;
  word-break: break-all;
  width: 100%;
}

.agent-tags {
  display: flex;
  gap: 2px;
  flex-wrap: nowrap;
  max-width: 100%;
  overflow: hidden;
}

.tag {
  font-size: 8px;
  padding: 1px 3px;
  background: var(--gray-100);
  color: var(--gray-600);
  border-radius: 2px;
  white-space: nowrap;
  flex-shrink: 0;
}

.tag.more {
  background: var(--gray-200);
  color: var(--gray-700);
}

.dropdown-footer {
  padding: 8px 12px;
  border-top: 1px solid var(--gray-100);
  background: var(--gray-50);
}

.manage-btn {
  width: 100%;
  padding: 6px 12px;
  border: 1px solid var(--gray-200);
  background: var(--primary-white);
  color: var(--primary-black);
  border-radius: var(--radius-small);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
}

.manage-btn:hover {
  background: var(--gray-50);
  border-color: var(--gray-300);
}

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}

/* 过渡动画 */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>