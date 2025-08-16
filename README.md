# Giao UI - 智能AI助手管理平台

基于 Vue 3 + TypeScript 的现代化AI助手管理平台，集成Ollama本地AI模型，提供流畅的对话体验和完整的模型管理功能。

## ✨ 核心特性

- 🎨 **现代化界面** - iOS风格设计，黑白灰简约配色
- 💬 **流式对话** - 实时AI对话，支持思考模式和多模态输入
- 🤖 **智能体系统** - 可自定义AI角色和行为模式
- 🔧 **模型管理** - 完整的Ollama模型生命周期管理
- 📊 **性能监控** - 实时响应时间和性能统计
- 🗂️ **对话管理** - 对话历史保存、搜索和组织
- ⚙️ **灵活配置** - 详细的AI参数调优选项
- 🖼️ **多模态支持** - 图像上传和视觉模型集成

## 🛠️ 技术栈

- **前端框架**: Vue 3 + TypeScript
- **构建工具**: Vite
- **状态管理**: Pinia
- **路由**: Vue Router
- **HTTP客户端**: Axios
- **图表库**: ECharts
- **实时通信**: Socket.io Client

## 🚀 开发环境设置

### 前置要求

- Node.js (>= 16)
- npm 或 yarn
- 本地运行的 Ollama 服务 (http://localhost:11434)

### 安装依赖

\`\`\`bash
npm install
\`\`\`

### 启动开发服务器

\`\`\`bash
npm run dev
\`\`\`

### 构建生产版本

\`\`\`bash
npm run build
\`\`\`

### 类型检查

\`\`\`bash
npm run type-check
\`\`\`

## 🏗️ 项目结构

\`\`\`
src/
├── components/          # 组件库
│   └── icons/          # SVG图标组件
├── router/             # 路由配置
├── services/           # API服务
├── stores/             # Pinia状态管理
├── types/              # TypeScript类型定义
├── views/              # 页面组件
├── style.css           # 全局样式
└── main.ts             # 应用入口

docs/
├── brief.md            # 项目简报
└── front-end-spec.md   # 前端设计规范
\`\`\`

## 📋 功能模块

### 1. 智能对话 (/chat)
- 🔄 **流式对话** - 实时AI响应，支持中断功能
- 🤔 **思考模式** - 显示AI思考过程，增强透明度
- 🖼️ **多模态输入** - 支持图像上传和视觉分析
- 🗂️ **对话历史** - 自动保存和管理对话记录
- ⚡ **快速操作** - 预设常用提示词和操作

### 2. 智能体管理 (/agents)
- 🤖 **角色定制** - 创建专业化AI助手角色
- ⚙️ **参数调优** - 精细控制温度、Top-P等参数
- 📝 **提示词工程** - 系统提示词编辑和优化
- 📂 **分类管理** - 按用途组织智能体
- 🔄 **导入导出** - 智能体配置的备份和分享

### 3. 模型管理 (/models)
- 📦 **模型库** - 浏览和下载Ollama模型
- 🔄 **生命周期** - 模型的拉取、加载、卸载和删除
- 📊 **运行状态** - 实时监控模型资源使用
- 🎯 **能力检测** - 自动识别模型功能特性
- 💾 **本地缓存** - 智能的模型信息缓存机制

### 4. 性能监控 (/dashboard)
- 📈 **实时指标** - 响应时间、吞吐量监控
- 📊 **使用统计** - 对话量、模型使用频率分析
- 🔍 **健康检查** - 自动检测连接状态和服务健康
- 📝 **历史趋势** - 长期性能数据可视化
- ⚠️ **异常监控** - 错误率和异常情况追踪

### 5. 系统设置 (/settings)
- 🎨 **界面设置** - 主题切换和布局自定义
- 🔧 **AI参数** - 全局AI模型参数配置
- 💾 **数据管理** - 对话数据的备份和清理
- 🔄 **自动化** - 自动保存、重连等功能开关
- 🖼️ **多模态** - 图像处理和上传相关设置

## 🔌 API集成

### Ollama API集成

应用通过以下方式与Ollama API集成：

- **开发环境**: 通过Vite代理转发到 \`http://localhost:11434\`
- **生产环境**: 需要配置反向代理或CORS设置

#### 支持的Ollama API端点

- \`/api/chat\` - 聊天对话
- \`/api/generate\` - 文本生成  
- \`/api/tags\` - 本地模型列表
- \`/api/ps\` - 运行中模型
- \`/api/pull\` - 下载模型
- \`/api/delete\` - 删除模型
- \`/api/show\` - 模型详情
- \`/api/version\` - 版本信息


## 🎨 设计系统

项目采用iOS风格设计系统：

- **色彩**: 黑白灰主色调，功能色彩点缀
- **字体**: 系统字体栈，确保跨平台一致性
- **间距**: 4px基础网格系统
- **圆角**: 6px-16px变化范围
- **阴影**: 分层深度系统
- **动画**: 自然流畅的缓动效果

## 🔧 配置选项

### 开发代理配置 (vite.config.ts)

\`\`\`typescript
server: {
  proxy: {
    '/api/ollama': {
      target: 'http://localhost:11434',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/ollama/, '/api')
    }
  }
}
\`\`\`

### TypeScript配置

项目使用严格的TypeScript配置，包括：
- 路径别名 (@/* 映射到 src/*)
- 严格类型检查
- Vue SFC支持

## 📦 部署

### 构建应用

\`\`\`bash
npm run build
\`\`\`

构建产物将输出到 \`dist/\` 目录。

### 部署要求

1. **静态文件服务**: 任何静态文件服务器
2. **API代理**: 需要配置到Ollama服务的代理
3. **HTTPS支持**: 推荐生产环境使用HTTPS

### Nginx配置示例

\`\`\`nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        root /path/to/dist;
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ollama {
        proxy_pass http://localhost:11434/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
\`\`\`

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (\`git checkout -b feature/amazing-feature\`)
3. 提交更改 (\`git commit -m 'Add some amazing feature'\`)
4. 推送到分支 (\`git push origin feature/amazing-feature\`)
5. 创建 Pull Request

## 📄 许可证

MIT License - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [Ollama](https://ollama.ai/) - 强大的本地AI模型运行时
- [Vue.js](https://vuejs.org/) - 渐进式JavaScript框架
- [Vite](https://vitejs.dev/) - 下一代前端构建工具

---

**开发者**: 基于现代前端开发最佳实践构建  
**更新时间**: 2025-08-16  
**版本**: v1.0-beta