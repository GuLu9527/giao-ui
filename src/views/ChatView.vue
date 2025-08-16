<template>
  <div class="chat-layout">
    <!-- 对话历史侧边栏 -->
    <ConversationHistory />
    
    <div class="chat-view">
      <!-- 聊天头部 -->
      <header class="chat-header">
        <div class="chat-info">
          <h1 class="chat-title">{{ currentConversation?.title || 'AI 对话' }}</h1>
          <div class="header-controls">
            <!-- 智能体选择器 -->
            <div class="agent-selector-container">
              <div v-if="agentStore.error" class="agent-error">
                <span class="error-icon">⚠️</span>
                <span class="error-message">{{ agentStore.error }}</span>
              </div>
              <AgentSelector 
                v-else
                v-model="currentAgent"
                @change="handleAgentChange"
              />
            </div>
            <!-- 模型选择器 -->
            <div class="model-selector">
              <select 
                v-model="selectedModel" 
                @change="handleModelChange"
                class="model-select"
                :disabled="isLoading"
              >
                <option value="">选择模型...</option>
                <option 
                  v-for="model in availableModels" 
                  :key="model.name" 
                  :value="model.name"
                >
                  {{ model.name }}
                </option>
              </select>
            </div>
          </div>
        </div>
        
        <div class="chat-actions">
          <div v-if="currentMessages.length > 0" class="conversation-stats">
            <span class="stat-item">{{ currentMessages.length }} 条消息</span>
            <span v-if="showMetrics" class="stat-item">{{ averageResponseTime }}ms 平均响应</span>
            <span v-if="ollamaStore.settings.enableThinking" class="stat-item thinking-enabled">🤔 思考模式</span>
            <span v-if="currentModelSupportsVision" class="stat-item vision-enabled">👁️ 视觉支持</span>
          </div>
          
          <button 
            @click="createNewChat"
            class="btn btn-secondary btn-small"
            :disabled="isLoading"
          >
            <IconPlus class="btn-icon" />
            新对话
          </button>
        </div>
      </header>
    
    <!-- 聊天消息区域 -->
    <div class="chat-messages" ref="messagesContainer">
      <div v-if="currentMessages.length === 0" class="empty-state">
        <div class="empty-icon">
          <IconChat />
        </div>
        <h3 class="empty-title">开始新的对话</h3>
        <p class="empty-description">
          选择一个AI模型，然后输入您的问题开始对话
        </p>
      </div>
      
      <div 
        v-for="(message, index) in currentMessages" 
        :key="index"
        class="message"
        :class="`message-${message.role}`"
      >
        <div class="message-avatar">
          <IconUser v-if="message.role === 'user'" />
          <IconBot v-else />
        </div>
        
        <div class="message-content">
          <!-- 思考过程 (仅限AI消息且有思考内容，且用户启用了思考模式) -->
          <div v-if="message.role === 'assistant' && message.thinking && message.thinking.trim() && ollamaStore.settings.enableThinking" class="thinking-section">
            <div class="thinking-header" @click="toggleThinking(index)">
              <span class="thinking-icon">🤔</span>
              <span class="thinking-title">思考过程</span>
              <span class="thinking-toggle" :class="{ expanded: expandedThinking.has(index) }">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4.5 6L8 9.5L11.5 6"/>
                </svg>
              </span>
            </div>
            <div v-show="expandedThinking.has(index)" class="thinking-content">
              <div class="thinking-text" v-html="formatMessage(message.thinking)"></div>
            </div>
          </div>
          
          <!-- 用户图像内容 -->
          <div v-if="message.role === 'user' && message.images && message.images.length > 0" class="message-images">
            <div class="image-grid">
              <div 
                v-for="(image, imgIndex) in message.images" 
                :key="imgIndex"
                class="message-image"
              >
                <img :src="`data:image/jpeg;base64,${image}`" :alt="`上传的图片 ${imgIndex + 1}`" />
              </div>
            </div>
          </div>
          
          
          <!-- 回答内容 -->
          <div class="message-text" v-html="formatMessage(message.content)"></div>
          
          
          <!-- 性能指标 -->
          <div v-if="message.role === 'assistant' && showMetrics && message.metrics" class="message-metrics">
            <span class="metric">{{ message.metrics.responseTime }}ms</span>
            <span v-if="message.metrics.tokensPerSecond > 0" class="metric">{{ message.metrics.tokensPerSecond }} tokens/s</span>
            <span v-if="message.metrics.totalTokens > 0" class="metric">{{ message.metrics.totalTokens }} tokens</span>
          </div>
        </div>
      </div>
      
      <!-- 正在输入指示器 -->
      <div v-if="isTyping" class="message message-assistant">
        <div class="message-avatar">
          <IconBot />
        </div>
        <div class="message-content">
          <div class="typing-indicator">
            <div class="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    
    <!-- 输入区域 -->
    <footer class="chat-input-area">
      <!-- 紧凑的图像预览区域 -->
      <div v-if="currentModelSupportsVision && uploadedImages.length > 0" class="compact-image-preview">
        <div class="preview-images">
          <div 
            v-for="(image, index) in uploadedImages" 
            :key="image.id"
            class="preview-item"
          >
            <img :src="image.preview" :alt="image.name" />
            <button 
              @click="removeUploadedImage(index)"
              class="remove-preview-btn"
              :title="'移除图片'"
            >
              <IconClose />
            </button>
          </div>
        </div>
      </div>
      
      <div class="input-container">
        <div class="input-wrapper">
          <textarea
            ref="messageInput"
            v-model="currentMessage"
            @keydown.enter.exact.prevent="handleSendMessage"
            @keydown.enter.shift.exact="handleNewLine"
            @input="adjustTextareaHeight"
            placeholder="输入您的消息... (Enter发送, Shift+Enter换行)"
            class="message-input"
            :disabled="isLoading || !selectedModel"
            rows="1"
          ></textarea>
          
          <div class="input-tools">
            
            <!-- 图像上传按钮 -->
            <button 
              v-if="currentModelSupportsVision"
              @click="triggerImageUpload"
              class="tool-btn image-upload-btn"
              :disabled="isLoading"
              :title="'上传图片'"
            >
              <IconImage />
            </button>
            
            <div class="thinking-switch-container">
              <span class="thinking-label" :class="{ disabled: !currentModelSupportsThinking }">
                思考
                <span v-if="!currentModelSupportsThinking" class="model-unsupported">
                  (当前模型不支持)
                </span>
              </span>
              <label class="thinking-switch" :class="{ disabled: !currentModelSupportsThinking }">
                <input 
                  type="checkbox" 
                  :checked="ollamaStore.settings.enableThinking && currentModelSupportsThinking"
                  :disabled="!currentModelSupportsThinking"
                  @change="toggleThinkingMode"
                />
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>
          
          <!-- 隐藏的文件输入 -->
          <input
            ref="hiddenFileInput"
            type="file"
            multiple
            accept="image/*"
            @change="handleImageSelect"
            style="display: none;"
          />
        </div>
        
        <div class="input-actions">
          <button
            v-if="!isLoading"
            @click="handleSendMessage"
            class="btn btn-primary btn-icon"
            :disabled="!currentMessage.trim() || !selectedModel"
            title="发送消息 (Enter)"
          >
            <IconSend />
          </button>
          <button
            v-else
            @click="handleAbortMessage"
            class="btn btn-danger btn-icon"
            title="中断对话"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
          </button>
        </div>
      </div>
      
      <!-- 快速操作 -->
      <div class="quick-actions" v-if="!isLoading">
        <button 
          @click="insertQuickMessage('解释一下这个概念')"
          class="quick-action"
        >
          解释概念
        </button>
        <button 
          @click="insertQuickMessage('帮我写一段代码')"
          class="quick-action"
        >
          编写代码
        </button>
        <button 
          @click="insertQuickMessage('总结这个内容')"
          class="quick-action"
        >
          内容总结
        </button>
      </div>
    </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useOllamaStore } from '@/stores/ollama'
