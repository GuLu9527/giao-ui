import axios, { type AxiosResponse } from 'axios'
import type {
  OllamaModel,
  OllamaRunningModel,
  OllamaChatRequest,
  OllamaChatResponse,
  OllamaGenerateRequest,
  OllamaGenerateResponse,
  OllamaModelInfo,
  OllamaVersion
} from '@/types/ollama'

class OllamaService {
  private baseURL: string
  private abortControllers: Map<string, AbortController> = new Map()

  constructor(baseURL: string = 'http://localhost:11434/api') {
    this.baseURL = baseURL
  }

  // 生成聊天对话
  async chat(request: OllamaChatRequest): Promise<OllamaChatResponse> {
    const response: AxiosResponse<OllamaChatResponse> = await axios.post(
      `${this.baseURL}/chat`,
      request
    )
    return response.data
  }

  // 流式聊天对话
  async *chatStream(request: OllamaChatRequest, requestId?: string): AsyncGenerator<OllamaChatResponse> {
    // 生成唯一请求ID
    const id = requestId || `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // 创建AbortController
    const abortController = new AbortController()
    this.abortControllers.set(id, abortController)

    try {
      const response = await fetch(`${this.baseURL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...request, stream: true }),
        signal: abortController.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          // 检查是否已被中断
          if (abortController.signal.aborted) {
            throw new Error('Request was aborted')
          }

          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.trim()) {
              try {
                const data: OllamaChatResponse = JSON.parse(line)
                yield data
              } catch (e) {
                console.warn('Failed to parse stream chunk:', line)
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }
    } catch (error: any) {
      if (error.name === 'AbortError' || error.message === 'Request was aborted') {
        console.log(`Chat stream ${id} was aborted`)
        throw new Error('请求已被中断')
      }
      throw error
    } finally {
      // 清理AbortController
      this.abortControllers.delete(id)
    }
  }

  // 文本生成
  async generate(request: OllamaGenerateRequest): Promise<OllamaGenerateResponse> {
    const response: AxiosResponse<OllamaGenerateResponse> = await axios.post(
      `${this.baseURL}/generate`,
      request
    )
    return response.data
  }

  // 流式文本生成
  async *generateStream(request: OllamaGenerateRequest): AsyncGenerator<OllamaGenerateResponse> {
    const response = await fetch(`${this.baseURL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ...request, stream: true })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data: OllamaGenerateResponse = JSON.parse(line)
              yield data
            } catch (e) {
              console.warn('Failed to parse stream chunk:', line)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  // 获取本地模型列表
  async getModels(): Promise<{ models: OllamaModel[] }> {
    const response: AxiosResponse<{ models: OllamaModel[] }> = await axios.get(
      `${this.baseURL}/tags`
    )
    return response.data
  }

  // 获取运行中的模型
  async getRunningModels(): Promise<{ models: OllamaRunningModel[] }> {
    const response: AxiosResponse<{ models: OllamaRunningModel[] }> = await axios.get(
      `${this.baseURL}/ps`
    )
    return response.data
  }

  // 获取模型详细信息
  async getModelInfo(model: string, verbose: boolean = false): Promise<OllamaModelInfo> {
    const response: AxiosResponse<OllamaModelInfo> = await axios.post(
      `${this.baseURL}/show`,
      { model, verbose }
    )
    return response.data
  }

  // 下载模型
  async pullModel(model: string, insecure: boolean = false): Promise<void> {
    await axios.post(`${this.baseURL}/pull`, {
      model,
      insecure,
      stream: false
    })
  }

  // 流式下载模型（用于显示进度）
  async *pullModelStream(model: string, insecure: boolean = false): AsyncGenerator<any> {
    const response = await fetch(`${this.baseURL}/pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        insecure,
        stream: true
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line)
              yield data
            } catch (e) {
              console.warn('Failed to parse stream chunk:', line)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  // 删除模型
  async deleteModel(model: string): Promise<void> {
    await axios.delete(`${this.baseURL}/delete`, {
      data: { model }
    })
  }

  // 复制模型
  async copyModel(source: string, destination: string): Promise<void> {
    await axios.post(`${this.baseURL}/copy`, {
      source,
      destination
    })
  }

  // 创建模型
  async createModel(
    model: string, 
    from?: string, 
    files?: Record<string, string>,
    stream: boolean = false
  ): Promise<void> {
    await axios.post(`${this.baseURL}/create`, {
      model,
      from,
      files,
      stream
    })
  }

  // 生成嵌入向量
  async embed(model: string, input: string | string[], truncate: boolean = true): Promise<any> {
    const response: AxiosResponse<any> = await axios.post(
      `${this.baseURL}/embed`,
      {
        model,
        input,
        truncate
      }
    )
    return response.data
  }

  // 生成嵌入向量（已弃用的接口）
  async embeddings(model: string, prompt: string): Promise<any> {
    const response: AxiosResponse<any> = await axios.post(
      `${this.baseURL}/embeddings`,
      {
        model,
        prompt
      }
    )
    return response.data
  }

  // 获取版本信息
  async getVersion(): Promise<OllamaVersion> {
    const response: AxiosResponse<OllamaVersion> = await axios.get(
      `${this.baseURL}/version`
    )
    return response.data
  }

  // 中断聊天请求
  abortChatStream(requestId: string): boolean {
    const abortController = this.abortControllers.get(requestId)
    if (abortController) {
      abortController.abort()
      this.abortControllers.delete(requestId)
      console.log(`Aborted chat stream: ${requestId}`)
      return true
    }
    return false
  }

  // 中断所有活跃的请求
  abortAllRequests(): number {
    let abortedCount = 0
    for (const [id, controller] of this.abortControllers.entries()) {
      controller.abort()
      abortedCount++
    }
    this.abortControllers.clear()
    console.log(`Aborted ${abortedCount} active requests`)
    return abortedCount
  }

  // 获取活跃请求数量
  getActiveRequestCount(): number {
    return this.abortControllers.size
  }

  // 获取活跃请求ID列表
  getActiveRequestIds(): string[] {
    return Array.from(this.abortControllers.keys())
  }

}

export const ollamaService = new OllamaService()
export default OllamaService