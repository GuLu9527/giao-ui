/**
 * 智能体相关类型定义
 */

// 智能体配置接口
export interface AgentConfig {
  temperature: number
  maxTokens: number
  topP: number
  enableThinking?: boolean
}

// 智能体接口
export interface Agent {
  id: string
  name: string
  description: string
  avatar: string
  systemPrompt: string
  category: string
  tags: string[]
  isBuiltin: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  config: AgentConfig
}

// 智能体分类
export type AgentCategory = '通用' | '技术' | '教育' | '创作' | '商务' | '娱乐' | '其他'

// 智能体创建/编辑表单数据
export interface AgentFormData {
  name: string
  description: string
  avatar: string
  systemPrompt: string
  category: AgentCategory
  tags: string[]
  config: AgentConfig
}

// 智能体统计信息
export interface AgentStats {
  totalCount: number
  activeCount: number
  builtinCount: number
  customCount: number
  categoryCounts: Record<AgentCategory, number>
}

// 智能体搜索过滤条件
export interface AgentFilter {
  keyword?: string
  category?: AgentCategory
  tags?: string[]
  isActive?: boolean
  isBuiltin?: boolean
}

// 智能体排序选项
export type AgentSortBy = 'name' | 'category' | 'createdAt' | 'updatedAt'
export type AgentSortOrder = 'asc' | 'desc'

export interface AgentSort {
  by: AgentSortBy
  order: AgentSortOrder
}

// 智能体管理操作类型
export type AgentAction = 'create' | 'edit' | 'delete' | 'activate' | 'deactivate' | 'duplicate'

// 智能体文件操作结果
export interface AgentFileResult {
  success: boolean
  message: string
  data?: Agent
}