import { useAgentStore } from '@/stores/agent'
import { ollamaService } from '@/services/ollama'
import type { OllamaChatMessage, ImageFile } from '@/types/ollama'
import type { Agent } from '@/types/agent'
import ConversationHistory from '@/components/ConversationHistory.vue'
import AgentSelector from '@/components/AgentSelector.vue'
import IconChat from '@/components/icons/IconChat.vue'
import IconPlus from '@/components/icons/IconPlus.vue'
import IconUser from '@/components/icons/IconUser.vue'
import IconBot from '@/components/icons/IconBot.vue'
import IconSend from '@/components/icons/IconSend.vue'
import IconLoader from '@/components/icons/IconLoader.vue'
import IconImage from '@/components/icons/IconImage.vue'
import IconClose from '@/components/icons/IconClose.vue'
import ImageUpload from '@/components/ImageUpload.vue'

const ollamaStore = useOllamaStore()
const agentStore = useAgentStore()

// 响应式状态
const currentMessage = ref('')
const isLoading = ref(false)
const isTyping = ref(false)
const responseTime = ref(0)
const tokensPerSecond = ref(0)
const messagesContainer = ref<HTMLElement>()
const messageInput = ref<HTMLTextAreaElement>()
const hiddenFileInput = ref<HTMLInputElement>()
const expandedThinking = ref(new Set<number>())
const uploadedImages = ref<ImageFile[]>([])
const currentRequestId = ref<string | null>(null)

