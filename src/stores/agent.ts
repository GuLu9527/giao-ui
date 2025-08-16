import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { 
  Agent, 
  AgentFormData, 
  AgentFilter, 
  AgentSort, 
  AgentStats,
  AgentFileResult,
  AgentCategory
} from '@/types/agent'

/**
 * 智能体管理Store
 */
export const useAgentStore = defineStore('agent', () => {
  // 状态
  const agents = ref<Agent[]>([])
  const currentAgent = ref<Agent | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 计算属性
  const activeAgents = computed(() => 
    agents.value.filter(agent => agent.isActive)
  )

  const builtinAgents = computed(() => 
    agents.value.filter(agent => agent.isBuiltin)
  )

  const customAgents = computed(() => 
    agents.value.filter(agent => !agent.isBuiltin)
  )

  const agentStats = computed((): AgentStats => {
    const categoryCounts: Record<AgentCategory, number> = {
      '通用': 0,
      '技术': 0,
      '教育': 0,
      '创作': 0,
      '商务': 0,
      '娱乐': 0,
      '其他': 0
    }

    agents.value.forEach(agent => {
      const category = agent.category as AgentCategory
      if (category in categoryCounts) {
        categoryCounts[category]++
      }
    })

    return {
      totalCount: agents.value.length,
      activeCount: activeAgents.value.length,
      builtinCount: builtinAgents.value.length,
      customCount: customAgents.value.length,
      categoryCounts
    }
  })

  // 文件操作工具函数
  const readAgentFile = async (filePath: string): Promise<Agent | null> => {
    try {
      const response = await fetch(filePath)
      if (!response.ok) return null
      return await response.json()
    } catch (error) {
      console.error('读取智能体文件失败:', error)
      return null
    }
  }

  const writeAgentFile = async (agent: Agent, isUpdate = false): Promise<AgentFileResult> => {
    try {
      const endpoint = isUpdate ? `/api/agents/${agent.id}` : '/api/agents'
      const method = isUpdate ? 'PUT' : 'POST'
      
      // console.log(`正在${isUpdate ? '更新' : '创建'}智能体:`, endpoint, method)
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agent)
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      // console.log('智能体文件操作成功:', result)
      return result
    } catch (error) {
      // 如果API不可用，降级到下载方案
      console.warn('智能体API不可用，使用下载方案:', error)
      
      const dataStr = JSON.stringify(agent, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${agent.id}.json`
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      return {
        success: true,
        message: `API不可用。已下载 "${agent.id}.json"，请手动保存到 public/data/agents/ 文件夹中，然后刷新页面。`,
        data: agent
      }
    }
  }

  const deleteAgentFile = async (agentId: string): Promise<AgentFileResult> => {
    try {
      // console.log('正在删除智能体:', agentId)
      
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      // console.log('智能体删除成功:', result)
      return result
    } catch (error) {
      console.error('删除智能体失败:', error)
      return {
        success: false,
        message: `无法删除文件。请手动删除 public/data/agents/${agentId}.json 文件，然后刷新页面。`
      }
    }
  }

  // 加载所有智能体
  const loadAgents = async (): Promise<void> => {
    try {
      loading.value = true
      error.value = null

      // 首先尝试从集成的Vite API加载
      try {
        const response = await fetch('/api/agents')
        if (response.ok) {
          const loadedAgents = await response.json()
          agents.value = loadedAgents
          
          // 设置默认当前智能体
          if (!currentAgent.value && agents.value.length > 0) {
            currentAgent.value = agents.value[0]
          }
          
          console.log(`成功从集成API加载 ${loadedAgents.length} 个智能体配置`)
          return
        }
      } catch (apiError) {
        console.warn('集成API不可用，回退到静态文件加载:', apiError)
      }

      // 回退到静态文件加载
      const agentFiles = [
        'assistant.json',
        'programmer.json', 
        'teacher.json',
        'writer.json'
      ]

      const loadedAgents: Agent[] = []
      
      for (const filename of agentFiles) {
        try {
          const response = await fetch(`/data/agents/${filename}`)
          if (response.ok) {
            const agent = await response.json()
            loadedAgents.push(agent)
          } else {
            console.warn(`无法加载智能体文件: ${filename} (HTTP ${response.status})`)
          }
        } catch (fileError) {
          console.warn(`加载智能体文件 ${filename} 时出错:`, fileError)
        }
      }

      if (loadedAgents.length === 0) {
        throw new Error('未能加载任何智能体配置文件。请检查 public/data/agents/ 文件夹是否存在且包含有效的JSON文件。')
      }

      agents.value = loadedAgents
      
      // 设置默认当前智能体
      if (!currentAgent.value && agents.value.length > 0) {
        currentAgent.value = agents.value[0]
      }

      console.log(`成功从静态文件加载 ${loadedAgents.length} 个智能体配置`)

    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载智能体失败'
      console.error('智能体加载错误:', err)
      
      // 不提供任何假数据，保持空状态
      agents.value = []
      currentAgent.value = null
    } finally {
      loading.value = false
    }
  }

  // 筛选和排序智能体
  const getFilteredAgents = (filter?: AgentFilter, sort?: AgentSort): Agent[] => {
    let filtered = [...agents.value]

    if (filter) {
      if (filter.keyword) {
        const keyword = filter.keyword.toLowerCase()
        filtered = filtered.filter(agent => 
          agent.name.toLowerCase().includes(keyword) ||
          agent.description.toLowerCase().includes(keyword) ||
          agent.tags.some(tag => tag.toLowerCase().includes(keyword))
        )
      }

      if (filter.category) {
        filtered = filtered.filter(agent => agent.category === filter.category)
      }

      if (filter.tags && filter.tags.length > 0) {
        filtered = filtered.filter(agent => 
          filter.tags!.some(tag => agent.tags.includes(tag))
        )
      }

      if (filter.isActive !== undefined) {
        filtered = filtered.filter(agent => agent.isActive === filter.isActive)
      }

      if (filter.isBuiltin !== undefined) {
        filtered = filtered.filter(agent => agent.isBuiltin === filter.isBuiltin)
      }
    }

    if (sort) {
      filtered.sort((a, b) => {
        let aValue = a[sort.by]
        let bValue = b[sort.by]

        if (sort.by === 'createdAt' || sort.by === 'updatedAt') {
          aValue = new Date(aValue).getTime()
          bValue = new Date(bValue).getTime()
        }

        if (aValue < bValue) return sort.order === 'asc' ? -1 : 1
        if (aValue > bValue) return sort.order === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }

  // 获取智能体详情
  const getAgentById = (id: string): Agent | undefined => {
    return agents.value.find(agent => agent.id === id)
  }

  // 设置当前智能体
  const setCurrentAgent = (agent: Agent | null): void => {
    currentAgent.value = agent
    // 保存到localStorage
    if (agent) {
      localStorage.setItem('currentAgentId', agent.id)
    } else {
      localStorage.removeItem('currentAgentId')
    }
  }

  // 创建智能体
  const createAgent = async (formData: AgentFormData): Promise<AgentFileResult> => {
    try {
      const now = new Date().toISOString()
      const id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const newAgent: Agent = {
        id,
        ...formData,
        isBuiltin: false,
        isActive: true,
        createdAt: now,
        updatedAt: now
      }

      const result = await writeAgentFile(newAgent, false)
      if (result.success) {
        agents.value.push(newAgent)
        // 如果使用文件服务器成功，重新加载以获取最新状态
        if (!result.message.includes('下载')) {
          await loadAgents()
        }
      }
      
      return result
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : '创建智能体失败'
      }
    }
  }

  // 更新智能体
  const updateAgent = async (id: string, formData: AgentFormData): Promise<AgentFileResult> => {
    try {
      const agent = agents.value.find(a => a.id === id)
      if (!agent) {
        return {
          success: false,
          message: '智能体不存在'
        }
      }

      if (agent.isBuiltin) {
        return {
          success: false,
          message: '内置智能体不可编辑'
        }
      }

      const updatedAgent: Agent = {
        ...agent,
        ...formData,
        updatedAt: new Date().toISOString()
      }

      const result = await writeAgentFile(updatedAgent, true)
      if (result.success) {
        const index = agents.value.findIndex(a => a.id === id)
        if (index >= 0) {
          agents.value[index] = updatedAgent
        }
        
        // 如果更新的是当前智能体，同步更新
        if (currentAgent.value?.id === id) {
          currentAgent.value = updatedAgent
        }

        // 如果使用文件服务器成功，重新加载以获取最新状态
        if (!result.message.includes('下载')) {
          await loadAgents()
        }
      }
      
      return result
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : '更新智能体失败'
      }
    }
  }

  // 删除智能体
  const deleteAgent = async (id: string): Promise<AgentFileResult> => {
    try {
      const agent = agents.value.find(a => a.id === id)
      if (!agent) {
        return {
          success: false,
          message: '智能体不存在'
        }
      }

      if (agent.isBuiltin) {
        return {
          success: false,
          message: '内置智能体不可删除'
        }
      }

      const result = await deleteAgentFile(id)
      if (result.success) {
        agents.value = agents.value.filter(a => a.id !== id)
        
        // 如果删除的是当前智能体，切换到第一个可用智能体
        if (currentAgent.value?.id === id) {
          currentAgent.value = agents.value.length > 0 ? agents.value[0] : null
        }

        // 重新加载以获取最新状态
        await loadAgents()
      }
      
      return result
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : '删除智能体失败'
      }
    }
  }

  // 复制智能体
  const duplicateAgent = async (id: string): Promise<AgentFileResult> => {
    try {
      const sourceAgent = agents.value.find(a => a.id === id)
      if (!sourceAgent) {
        return {
          success: false,
          message: '源智能体不存在'
        }
      }

      const formData: AgentFormData = {
        name: `${sourceAgent.name} (副本)`,
        description: sourceAgent.description,
        avatar: sourceAgent.avatar,
        systemPrompt: sourceAgent.systemPrompt,
        category: sourceAgent.category as any,
        tags: [...sourceAgent.tags],
        config: { ...sourceAgent.config }
      }

      return await createAgent(formData)
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : '复制智能体失败'
      }
    }
  }

  // 激活/停用智能体
  const toggleAgentActive = async (id: string): Promise<AgentFileResult> => {
    try {
      const agent = agents.value.find(a => a.id === id)
      if (!agent) {
        return {
          success: false,
          message: '智能体不存在'
        }
      }

      const updatedAgent: Agent = {
        ...agent,
        isActive: !agent.isActive,
        updatedAt: new Date().toISOString()
      }

      const result = await writeAgentFile(updatedAgent, true)
      if (result.success) {
        const index = agents.value.findIndex(a => a.id === id)
        if (index >= 0) {
          agents.value[index] = updatedAgent
        }
        
        // 如果停用的是当前智能体，切换到第一个激活的智能体
        if (currentAgent.value?.id === id && !updatedAgent.isActive) {
          const activeAgent = agents.value.find(a => a.isActive && a.id !== id)
          currentAgent.value = activeAgent || null
        }
      }
      
      return result
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : '操作失败'
      }
    }
  }

  // 初始化
  const initialize = async (): Promise<void> => {
    await loadAgents()
    
    // 恢复上次选择的智能体
    const savedAgentId = localStorage.getItem('currentAgentId')
    if (savedAgentId) {
      const savedAgent = getAgentById(savedAgentId)
      if (savedAgent && savedAgent.isActive) {
        currentAgent.value = savedAgent
      }
    }
  }

  return {
    // 状态
    agents,
    currentAgent,
    loading,
    error,
    
    // 计算属性
    activeAgents,
    builtinAgents,
    customAgents,
    agentStats,
    
    // 方法
    initialize,
    loadAgents,
    getFilteredAgents,
    getAgentById,
    setCurrentAgent,
    createAgent,
    updateAgent,
    deleteAgent,
    duplicateAgent,
    toggleAgentActive
  }
})