<template>
  <aside class="conversation-sidebar" :class="{ collapsed: isCollapsed }">
    <!-- 侧边栏头部 -->
    <header class="sidebar-header" :class="{ collapsed: isCollapsed }">
      <div class="sidebar-title" v-if="!isCollapsed">
        <h2>对话历史</h2>
      </div>
      <div class="sidebar-actions" :class="{ collapsed: isCollapsed }">
        <button 
          @click="createNewConversation"
          class="btn btn-primary btn-icon"
          :class="{ 'btn-small': isCollapsed }"
          :title="isCollapsed ? '新对话' : ''"
          :disabled="isLoading"
        >
          <IconPlus />
        </button>
        <button 
          @click="toggleSidebar"
          class="btn btn-ghost btn-icon toggle-btn"
          :class="{ 'btn-small': isCollapsed }"
          :title="isCollapsed ? '展开' : '收起'"
        >
          <IconToggle :class="{ rotated: isCollapsed }" />
        </button>
      </div>
    </header>

    <!-- 搜索框 -->
    <div v-if="!isCollapsed" class="search-section">
      <div class="search-box">
        <IconSearch class="search-icon" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索对话..."
          class="search-input"
        />
      </div>
    </div>

    <!-- 对话列表 -->
    <div class="conversation-list">
      <div v-if="filteredConversations.length === 0 && !isLoading" class="empty-state">
        <div v-if="!isCollapsed" class="empty-content">
          <IconChat class="empty-icon" />
          <p class="empty-text">
            {{ searchQuery ? '未找到匹配的对话' : '暂无对话记录' }}
          </p>
        </div>
      </div>

      <div 
        v-for="conversation in filteredConversations" 
        :key="conversation.id"
        class="conversation-item"
        :class="{ 
          active: currentConversation?.id === conversation.id,
          collapsed: isCollapsed 
        }"
        @click="selectConversation(conversation.id)"
        :title="isCollapsed ? `${conversation.title}\n${conversation.model} • ${formatTime(conversation.updatedAt)}` : ''"
      >
        <div class="conversation-content">
          <div class="conversation-avatar" :class="{ 'active-avatar': currentConversation?.id === conversation.id }">
            <IconChat />
          </div>
          
          <div v-if="!isCollapsed" class="conversation-info">
            <h3 class="conversation-title">{{ conversation.title }}</h3>
            <div class="conversation-meta">
              <span class="conversation-model">{{ conversation.model }}</span>
              <span class="conversation-time">{{ formatTime(conversation.updatedAt) }}</span>
            </div>
            <div class="conversation-preview">
              {{ getLastUserMessage(conversation) }}
            </div>
          </div>
        </div>

        <!-- 折叠状态下的活动指示器 -->
        <div v-if="isCollapsed && currentConversation?.id === conversation.id" class="active-indicator"></div>

        <div v-if="!isCollapsed" class="conversation-actions">
          <button 
            @click.stop="renameConversation(conversation)"
            class="action-btn"
            title="重命名"
          >
            <IconEdit />
          </button>
          <button 
            @click.stop="deleteConversation(conversation.id)"
            class="action-btn danger"
            title="删除"
          >
            <IconTrash />
          </button>
        </div>
      </div>
    </div>

    <!-- 底部操作 -->
    <div class="sidebar-footer" :class="{ collapsed: isCollapsed }">
      <button 
        @click="clearAllConversations"
        class="btn btn-ghost clear-btn"
        :class="{ 
          'btn-icon-only': isCollapsed,
          'btn-small': !isCollapsed,
          'text-danger': !isCollapsed 
        }"
        :title="isCollapsed ? (conversations.length > 0 ? `清空所有对话 (${conversations.length})` : '暂无对话') : ''"
        :disabled="conversations.length === 0"
      >
        <IconTrash class="btn-icon" />
        <span v-if="!isCollapsed" class="btn-text">
          清空所有对话
          <span v-if="conversations.length > 0" class="conversation-count">({{ conversations.length }})</span>
        </span>
      </button>
    </div>

    <!-- 重命名对话框 -->
    <div v-if="showRenameDialog" class="modal-overlay" @click="cancelRename">
      <div class="modal" @click.stop>
        <header class="modal-header">
          <h3>重命名对话</h3>
          <button @click="cancelRename" class="btn btn-ghost btn-icon">
            <IconClose />
          </button>
        </header>
        
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">对话标题</label>
            <input
              v-model="newConversationTitle"
              type="text"
              class="input"
              placeholder="输入新的标题..."
              @keydown.enter="confirmRename"
              ref="renameInput"
            />
          </div>
        </div>
        
        <footer class="modal-footer">
          <button @click="cancelRename" class="btn btn-secondary">
            取消
          </button>
          <button 
            @click="confirmRename"
            class="btn btn-primary"
            :disabled="!newConversationTitle.trim()"
          >
            确认
          </button>
        </footer>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { useOllamaStore } from '@/stores/ollama'