// 智能体相关
const currentAgent = ref<Agent | null>(null)

// 计算属性
const availableModels = computed(() => ollamaStore.availableModels)
const currentMessages = computed(() => ollamaStore.currentMessages)
const currentConversation = computed(() => ollamaStore.currentConversation)
const selectedModel = computed({
  get: () => ollamaStore.selectedModel,
  set: (value: string) => ollamaStore.setSelectedModel(value)
})
const showMetrics = computed(() => ollamaStore.settings.showMetrics)
const averageResponseTime = computed(() => Math.round(ollamaStore.averageResponseTime))
const currentModelSupportsThinking = computed(() => 
  selectedModel.value ? ollamaStore.checkModelSupportsThinking(selectedModel.value) : true
)
const currentModelSupportsVision = computed(() => {
  if (!selectedModel.value) return false
  const supportsVision = ollamaStore.checkModelCapability(selectedModel.value, 'vision')
  console.log(`模型 ${selectedModel.value} 视觉能力支持:`, supportsVision)
  console.log(`模型 ${selectedModel.value} 所有能力:`, ollamaStore.getModelCapabilities(selectedModel.value))
  return supportsVision
})


// 发送消息
async function handleSendMessage() {
  if (!currentMessage.value.trim() || !selectedModel.value || isLoading.value) {
    return
  }

  const userMessage = currentMessage.value.trim()
  currentMessage.value = ''

  // 添加用户消息
  const userMsg: OllamaChatMessage = {
    role: 'user',
    content: userMessage,
    // 如果有上传的图片，添加base64编码的图片数据
    images: uploadedImages.value.length > 0 ? uploadedImages.value.map(img => img.base64) : undefined
  }
  
  ollamaStore.addMessage(userMsg)
  
  // 清空上传的图片
  uploadedImages.value = []
  
  // 滚动到底部
  await nextTick()
  scrollToBottom()

  // 在try块外定义变量，确保catch块中可以访问
  const startTime = Date.now()
  let totalTokens = 0
  
  // 准备消息列表，包含系统提示
  let messages = [...ollamaStore.currentMessages]
  
  // 如果有当前智能体，在消息列表开头添加系统消息
  if (currentAgent.value?.systemPrompt) {
    // 检查是否已经有系统消息，如果有则替换，否则添加
    const hasSystemMessage = messages.length > 0 && messages[0].role === 'system'
    const systemMessage: OllamaChatMessage = {
      role: 'system',
      content: currentAgent.value.systemPrompt
    }
    
    if (hasSystemMessage) {
      messages[0] = systemMessage
    } else {
      messages.unshift(systemMessage)
    }
  }

  // 创建流式请求
  const chatRequest: any = {
    model: selectedModel.value,
    messages,
    options: {
      ...ollamaStore.settings.defaultOptions,
      // 使用智能体的配置覆盖默认设置
      ...(currentAgent.value?.config && {
        temperature: currentAgent.value.config.temperature,
        num_predict: currentAgent.value.config.maxTokens,
        top_p: currentAgent.value.config.topP
      })
    }
  }

  try {
    isLoading.value = true
    isTyping.value = true
    
    // 生成请求ID
    const requestId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    currentRequestId.value = requestId
    
    // 添加空的助手消息
    const assistantMsg: OllamaChatMessage = {
      role: 'assistant',
      content: ''
    }
    ollamaStore.addMessage(assistantMsg)
    
    // 智能判断是否启用思考模式
    const shouldThink = ollamaStore.settings.enableThinking && ollamaStore.checkModelSupportsThinking(selectedModel.value)
    if (shouldThink) {
      chatRequest.think = true
    }
    
    // 调试信息
    console.log('发送聊天请求:', {
      model: selectedModel.value,
      enableThinking: ollamaStore.settings.enableThinking,
      modelSupportsThinking: ollamaStore.checkModelSupportsThinking(selectedModel.value),
      shouldThink,
      thinkParameter: chatRequest.think || false
    })

    let fullResponse = ''
    let thinkingContent = ''
    
    // 处理流式响应
    for await (const chunk of ollamaService.chatStream(chatRequest, requestId)) {
      isTyping.value = false
      
      // 处理思考内容（只有在启用思考模式时才处理）
      if (chunk.message?.thinking && shouldThink) {
        thinkingContent += chunk.message.thinking
        ollamaStore.updateLastMessageThinking(thinkingContent)
      }
      
      // 处理回答内容
      if (chunk.message?.content) {
        fullResponse += chunk.message.content
        ollamaStore.updateLastMessage(fullResponse)
        
        // 滚动到底部
        await nextTick()
        scrollToBottom()
      }
      
      if (chunk.done) {
        // 计算性能指标
        const endTime = Date.now()
        const calculatedResponseTime = endTime - startTime
        let calculatedTokensPerSecond = 0
        
        if (chunk.eval_count && chunk.eval_duration) {
          calculatedTokensPerSecond = Math.round(
            chunk.eval_count / (chunk.eval_duration / 1_000_000_000)
          )
          totalTokens = chunk.eval_count
        }
        
        // 确保最后的完整响应被保存，并添加性能指标
        if (fullResponse) {
          ollamaStore.updateLastMessageWithMetrics(fullResponse, {
            responseTime: calculatedResponseTime,
            tokensPerSecond: calculatedTokensPerSecond,
            totalTokens,
            loadTime: chunk.load_duration || 0
          })
        }
        
        // 更新响应式数据用于显示
        responseTime.value = calculatedResponseTime
        tokensPerSecond.value = calculatedTokensPerSecond
        
        // 记录性能指标
        ollamaStore.addPerformanceMetric({
          responseTime: calculatedResponseTime,
          tokensPerSecond: calculatedTokensPerSecond,
          totalTokens,
          loadTime: chunk.load_duration || 0,
          timestamp: Date.now()
        })
        
        
        // 保存对话历史
        if (ollamaStore.settings.autoSave) {
          ollamaStore.saveConversations()
        }
        
        break
      }
    }
  } catch (error: any) {
    console.error('Chat error:', error)
    
    // 检查是否是中断错误
    if (error.message === '请求已被中断') {
      console.log('对话被用户中断')
      return // 直接返回，不显示错误消息，因为已经在中断函数中处理了
    }
    
    // 检查是否是思考模式不支持的错误（支持多种错误消息格式）
    const isThinkingError = error.message && (
      error.message.includes('does not support thinking') ||
      error.message.includes('not support thinking') ||
      error.message.includes('thinking not supported') ||
      error.message.includes('invalid parameter: think') ||
      error.message.includes('unknown parameter: think')
    )
    
    if (isThinkingError) {
      console.log(`模型 ${selectedModel.value} 不支持思考模式，记录并重试`)
      console.log('错误详情:', error.message)
      
      // 记录此模型不支持思考模式
      ollamaStore.setModelThinkingCapability(selectedModel.value, false)
      
      // 移除思考参数并重试
      try {
        const retryRequest = { ...chatRequest }
        delete retryRequest.think
        
        let fullResponse = ''
        
        // 重新发起请求（不带思考模式）
        for await (const chunk of ollamaService.chatStream(retryRequest, requestId)) {
          isTyping.value = false
          
          // 处理回答内容
          if (chunk.message?.content) {
            fullResponse += chunk.message.content
            ollamaStore.updateLastMessage(fullResponse)
            
            // 滚动到底部
            await nextTick()
            scrollToBottom()
          }
          
          if (chunk.done) {
            // 计算性能指标
            const endTime = Date.now()
            const calculatedResponseTime = endTime - startTime
            let calculatedTokensPerSecond = 0
            
            if (chunk.eval_count && chunk.eval_duration) {
              calculatedTokensPerSecond = Math.round(
                chunk.eval_count / (chunk.eval_duration / 1_000_000_000)
              )
              totalTokens = chunk.eval_count
            }
            
            // 确保最后的完整响应被保存，并添加性能指标
            if (fullResponse) {
              ollamaStore.updateLastMessageWithMetrics(fullResponse, {
                responseTime: calculatedResponseTime,
                tokensPerSecond: calculatedTokensPerSecond,
                totalTokens,
                loadTime: chunk.load_duration || 0
              })
            }
            
            // 更新响应式数据用于显示
            responseTime.value = calculatedResponseTime
            tokensPerSecond.value = calculatedTokensPerSecond
            
            // 记录性能指标
            ollamaStore.addPerformanceMetric({
              responseTime: calculatedResponseTime,
              tokensPerSecond: calculatedTokensPerSecond,
              totalTokens,
              loadTime: chunk.load_duration || 0,
              timestamp: Date.now()
            })
            
            // 保存对话历史
            if (ollamaStore.settings.autoSave) {
              ollamaStore.saveConversations()
            }
            
            break
          }
        }
        
        // 成功重试后返回
        return
      } catch (retryError) {
        console.error('重试失败:', retryError)
        ollamaStore.updateLastMessage('抱歉，模型不支持思考模式且重试失败。请尝试关闭思考模式或更换支持的模型。')
        return
      }
    }
    
    // 其他错误的通用处理
    ollamaStore.updateLastMessage('抱歉，发生了错误。请检查网络连接或稍后重试。')
  } finally {
    isLoading.value = false
    isTyping.value = false
    currentRequestId.value = null
    
    // 重新聚焦输入框
    await nextTick()
    messageInput.value?.focus()
  }
}

