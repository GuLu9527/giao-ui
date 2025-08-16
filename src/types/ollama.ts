// Ollama API类型定义

export interface OllamaModel {
  name: string
  model: string
  modified_at: string
  size: number
  digest: string
  details: {
    parent_model: string
    format: string
    family: string
    families: string[]
    parameter_size: string
    quantization_level: string
  }
}

export interface OllamaRunningModel {
  name: string
  model: string
  size: number
  digest: string
  details: OllamaModel['details']
  expires_at: string
  size_vram: number
}

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  images?: string[] // base64编码的图像数组，用于多模态模型
  tool_calls?: MCPToolCall[]
  tool_name?: string
  thinking?: string
  // 性能指标（仅限assistant消息）
  metrics?: {
    responseTime: number
    tokensPerSecond: number
    totalTokens: number
    loadTime?: number
  }
}

// MCP工具调用信息
export interface MCPToolCall {
  id: string
  name: string
  serviceId: string
  arguments: Record<string, any>
  response?: {
    content: Array<{
      type: 'text' | 'image' | 'resource'
      text?: string
      data?: string
    }>
    isError?: boolean
  }
}

export interface OllamaChatRequest {
  model: string
  messages: OllamaChatMessage[]
  tools?: any[]
  format?: any
  options?: {
    temperature?: number
    top_k?: number
    top_p?: number
    num_predict?: number
    seed?: number
    [key: string]: any
  }
  think?: boolean  // (for thinking models) should the model think before responding?
  stream?: boolean
  keep_alive?: string | number
}

export interface OllamaChatResponse {
  model: string
  created_at: string
  message: OllamaChatMessage
  done: boolean
  done_reason?: string
  total_duration?: number
  load_duration?: number
  prompt_eval_count?: number
  prompt_eval_duration?: number
  eval_count?: number
  eval_duration?: number
}

export interface OllamaGenerateRequest {
  model: string
  prompt: string
  suffix?: string
  images?: string[] // base64编码的图像数组，用于多模态模型
  format?: any
  options?: OllamaChatRequest['options']
  system?: string
  template?: string
  stream?: boolean
  raw?: boolean
  keep_alive?: string | number
  context?: number[]
}

export interface OllamaGenerateResponse {
  model: string
  created_at: string
  response: string
  done: boolean
  done_reason?: string
  context?: number[]
  total_duration?: number
  load_duration?: number
  prompt_eval_count?: number
  prompt_eval_duration?: number
  eval_count?: number
  eval_duration?: number
}

export interface OllamaModelInfo {
  modelfile: string
  parameters: string
  template: string
  details: OllamaModel['details']
  model_info: Record<string, any>
  capabilities?: string[]
}

export interface OllamaVersion {
  version: string
}

// 应用状态类型
export interface ModelPerformanceMetrics {
  responseTime: number
  tokensPerSecond: number
  totalTokens: number
  loadTime: number
  timestamp: number
}

export interface ConversationHistory {
  id: string
  title: string
  model: string
  messages: OllamaChatMessage[]
  createdAt: number
  updatedAt: number
}

// 图像处理相关类型
export interface ImageFile {
  id: string
  file: File
  base64: string
  preview: string // 预览URL
  size: number // 字节数
  type: string
  name: string
}

export interface ImageUploadOptions {
  maxSize: number // KB
  allowedTypes: string[]
  quality: number // 压缩质量 0-1
  maxWidth?: number
  maxHeight?: number
}

export interface AppSettings {
  appearance?: {
    theme: 'light' | 'dark' | 'auto'
  }
  defaultModel: string
  defaultOptions: OllamaChatRequest['options']
  autoSave: boolean
  showMetrics: boolean
  autoReconnect: boolean
  healthCheck: boolean
  cleanupDays: number
  enableThinking: boolean
  // 多模态相关设置
  multimodal?: {
    maxImageSize: number // KB
    allowedFormats: string[]
    maxImages: number
    enableImagePreview: boolean
    compressImages: boolean
    imageQuality: number // 0-1
  }
}