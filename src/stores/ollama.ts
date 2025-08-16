import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ollamaService } from '@/services/ollama'
import type {
  OllamaModel,
  OllamaRunningModel,
  OllamaChatMessage,
  ConversationHistory,
  ModelPerformanceMetrics,
  AppSettings
} from '@/types/ollama'

export const useOllamaStore = defineStore('ollama', () => {
  // 状态
  const models = ref<OllamaModel[]>([])
  const runningModels = ref<OllamaRunningModel[]>([])
  const selectedModel = ref<string>('')
  const conversations = ref<ConversationHistory[]>([])
  const currentConversation = ref<ConversationHistory | null>(null)
  const isLoading = ref(false)
  const isConnected = ref(false)
  const performanceMetrics = ref<ModelPerformanceMetrics[]>([])
  
  // 模型详细信息和能力记录
  const modelDetails = ref<Record<string, { info: any, capabilities: string[] }>>({})
  
  // 自动重连相关状态
  const isReconnecting = ref(false)
  const reconnectAttempts = ref(0)
  const maxReconnectAttempts = ref(5)
  const reconnectInterval = ref(3000) // 3秒
  const lastConnectionError = ref<string | null>(null)
  
  // 健康检查相关状态
  const healthCheckInterval = ref(30000) // 30秒
  const healthCheckTimer = ref<NodeJS.Timeout | null>(null)
  const isHealthCheckRunning = ref(false)
  
  // 对话清理相关状态
  const cleanupInterval = ref(24 * 60 * 60 * 1000) // 24小时
  const cleanupTimer = ref<NodeJS.Timeout | null>(null)
  const lastCleanupTime = ref<number>(0)
  
  const settings = ref<AppSettings>({
    appearance: {
      theme: 'auto'
    },
    defaultModel: '',
    defaultOptions: {
      temperature: 0.7,
      top_k: 40,
      top_p: 0.9,
      num_predict: 2048
    },
    autoSave: true,
    showMetrics: true,
    autoReconnect: true,
    healthCheck: true,
    cleanupDays: 30,
    enableThinking: false,
    // 多模态默认设置
    multimodal: {
      maxImageSize: 5120, // 5MB
      allowedFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      maxImages: 5,
      enableImagePreview: true,
      compressImages: true,
      imageQuality: 0.8
    }
  })

  // 计算属性
  const availableModels = computed(() => models.value || [])
  const activeModel = computed(() => 
    runningModels.value.find(m => m.name === selectedModel.value)
  )
  const currentMessages = computed(() => 
    currentConversation.value?.messages || []
  )
  const averageResponseTime = computed(() => {
    if (performanceMetrics.value.length === 0) return 0
    const sum = performanceMetrics.value.reduce((acc, metric) => acc + metric.responseTime, 0)
    return sum / performanceMetrics.value.length
  })

  // Actions
  async function fetchModels() {
    try {
      isLoading.value = true
      const response = await ollamaService.getModels()
      models.value = response.models
      
      // 获取每个模型的详细信息和能力
      console.log('正在获取模型详细信息和能力...')
      const modelInfoPromises = models.value.map(async (model) => {
        try {
          const info = await ollamaService.getModelInfo(model.name)
          const capabilities = info.capabilities || []
          
          // 记录模型详细信息，将info作为完整的模型信息存储
          modelDetails.value[model.name] = {
            info,
            capabilities // 保持向后兼容性
          }
          
          console.log(`模型 ${model.name} API返回的能力:`, capabilities)
          if (capabilities.includes('thinking')) {
            console.log(`✓ 模型 ${model.name} 支持思考模式`)
          } else {
            console.log(`✗ 模型 ${model.name} 不支持思考模式`)
          }
          
          return { name: model.name, capabilities }
        } catch (error) {
          console.warn(`获取模型 ${model.name} 信息失败:`, error)
          // 设置空的能力列表
          modelDetails.value[model.name] = {
            info: null,
            capabilities: []
          }
          return { name: model.name, capabilities: [] }
        }
      })
      
      // 等待所有模型信息获取完成
      await Promise.all(modelInfoPromises)
      
      // 保存模型信息到本地存储
      saveModelDetails()
      
      // 设置默认模型
      if (models.value.length > 0 && !selectedModel.value) {
        selectedModel.value = settings.value.defaultModel || models.value[0].name
      }
    } catch (error) {
      console.error('Failed to fetch models:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function fetchRunningModels() {
    try {
      const response = await ollamaService.getRunningModels()
      runningModels.value = response.models
    } catch (error) {
      console.error('Failed to fetch running models:', error)
      throw error
    }
  }

  async function pullModel(modelName: string) {
    try {
      isLoading.value = true
      await ollamaService.pullModel(modelName)
      await fetchModels()
    } catch (error) {
      console.error('Failed to pull model:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function deleteModel(modelName: string) {
    try {
      isLoading.value = true
      await ollamaService.deleteModel(modelName)
      await fetchModels()
      
      // 如果删除的是当前选中的模型，切换到第一个可用模型
      if (selectedModel.value === modelName && models.value.length > 0) {
        selectedModel.value = models.value[0].name
      }
    } catch (error) {
      console.error('Failed to delete model:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function loadModel(modelName: string) {
    try {
      isLoading.value = true
      // 使用generate API来预加载模型
      await ollamaService.generate({
        model: modelName,
        prompt: '',
        stream: false
      })
      await fetchRunningModels()
    } catch (error) {
      console.error('Failed to load model:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function unloadModel(modelName: string) {
    try {
      isLoading.value = true
      // 使用generate API来卸载模型
      await ollamaService.generate({
        model: modelName,
        prompt: '',
        keep_alive: 0,
        stream: false
      })
      await fetchRunningModels()
    } catch (error) {
      console.error('Failed to unload model:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  function createNewConversation(model?: string): ConversationHistory {
    const conversation: ConversationHistory = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: 'New Conversation',
      model: model || selectedModel.value,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    
    conversations.value.unshift(conversation)
    currentConversation.value = conversation
    
    if (settings.value.autoSave) {
      saveConversations()
    }
    
    return conversation
  }

  function setCurrentConversation(conversationId: string) {
    const conversation = conversations.value.find(c => c.id === conversationId)
    if (conversation) {
      currentConversation.value = conversation
    }
  }

  function addMessage(message: OllamaChatMessage) {
    if (!currentConversation.value) {
      createNewConversation()
    }
    
    currentConversation.value!.messages.push(message)
    currentConversation.value!.updatedAt = Date.now()
    
    // 更新对话标题（使用第一条用户消息的前30个字符）
    if (message.role === 'user' && currentConversation.value!.title === 'New Conversation') {
      currentConversation.value!.title = message.content.substring(0, 30) + 
        (message.content.length > 30 ? '...' : '')
    }
    
    if (settings.value.autoSave) {
      saveConversations()
    }
  }

  function updateLastMessage(content: string) {
    if (!currentConversation.value || currentConversation.value.messages.length === 0) {
      return
    }
    
    const lastMessage = currentConversation.value.messages[currentConversation.value.messages.length - 1]
    lastMessage.content = content
    currentConversation.value.updatedAt = Date.now()
  }

  function updateLastMessageWithMetrics(content: string, metrics: { responseTime: number, tokensPerSecond: number, totalTokens: number, loadTime?: number }) {
    if (!currentConversation.value || currentConversation.value.messages.length === 0) {
      return
    }
    
    const lastMessage = currentConversation.value.messages[currentConversation.value.messages.length - 1]
    lastMessage.content = content
    lastMessage.metrics = metrics
    currentConversation.value.updatedAt = Date.now()
    
    // 触发保存
    if (settings.value.autoSave && content.trim()) {
      saveConversations()
    }
  }

  function updateLastMessageThinking(thinking: string) {
    if (!currentConversation.value || currentConversation.value.messages.length === 0) {
      return
    }
    
    const lastMessage = currentConversation.value.messages[currentConversation.value.messages.length - 1]
    lastMessage.thinking = thinking
    currentConversation.value.updatedAt = Date.now()
  }


  function deleteConversation(conversationId: string) {
    const index = conversations.value.findIndex(c => c.id === conversationId)
    if (index !== -1) {
      conversations.value.splice(index, 1)
      
      if (currentConversation.value?.id === conversationId) {
        currentConversation.value = conversations.value[0] || null
      }
      
      if (settings.value.autoSave) {
        saveConversations()
      }
    }
  }

  function clearConversations() {
    conversations.value = []
    currentConversation.value = null
    
    if (settings.value.autoSave) {
      saveConversations()
    }
  }

  function addPerformanceMetric(metric: ModelPerformanceMetrics) {
    performanceMetrics.value.push(metric)
    
    // 只保留最近100条记录
    if (performanceMetrics.value.length > 100) {
      performanceMetrics.value.shift()
    }
  }

  function setSelectedModel(modelName: string) {
    selectedModel.value = modelName
    settings.value.defaultModel = modelName
    saveSettings()
  }

  function updateSettings(newSettings: Partial<AppSettings>) {
    settings.value = Object.assign({}, settings.value, newSettings)
    saveSettings()
  }

  // 检查模型是否支持思考模式
  function checkModelSupportsThinking(modelName: string): boolean {
    // 首先检查是否有模型详细信息
    const modelDetail = modelDetails.value[modelName]
    if (modelDetail && modelDetail.info) {
      // 基于实际的 capabilities 信息判断 - 根据API文档，capabilities 应该包含 'thinking'
      const capabilities = modelDetail.info.capabilities || []
      const supportsThinking = capabilities.includes('thinking')
      
      console.log(`模型 ${modelName} 基于API能力检测支持思考模式: ${supportsThinking}`)
      console.log(`模型 ${modelName} 的完整能力列表:`, capabilities)
      
      // 如果API信息中有能力列表，优先使用API结果
      if (Array.isArray(capabilities) && capabilities.length > 0) {
        return supportsThinking
      }
    }
    
    // 如果API信息不完整，检查之前的手动记录（错误重试时的记录）
    const storedCapability = JSON.parse(localStorage.getItem('ollama-model-capabilities') || '{}')[modelName]
    if (storedCapability !== undefined) {
      console.log(`模型 ${modelName} 使用本地记录的能力信息: ${storedCapability.supportsThinking}`)
      return storedCapability.supportsThinking
    }
    
    // 对于完全未知的模型，采用保守策略：默认不支持，避免API错误
    console.log(`模型 ${modelName} 没有能力信息，默认不支持思考模式以避免API错误`)
    return false
  }

  // 检查模型是否支持特定功能
  function checkModelCapability(modelName: string, capability: string): boolean {
    const modelDetail = modelDetails.value[modelName]
    if (modelDetail && modelDetail.info && modelDetail.info.capabilities) {
      return modelDetail.info.capabilities.includes(capability)
    }
    return false
  }

  // 获取模型所有能力
  function getModelCapabilities(modelName: string): string[] {
    const modelDetail = modelDetails.value[modelName]
    return modelDetail?.info?.capabilities || []
  }

  // 手动记录模型思考能力（用于错误处理时的更新）
  function setModelThinkingCapability(modelName: string, supportsThinking: boolean) {
    // 更新本地存储的能力记录
    const stored = JSON.parse(localStorage.getItem('ollama-model-capabilities') || '{}')
    stored[modelName] = { supportsThinking }
    localStorage.setItem('ollama-model-capabilities', JSON.stringify(stored))
    
    console.log(`手动记录模型 ${modelName} 思考能力: ${supportsThinking}`)
  }

  // 本地存储
  function saveConversations() {
    try {
      localStorage.setItem('ollama-conversations', JSON.stringify(conversations.value))
    } catch (error) {
      console.error('Failed to save conversations:', error)
    }
  }

  function loadConversations() {
    try {
      const saved = localStorage.getItem('ollama-conversations')
      if (saved) {
        conversations.value = JSON.parse(saved)
        if (conversations.value.length > 0 && !currentConversation.value) {
          currentConversation.value = conversations.value[0]
        }
      }
    } catch (error) {
      console.error('Failed to load conversations:', error)
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem('ollama-settings', JSON.stringify(settings.value))
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  function loadSettings() {
    try {
      const saved = localStorage.getItem('ollama-settings')
      if (saved) {
        settings.value = Object.assign({}, settings.value, JSON.parse(saved))
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  function saveModelDetails() {
    try {
      localStorage.setItem('ollama-model-details', JSON.stringify(modelDetails.value))
    } catch (error) {
      console.error('Failed to save model details:', error)
    }
  }

  function loadModelDetails() {
    try {
      const saved = localStorage.getItem('ollama-model-details')
      if (saved) {
        modelDetails.value = JSON.parse(saved)
      }
    } catch (error) {
      console.error('Failed to load model details:', error)
    }
  }

  // 检查连接状态
  async function checkConnection() {
    try {
      await ollamaService.getVersion()
      isConnected.value = true
      lastConnectionError.value = null
      reconnectAttempts.value = 0
    } catch (error) {
      isConnected.value = false
      lastConnectionError.value = error instanceof Error ? error.message : '连接失败'
      console.error('Ollama connection failed:', error)
      
      // 如果启用自动重连，开始重连尝试
      if (settings.value.autoReconnect && !isReconnecting.value) {
        await startAutoReconnect()
      }
    }
  }

  // 自动重连逻辑
  async function startAutoReconnect() {
    if (isReconnecting.value || reconnectAttempts.value >= maxReconnectAttempts.value) {
      return
    }

    isReconnecting.value = true
    
    while (reconnectAttempts.value < maxReconnectAttempts.value && !isConnected.value) {
      reconnectAttempts.value++
      console.log(`尝试重新连接... (${reconnectAttempts.value}/${maxReconnectAttempts.value})`)
      
      // 等待重连间隔
      await new Promise(resolve => setTimeout(resolve, reconnectInterval.value))
      
      try {
        await ollamaService.getVersion()
        isConnected.value = true
        lastConnectionError.value = null
        reconnectAttempts.value = 0
        console.log('重新连接成功！')
        
        // 重连成功后，重新获取模型信息
        if (isConnected.value) {
          await fetchModels()
          await fetchRunningModels()
        }
        break
      } catch (error) {
        lastConnectionError.value = error instanceof Error ? error.message : '重连失败'
        console.error(`重连尝试 ${reconnectAttempts.value} 失败:`, error)
      }
    }
    
    isReconnecting.value = false
    
    if (!isConnected.value) {
      console.error(`自动重连失败，已达到最大重试次数 (${maxReconnectAttempts.value})`)
    }
  }

  // 手动重连
  async function manualReconnect() {
    reconnectAttempts.value = 0
    isReconnecting.value = false
    await checkConnection()
  }

  // 停止自动重连
  function stopAutoReconnect() {
    isReconnecting.value = false
  }

  // 健康检查相关方法
  async function performHealthCheck() {
    if (isHealthCheckRunning.value) {
      return
    }

    isHealthCheckRunning.value = true
    
    try {
      await ollamaService.getVersion()
      
      // 如果之前断线，现在重新连接成功
      if (!isConnected.value) {
        isConnected.value = true
        lastConnectionError.value = null
        reconnectAttempts.value = 0
        console.log('健康检查：连接已恢复')
        
        // 重新获取模型信息
        try {
          await fetchModels()
          await fetchRunningModels()
        } catch (error) {
          console.warn('健康检查：重新获取模型信息失败', error)
        }
      }
    } catch (error) {
      // 如果之前是连接状态，现在断线了
      if (isConnected.value) {
        isConnected.value = false
        lastConnectionError.value = error instanceof Error ? error.message : '健康检查失败'
        console.warn('健康检查：连接已断开', error)
        
        // 如果启用自动重连，开始重连
        if (settings.value.autoReconnect && !isReconnecting.value) {
          await startAutoReconnect()
        }
      }
    } finally {
      isHealthCheckRunning.value = false
    }
  }

  // 开始健康检查
  function startHealthCheck() {
    if (healthCheckTimer.value) {
      clearInterval(healthCheckTimer.value)
    }

    // 立即执行一次健康检查
    performHealthCheck()

    // 设置定期检查
    healthCheckTimer.value = setInterval(() => {
      performHealthCheck()
    }, healthCheckInterval.value)

    console.log(`健康检查已启动，间隔: ${healthCheckInterval.value / 1000}秒`)
  }

  // 停止健康检查
  function stopHealthCheck() {
    if (healthCheckTimer.value) {
      clearInterval(healthCheckTimer.value)
      healthCheckTimer.value = null
      console.log('健康检查已停止')
    }
  }

  // 重启健康检查（用于设置变化时）
  function restartHealthCheck() {
    stopHealthCheck()
    if (settings.value.healthCheck) {
      startHealthCheck()
    }
  }

  // 对话清理相关方法
  function cleanupExpiredConversations() {
    const now = Date.now()
    const cleanupDays = settings.value.cleanupDays || 30
    const maxAge = cleanupDays * 24 * 60 * 60 * 1000 // 转换为毫秒
    
    const initialCount = conversations.value.length
    const expiredConversations = conversations.value.filter(conv => {
      return (now - conv.updatedAt) > maxAge
    })

    if (expiredConversations.length > 0) {
      // 删除过期对话
      conversations.value = conversations.value.filter(conv => {
        return (now - conv.updatedAt) <= maxAge
      })

      // 如果当前对话被删除了，切换到最新的对话
      if (currentConversation.value && expiredConversations.some(conv => conv.id === currentConversation.value!.id)) {
        currentConversation.value = conversations.value.length > 0 ? conversations.value[0] : null
      }

      console.log(`清理了 ${expiredConversations.length} 个过期对话 (超过 ${cleanupDays} 天)`)
      
      // 保存更新后的对话列表
      if (settings.value.autoSave) {
        saveConversations()
      }
      
      lastCleanupTime.value = now
      return expiredConversations.length
    }

    lastCleanupTime.value = now
    return 0
  }

  // 开始自动清理
  function startAutoCleanup() {
    if (cleanupTimer.value) {
      clearInterval(cleanupTimer.value)
    }

    // 立即执行一次清理
    cleanupExpiredConversations()

    // 设置定期清理
    cleanupTimer.value = setInterval(() => {
      cleanupExpiredConversations()
    }, cleanupInterval.value)

    console.log(`自动清理已启动，间隔: ${cleanupInterval.value / (60 * 60 * 1000)}小时`)
  }

  // 停止自动清理
  function stopAutoCleanup() {
    if (cleanupTimer.value) {
      clearInterval(cleanupTimer.value)
      cleanupTimer.value = null
      console.log('自动清理已停止')
    }
  }

  // 获取过期对话统计
  function getExpiredConversationsStats() {
    const now = Date.now()
    const cleanupDays = settings.value.cleanupDays || 30
    const maxAge = cleanupDays * 24 * 60 * 60 * 1000
    
    const expiredCount = conversations.value.filter(conv => {
      return (now - conv.updatedAt) > maxAge
    }).length

    return {
      total: conversations.value.length,
      expired: expiredCount,
      cleanupDays
    }
  }

  // 初始化
  async function initialize() {
    loadSettings()
    loadConversations()
    loadModelDetails()
    await checkConnection()
    
    if (isConnected.value) {
      await fetchModels()
      await fetchRunningModels()
    }
    
    // 启动健康检查
    if (settings.value.healthCheck) {
      startHealthCheck()
    }
    
    // 启动自动清理
    startAutoCleanup()
  }

  return {
    // 状态
    models,
    runningModels,
    selectedModel,
    conversations,
    currentConversation,
    isLoading,
    isConnected,
    performanceMetrics,
    settings,
    
    // 自动重连状态
    isReconnecting,
    reconnectAttempts,
    maxReconnectAttempts,
    reconnectInterval,
    lastConnectionError,
    
    // 健康检查状态
    healthCheckInterval,
    isHealthCheckRunning,
    
    // 计算属性
    availableModels,
    activeModel,
    currentMessages,
    averageResponseTime,
    
    // Actions
    fetchModels,
    fetchRunningModels,
    pullModel,
    deleteModel,
    loadModel,
    unloadModel,
    createNewConversation,
    setCurrentConversation,
    addMessage,
    updateLastMessage,
    updateLastMessageWithMetrics,
    updateLastMessageThinking,
    deleteConversation,
    clearConversations,
    addPerformanceMetric,
    setSelectedModel,
    updateSettings,
    checkConnection,
    initialize,
    
    // 重连相关方法
    startAutoReconnect,
    manualReconnect,
    stopAutoReconnect,
    
    // 健康检查相关方法
    performHealthCheck,
    startHealthCheck,
    stopHealthCheck,
    restartHealthCheck,
    
    // 模型能力相关方法
    checkModelSupportsThinking,
    checkModelCapability,
    getModelCapabilities,
    setModelThinkingCapability,
    
    // 工具方法
    saveConversations,
    loadConversations,
    saveSettings,
    loadSettings,
    saveModelDetails,
    loadModelDetails
  }
})