// 中断当前对话
function handleAbortMessage() {
  if (currentRequestId.value) {
    const success = ollamaService.abortChatStream(currentRequestId.value)
    if (success) {
      console.log('成功中断对话')
      ollamaStore.updateLastMessage('对话已被中断。')
    } else {
      console.warn('未能找到对应的请求进行中断')
    }
  }
}

// 处理换行
function handleNewLine() {
  currentMessage.value += '\n'
}

// 处理模型切换
function handleModelChange() {
  // 如果切换模型，可以选择是否创建新对话
  // 这里暂时不做处理，保持当前对话
}

// 处理智能体切换
function handleAgentChange(agent: Agent | null) {
  currentAgent.value = agent
  // 可以在这里重新生成系统消息或创建新对话
}

// 创建新对话
function createNewChat() {
  ollamaStore.createNewConversation(selectedModel.value)
  scrollToBottom()
}

// 插入快速消息
function insertQuickMessage(message: string) {
  currentMessage.value = message
  messageInput.value?.focus()
}

// 切换思考内容展开/折叠
function toggleThinking(index: number) {
  if (expandedThinking.value.has(index)) {
    expandedThinking.value.delete(index)
  } else {
    expandedThinking.value.add(index)
  }
}

// 切换思考模式
function toggleThinkingMode() {
  ollamaStore.updateSettings({ 
    enableThinking: !ollamaStore.settings.enableThinking 
  })
}