import type { ConversationHistory } from '@/types/ollama'
import IconPlus from '@/components/icons/IconPlus.vue'
import IconToggle from '@/components/icons/IconToggle.vue'
import IconSearch from '@/components/icons/IconSearch.vue'
import IconChat from '@/components/icons/IconChat.vue'
import IconEdit from '@/components/icons/IconEdit.vue'
import IconTrash from '@/components/icons/IconTrash.vue'
import IconClose from '@/components/icons/IconClose.vue'

const ollamaStore = useOllamaStore()

// 响应式状态
const isCollapsed = ref(false)
const searchQuery = ref('')
const showRenameDialog = ref(false)
const newConversationTitle = ref('')
const conversationToRename = ref<ConversationHistory | null>(null)
const renameInput = ref<HTMLInputElement>()

// 计算属性
const conversations = computed(() => ollamaStore.conversations)
const currentConversation = computed(() => ollamaStore.currentConversation)
const isLoading = computed(() => ollamaStore.isLoading)

const filteredConversations = computed(() => {
  if (!searchQuery.value.trim()) {
    return conversations.value
  }
  
  const query = searchQuery.value.toLowerCase()
  return conversations.value.filter(conversation => 
    conversation.title.toLowerCase().includes(query) ||
    conversation.messages.some(msg => 
      msg.content.toLowerCase().includes(query)
    )
  )
})

// 方法
function toggleSidebar() {
  isCollapsed.value = !isCollapsed.value
}

function createNewConversation() {
  ollamaStore.createNewConversation()
}

function selectConversation(conversationId: string) {
  ollamaStore.setCurrentConversation(conversationId)
}

function getLastUserMessage(conversation: ConversationHistory): string {
  const userMessages = conversation.messages.filter(msg => msg.role === 'user')
  if (userMessages.length === 0) return '暂无消息'
  
  const lastMessage = userMessages[userMessages.length - 1]
  return lastMessage.content.substring(0, 50) + (lastMessage.content.length > 50 ? '...' : '')
}

function formatTime(timestamp: number): string {
  const now = new Date()
  const messageDate = new Date(timestamp)
  const diffMs = now.getTime() - messageDate.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    // 今天 - 显示时间
    return messageDate.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  } else if (diffDays === 1) {
    return '昨天'
  } else if (diffDays < 7) {
    return `${diffDays}天前`
  } else {
    return messageDate.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    })
  }
}

function renameConversation(conversation: ConversationHistory) {
  conversationToRename.value = conversation
  newConversationTitle.value = conversation.title
  showRenameDialog.value = true
  
  nextTick(() => {
    renameInput.value?.focus()
    renameInput.value?.select()
  })
}

function confirmRename() {
  if (!conversationToRename.value || !newConversationTitle.value.trim()) {
    return
  }
  
  const conversation = conversationToRename.value
  const index = conversations.value.findIndex(c => c.id === conversation.id)
  if (index !== -1) {
    conversations.value[index].title = newConversationTitle.value.trim()
    conversations.value[index].updatedAt = Date.now()
    ollamaStore.saveConversations()
  }
  
  cancelRename()
}

function cancelRename() {
  showRenameDialog.value = false
  conversationToRename.value = null
  newConversationTitle.value = ''
}

function deleteConversation(conversationId: string) {
  const conversation = conversations.value.find(c => c.id === conversationId)
  if (!conversation) return
  
  if (confirm(`确定要删除对话"${conversation.title}"吗？此操作不可撤销。`)) {
    ollamaStore.deleteConversation(conversationId)
  }
}

function clearAllConversations() {
  if (conversations.value.length === 0) return
  
  const count = conversations.value.length
  const message = `确定要清空所有 ${count} 个对话记录吗？\n\n⚠️ 此操作不可撤销，所有聊天历史将永久删除。`
  
  if (confirm(message)) {
    ollamaStore.clearConversations()
  }
}

// 监听折叠状态变化，清空搜索
watch(isCollapsed, (newValue) => {
  if (newValue) {
    searchQuery.value = ''
  }
})
</script>

<style scoped>
.conversation-sidebar {
  width: 320px;
  height: 100vh;
  background: var(--gray-50);
  border-right: 1px solid var(--gray-100);
  display: flex;
  flex-direction: column;
  transition: width var(--duration-normal) var(--ease-out);
  overflow: hidden;
  flex-shrink: 0;
}

.conversation-sidebar.collapsed {
  width: 60px;
}

/* 侧边栏头部 */
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-4);
  border-bottom: 1px solid var(--gray-100);
  background: var(--primary-white);
  flex-shrink: 0;
  min-height: 64px;
}

.sidebar-header.collapsed {
  justify-content: center;
  padding: var(--spacing-3);
}

.sidebar-title h2 {
  font-size: 16px;
  font-weight: 600;
  color: var(--primary-black);
  margin: 0;
}

.sidebar-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.sidebar-actions.collapsed {
  flex-direction: column;
  gap: var(--spacing-1);
}

.toggle-btn {
  transition: transform var(--duration-normal) var(--ease-out);
}

.rotated {
  transform: rotate(180deg);
}

