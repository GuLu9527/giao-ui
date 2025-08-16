# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 Vue 3 + TypeScript 的智能 AI 助手管理平台，集成 Ollama AI 模型。项目采用现代化的前端技术栈，提供智能对话和模型管理功能。

## 开发命令

```bash
# 开发服务器
npm run dev

# 构建生产版本  
npm run build

# 预览构建结果
npm run preview

# TypeScript 类型检查
npm run type-check
```

## 架构概述

### 核心技术栈
- **前端框架**: Vue 3 Composition API + TypeScript
- **构建工具**: Vite
- **状态管理**: Pinia stores
- **路由**: Vue Router
- **HTTP客户端**: Axios
- **图表**: ECharts + vue-echarts
- **实时通信**: Socket.io Client

### 项目结构
```
src/
├── stores/           # Pinia状态管理
│   └── ollama.ts    # Ollama模型和对话管理
├── services/         # API服务层
│   └── ollama.ts    # Ollama API封装
├── types/            # TypeScript类型定义
│   └── ollama.ts    # Ollama相关类型
├── views/            # 页面组件
│   ├── ChatView.vue      # 对话界面
│   ├── ModelsView.vue    # 模型管理
│   ├── DashboardView.vue # 监控面板
│   └── SettingsView.vue  # 设置页面
├── components/       # 可复用组件
└── composables/      # 组合式函数
```

### 核心架构模式

**状态管理层**: 使用 Pinia 进行状态管理，主要包含：
- `useOllamaStore`: 管理模型、对话历史、性能指标和连接状态

**服务层**: 封装外部 API 调用
- `ollamaService`: Ollama API 的完整封装，支持流式响应

**类型系统**: 完整的 TypeScript 类型定义
- Ollama API 响应类型和配置类型
- 应用内部状态和配置类型

### 关键功能模块

**对话系统 (`src/stores/ollama.ts`)**:
- 支持多模态输入（文本+图像）
- 流式响应处理
- 对话历史管理和持久化
- 思考模式支持（基于模型能力检测）
- 性能指标收集和分析

**模型管理**:
- 自动模型能力检测和缓存
- 运行状态监控
- 模型加载/卸载控制
- 健康检查和自动重连

## API 集成要点

### Ollama API 代理配置
开发环境通过 Vite 代理将 `/api/ollama` 请求转发到 `http://localhost:11434/api`。


## 开发注意事项

### 数据处理原则
- **100%真实数据**: 必须使用真实的文件数据，不允许任何模拟或假数据
- **错误透明性**: 出现错误时必须直接报错，不能用回退方案掩盖问题
- **文件依赖性**: 所有功能都应依赖实际的文件系统数据

### 界面设计原则
- **避免使用emoji表情**: 界面中应使用SVG图标替代emoji，确保跨平台一致性
- **文字排版**: 确保所有文字内容都在容器范围内，使用省略号处理溢出文本
- **响应式布局**: 组件应适配不同屏幕尺寸，文本应合理换行或截断

### 状态初始化顺序
1. Pinia 实例创建
2. Router 挂载
3. 应用挂载到 DOM

### 关键设计模式
- **响应式数据流**: 使用 Vue 3 Composition API 和 Pinia 进行状态管理
- **服务抽象层**: 通过 services 层抽象外部 API 调用
- **类型安全**: 严格的 TypeScript 配置，所有 API 响应都有类型定义

### 本地存储策略
- 对话历史: `ollama-conversations`
- 应用设置: `ollama-settings`  
- 模型详情: `ollama-model-details`

### 错误处理
- 连接失败时自动重连机制
- 健康检查和状态监控
- 直接报错，不使用错误降级处理

### UI/UX 设计原则
- **桌面端专用**: 所有界面和交互专为 PC 端设计，无需考虑移动端兼容性
- **大屏幕优化**: 充分利用桌面端屏幕空间，使用多列布局和宽松的间距
- **鼠标交互**: 丰富的悬停效果、工具提示和右键菜单支持
- **键盘快捷键**: 支持常用的桌面端键盘操作习惯

## 样式系统

项目采用 iOS 风格设计系统，专为桌面端（PC）优化：
- **主色调**: 黑白灰配色方案 + 功能色彩点缀
- **组件库**: 基于 CSS 变量的现代化组件样式
- **设计理念**: PC 桌面端优先，**不考虑移动端适配**
- **主题支持**: 自动/明亮/暗黑主题切换
- **布局**: 利用大屏幕空间，采用网格布局和多列设计
- **交互**: 丰富的悬停效果和过渡动画，适合鼠标操作