// 处理图像上传错误
function handleImageError(message: string) {
  console.error('图像上传错误:', message)
  // 这里可以添加用户通知，比如显示 toast 消息
}

// 检查是否应该显示Canvas绘图功能
function shouldShowCanvas(messageContent: string): boolean {
  const drawingKeywords = [
    '绘制', '画', '图形', '图像', '可视化', '图表', '绘图',
    'draw', 'paint', 'create', 'visualize', 'chart', 'graph'
  ]
  const content = messageContent.toLowerCase()
  return drawingKeywords.some(keyword => 
    content.includes(keyword) || content.includes(keyword.toLowerCase())
  )
}

// 处理Canvas生成完成
function handleCanvasGenerated(scene: CanvasScene) {
  console.log('🎨 Canvas生成完成:', scene)
  
  // 可以在这里添加一条AI回复，描述生成的图形
  const aiResponse = `我已经为您创建了一个包含${scene.shapes.length}个图形元素的可视化作品。图形已在上方显示，您可以点击导出按钮保存为PNG格式。`
  
  const aiMessage: OllamaChatMessage = {
    role: 'assistant',
    content: aiResponse
  }
  
  ollamaStore.addMessage(aiMessage)
  scrollToBottom()
}

// 触发图像上传
function triggerImageUpload() {
  hiddenFileInput.value?.click()
}