.btn-small {
  width: 32px;
  height: 32px;
  padding: 6px;
  font-size: 14px;
}

/* 搜索部分 */
.search-section {
  padding: var(--spacing-4);
  border-bottom: 1px solid var(--gray-100);
  background: var(--primary-white);
  flex-shrink: 0;
}

.search-box {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  color: var(--gray-400);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 8px 12px 8px 32px;
  font-size: 14px;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-medium);
  background: var(--primary-white);
  color: var(--primary-black);
}

.search-input:focus {
  outline: none;
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.1);
}

/* 对话列表 */
.conversation-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-2) 0;
}

.empty-state {
  padding: var(--spacing-8) var(--spacing-4);
  text-align: center;
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-3);
}

.empty-icon {
  width: 48px;
  height: 48px;
  color: var(--gray-300);
}

.empty-text {
  font-size: 14px;
  color: var(--gray-500);
  margin: 0;
}

/* 对话项 */
.conversation-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-3) var(--spacing-4);
  margin: 0 var(--spacing-2);
  border-radius: var(--radius-medium);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  position: relative;
  min-height: 60px;
}

.conversation-item:hover {
  background: var(--primary-white);
}

.conversation-item.collapsed:hover {
  background: var(--gray-100);
  transform: scale(1.05);
}

.conversation-item.active {
  background: var(--primary-white);
  box-shadow: var(--shadow-small);
}

.conversation-item.collapsed.active {
  background: var(--gray-200);
  box-shadow: var(--shadow-medium);
}

.conversation-item.collapsed {
  justify-content: center;
  padding: var(--spacing-2);
  margin: var(--spacing-1) var(--spacing-2);
  min-height: 48px;
  border-radius: var(--radius-small);
}

.conversation-content {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-3);
  flex: 1;
  min-width: 0;
}

.conversation-avatar {
  width: 32px;
  height: 32px;
  background: var(--gray-100);
  border-radius: var(--radius-medium);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--gray-500);
  flex-shrink: 0;
  transition: all var(--duration-fast) var(--ease-out);
  position: relative;
}

.conversation-avatar.active-avatar {
  background: var(--primary-black);
  color: var(--primary-white);
}

.conversation-item.collapsed .conversation-avatar {
  width: 36px;
  height: 36px;
}

/* 活动状态指示器 */
.active-indicator {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 20px;
  background: var(--primary-black);
  border-radius: 2px;
}

.conversation-info {
  flex: 1;
  min-width: 0;
}

.conversation-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--primary-black);
  margin: 0 0 var(--spacing-1) 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-1);
}

.conversation-model,
.conversation-time {
  font-size: 12px;
  color: var(--gray-500);
}

.conversation-model {
  padding: 1px 4px;
  background: var(--gray-100);
  border-radius: var(--radius-small);
}

.conversation-preview {
  font-size: 12px;
  color: var(--gray-400);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-actions {
  display: flex;
  gap: var(--spacing-1);
  opacity: 0;
  transition: opacity var(--duration-fast) var(--ease-out);
}

.conversation-item:hover .conversation-actions {
  opacity: 1;
}

.action-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: var(--radius-small);
  cursor: pointer;
  color: var(--gray-400);
  transition: all var(--duration-fast) var(--ease-out);
}

.action-btn:hover {
  background: var(--gray-100);
  color: var(--gray-600);
}

.action-btn.danger:hover {
  background: color-mix(in srgb, var(--error-red) 10%, transparent);
  color: var(--error-red);
}

/* 侧边栏底部 */
.sidebar-footer {
  padding: var(--spacing-4);
  border-top: 1px solid var(--gray-100);
  background: var(--primary-white);
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.sidebar-footer.collapsed {
  padding: var(--spacing-3);
}

.clear-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: var(--spacing-2);
  transition: all var(--duration-fast) var(--ease-out);
  border-radius: var(--radius-medium);
  color: var(--error-red);
}

.clear-btn:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.1);
  color: var(--error-red);
  transform: translateY(-1px);
}

.clear-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  color: var(--gray-400);
  transform: none;
}

.clear-btn:disabled:hover {
  background: transparent;
  transform: none;
}

.clear-btn.btn-icon-only {
  width: 36px;
  height: 36px;
  padding: 8px;
  justify-content: center;
  border-radius: var(--radius-full);
}

.btn-text {
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
}

.conversation-count {
  font-size: 12px;
  opacity: 0.7;
  font-weight: 400;
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
  max-width: 400px;
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
  font-size: 16px;
  font-weight: 600;
  color: var(--primary-black);
  margin: 0;
}

.modal-body {
  padding: var(--spacing-6);
  flex: 1;
  overflow-y: auto;
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
  font-size: 14px;
}

.input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-medium);
  font-size: 14px;
  background: var(--primary-white);
  color: var(--primary-black);
  transition: border-color var(--duration-fast) var(--ease-out);
}

.input:focus {
  outline: none;
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.1);
}

/* 工具类 */
.text-danger {
  color: var(--error-red) !important;
}
</style>