// 处理图像选择
async function handleImageSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])
  
  if (files.length === 0) return
  
  try {
    const { processImageFiles } = await import('@/utils/imageUtils')
    
    // 检查数量限制
    const maxImages = ollamaStore.settings.multimodal?.maxImages || 5
    if (uploadedImages.value.length + files.length > maxImages) {
      console.warn(`最多只能上传 ${maxImages} 张图片`)
      return
    }
    
    // 处理图像
    const result = await processImageFiles(files, {
      maxSize: ollamaStore.settings.multimodal?.maxImageSize || 5120,
      allowedTypes: ollamaStore.settings.multimodal?.allowedFormats || ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      quality: ollamaStore.settings.multimodal?.imageQuality || 0.8,
      compress: ollamaStore.settings.multimodal?.compressImages ?? true
    })
    
    // 添加成功的图像
    uploadedImages.value.push(...result.success)
    
    // 处理错误
    if (result.errors.length > 0) {
      const errorMessages = result.errors.map(err => `${err.file.name}: ${err.error}`)
      console.error('图像处理错误:', errorMessages.join('; '))
    }
    
  } catch (error) {
    console.error('处理图像失败:', error)
  }
  
  // 清空input
  target.value = ''
}

// 移除上传的图像
function removeUploadedImage(index: number) {
  uploadedImages.value.splice(index, 1)
}

// 滚动到底部
function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// 格式化消息内容（简单的Markdown支持）
function formatMessage(content: string): string {
  if (!content || typeof content !== 'string') {
    return ''
  }
  
  // 基础Markdown格式化
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>')
}

// 自动调整文本框高度
function adjustTextareaHeight() {
  if (messageInput.value) {
    messageInput.value.style.height = 'auto'
    messageInput.value.style.height = messageInput.value.scrollHeight + 'px'
  }
}

// 监听消息输入变化
watch(currentMessage, () => {
  nextTick(() => {
    adjustTextareaHeight()
  })
})


// 键盘快捷键
function handleKeyboardShortcuts(event: KeyboardEvent) {
  // Cmd/Ctrl + N: 新对话
  if ((event.metaKey || event.ctrlKey) && event.key === 'n') {
    event.preventDefault()
    createNewChat()
  }
  
  // Escape: 中断对话
  if (event.key === 'Escape' && isLoading.value) {
    event.preventDefault()
    handleAbortMessage()
  }
}

onMounted(async () => {
  // 初始化智能体store
  await agentStore.initialize()
  
  // 设置当前智能体为store中的当前智能体
  currentAgent.value = agentStore.currentAgent
  
  // 如果没有当前对话，创建一个新的
  if (!ollamaStore.currentConversation) {
    ollamaStore.createNewConversation()
  }
  
  // 聚焦输入框
  nextTick(() => {
    messageInput.value?.focus()
  })
  
  // 添加键盘事件监听器
  document.addEventListener('keydown', handleKeyboardShortcuts)
})

onUnmounted(() => {
  // 移除键盘事件监听器
  document.removeEventListener('keydown', handleKeyboardShortcuts)
})
</script>

<style scoped>
.chat-layout {
  display: flex;
  height: 100vh;
  background: var(--primary-white);
  overflow: hidden;
}

.chat-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--primary-white);
  overflow: hidden;
}

/* 聊天头部 */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-4) var(--spacing-6);
  border-bottom: 1px solid var(--gray-100);
  background: var(--primary-white);
  flex-shrink: 0;
}

.chat-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
}

.header-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
}

.agent-selector-container {
  min-width: 320px;
  max-width: 400px;
}

.agent-error {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: 8px 12px;
  background: rgba(255, 59, 48, 0.1);
  border: 1px solid rgba(255, 59, 48, 0.3);
  border-radius: var(--radius-medium);
  color: #d70015;
  font-size: 13px;
}

.error-icon {
  font-size: 14px;
}

.error-message {
  font-weight: 500;
}

.chat-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--primary-black);
  margin: 0;
}

.model-selector {
  position: relative;
}

.model-select {
  padding: 6px 12px;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-small);
  font-size: 14px;
  background: var(--primary-white);
  color: var(--primary-black);
  min-width: 200px;
  cursor: pointer;
}

.model-select:focus {
  outline: none;
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.2);
}

.model-select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 聊天消息区域 */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-4) var(--spacing-6);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: var(--gray-500);
}

.empty-icon {
  width: 64px;
  height: 64px;
  margin-bottom: var(--spacing-4);
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
  max-width: 300px;
}

/* 消息样式 */
.message {
  display: flex;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-4);
}

.message-user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 16px;
}

.message-user .message-avatar {
  background: var(--primary-black);
  color: var(--primary-white);
}

.message-assistant .message-avatar {
  background: var(--gray-100);
  color: var(--gray-600);
}

.message-content {
  max-width: 70%;
  min-width: 100px;
}

.message-text {
  padding: var(--spacing-3) var(--spacing-4);
  border-radius: var(--radius-large);
  font-size: 15px;
  line-height: 1.4;
  word-wrap: break-word;
}

.message-user .message-text {
  background: var(--primary-black);
  color: var(--primary-white);
  border-bottom-right-radius: var(--radius-small);
}

.message-assistant .message-text {
  background: var(--gray-50);
  color: var(--primary-black);
  border-bottom-left-radius: var(--radius-small);
}

.message-metrics {
  margin-top: var(--spacing-2);
  display: flex;
  gap: var(--spacing-3);
  font-size: 12px;
  color: var(--gray-400);
}

/* 思考过程样式 */
.thinking-section {
  margin-bottom: var(--spacing-3);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-medium);
  background: rgba(139, 69, 19, 0.05);
}

.thinking-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
  cursor: pointer;
  border-radius: var(--radius-medium);
  transition: background-color var(--duration-fast) var(--ease-out);
}

.thinking-header:hover {
  background: rgba(139, 69, 19, 0.1);
}

.thinking-icon {
  font-size: 14px;
}

.thinking-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--gray-600);
  flex: 1;
}

.thinking-toggle {
  color: var(--gray-500);
  transition: transform var(--duration-fast) var(--ease-out);
}

.thinking-toggle.expanded {
  transform: rotate(180deg);
}

.thinking-content {
  border-top: 1px solid var(--gray-200);
  padding: var(--spacing-3);
  background: rgba(139, 69, 19, 0.02);
}

.thinking-text {
  font-size: 14px;
  line-height: 1.5;
  color: var(--gray-600);
  font-style: italic;
  white-space: pre-wrap;
}

/* 正在输入指示器 */
.typing-indicator {
  padding: var(--spacing-3) var(--spacing-4);
}

.typing-dots {
  display: flex;
  gap: 4px;
}

.typing-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--gray-400);
  animation: typing 1.4s infinite ease-in-out;
}

.typing-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  30% {
    transform: translateY(-10px);
    opacity: 1;
  }
}

/* 输入区域 */
.chat-input-area {
  padding: var(--spacing-4) var(--spacing-6);
  border-top: 1px solid var(--gray-100);
  background: var(--primary-white);
  flex-shrink: 0;
}

/* 紧凑的图像预览区域 */
.compact-image-preview {
  margin-bottom: var(--spacing-3);
  padding: var(--spacing-2);
  background: var(--gray-50);
  border-radius: var(--radius-medium);
  border: 1px solid var(--gray-200);
}

.preview-images {
  display: flex;
  gap: var(--spacing-2);
  flex-wrap: wrap;
}

.preview-item {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: var(--radius-small);
  overflow: hidden;
  border: 1px solid var(--gray-200);
  background: var(--gray-100);
}

.preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-preview-btn {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(255, 59, 48, 0.9);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  transition: all var(--duration-fast) var(--ease-out);
  z-index: 2;
}

.remove-preview-btn:hover {
  background: rgba(255, 59, 48, 1);
  transform: scale(1.1);
}

.input-container {
  display: flex;
  gap: var(--spacing-3);
  align-items: flex-end;
  margin-bottom: var(--spacing-3);
}

.input-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: flex-end;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-large);
  background: var(--primary-white);
  transition: all var(--duration-normal) var(--ease-out);
}

.input-wrapper:focus-within {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.1);
}

.message-input {
  flex: 1;
  padding: var(--spacing-3) var(--spacing-4);
  border: none;
  background: transparent;
  font-size: 15px;
  font-family: inherit;
  color: var(--primary-black);
  resize: none;
  min-height: 44px;
  max-height: 120px;
  overflow-y: hidden;
  outline: none;
  line-height: 1.4;
}

.input-tools {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2);
  border-left: 1px solid var(--gray-100);
}

.tool-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: var(--radius-small);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--gray-500);
  transition: all var(--duration-fast) var(--ease-out);
}

.tool-btn:hover {
  background: var(--gray-100);
  color: var(--primary-black);
}

.tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.image-upload-btn {
  color: var(--accent-blue);
}

.image-upload-btn:hover {
  background: rgba(0, 122, 255, 0.1);
  color: var(--accent-blue);
}

.message-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 思考模式开关 */
.thinking-switch-container {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.thinking-label {
  font-size: 12px;
  color: var(--gray-600);
  font-weight: 500;
  transition: color var(--duration-normal) var(--ease-out);
}

.thinking-label.disabled {
  color: var(--gray-400);
  opacity: 0.6;
}

.model-unsupported {
  font-size: 10px;
  color: var(--gray-400);
  font-weight: 400;
}

.thinking-switch {
  position: relative;
  display: inline-block;
  width: 32px;
  height: 18px;
  cursor: pointer;
}

.thinking-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.switch-slider {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--gray-300);
  border-radius: 18px;
  transition: all var(--duration-normal) var(--ease-out);
}

.switch-slider::before {
  position: absolute;
  content: '';
  height: 14px;
  width: 14px;
  left: 2px;
  bottom: 2px;
  background: var(--primary-white);
  border-radius: 50%;
  transition: all var(--duration-normal) var(--ease-out);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.thinking-switch input:checked + .switch-slider {
  background: rgba(139, 69, 19, 0.8);
}

.thinking-switch input:checked + .switch-slider::before {
  transform: translateX(14px);
}

.thinking-switch.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.thinking-switch.disabled input {
  cursor: not-allowed;
}

.input-actions {
  display: flex;
  align-items: center;
}

.chat-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
}

.conversation-stats {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.stat-item {
  font-size: 12px;
  color: var(--gray-500);
  padding: 2px 6px;
  background: var(--gray-100);
  border-radius: var(--radius-small);
}

.thinking-enabled {
  background: rgba(139, 69, 19, 0.1) !important;
  color: rgba(139, 69, 19, 0.8) !important;
  font-weight: 500;
}

.vision-enabled {
  background: rgba(0, 122, 255, 0.1) !important;
  color: rgba(0, 122, 255, 0.8) !important;
  font-weight: 500;
}

/* 消息图像样式 */
.message-images {
  margin-bottom: var(--spacing-3);
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--spacing-2);
  max-width: 400px;
}

.message-image {
  position: relative;
  aspect-ratio: 1;
  border-radius: var(--radius-medium);
  overflow: hidden;
  border: 1px solid var(--gray-200);
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-out);
}

.message-image:hover {
  transform: scale(1.02);
}

.message-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.message-user .message-image {
  border-color: rgba(255, 255, 255, 0.3);
}

/* 快速操作 */
.quick-actions {
  display: flex;
  gap: var(--spacing-2);
  flex-wrap: wrap;
}

.quick-action {
  padding: 4px 8px;
  font-size: 12px;
  background: var(--gray-100);
  color: var(--gray-600);
  border: none;
  border-radius: var(--radius-small);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}

.quick-action:hover {
  background: var(--gray-200);
  color: var(--primary-black);
}

.image-content img {
  max-width: 200px;
  max-height: 200px;
  border-radius: var(--radius-small);
  border: 1px solid var(--gray-200);
}

.resource-content a {
  color: var(--accent-blue);
  text-decoration: none;
  font-size: 13px;
}

.resource-content a:hover {
  text-decoration: underline;
}

/* 中断按钮样式 */
.btn-danger {
  background: rgba(255, 59, 48, 0.9);
  color: white;
  border: 1px solid rgba(255, 59, 48, 0.3);
}

.btn-danger:hover:not(:disabled) {
  background: rgba(255, 59, 48, 1);
  border-color: rgba(255, 59, 48, 0.5);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(255, 59, 48, 0.3);
}

.btn-danger:active {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(255, 59, 48, 0.3);
}

</style>