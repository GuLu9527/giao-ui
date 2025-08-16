import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 智能体文件服务器Vite插件
export function agentFileServerPlugin() {
  return {
    name: 'agent-file-server',
    configureServer(server) {
      const agentsDir = path.join(__dirname, '../public/data/agents')

      // 确保agents目录存在
      server.middlewares.use('/api/agents*', async (req, res, next) => {
        try {
          await fs.access(agentsDir)
        } catch {
          try {
            await fs.mkdir(agentsDir, { recursive: true })
          } catch (error) {
            console.error('无法创建agents目录:', error)
          }
        }
        next()
      })

      // GET /api/agents - 获取所有智能体
      server.middlewares.use('/api/agents', async (req, res, next) => {
        if (req.method !== 'GET') return next()

        try {
          const files = await fs.readdir(agentsDir)
          const jsonFiles = files.filter(file => file.endsWith('.json'))
          const agents = []

          for (const file of jsonFiles) {
            try {
              const filePath = path.join(agentsDir, file)
              const content = await fs.readFile(filePath, 'utf-8')
              const agent = JSON.parse(content)
              agents.push(agent)
            } catch (error) {
              console.warn(`跳过无效的智能体文件 ${file}:`, error.message)
            }
          }

          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
          res.statusCode = 200
          res.end(JSON.stringify(agents))
        } catch (error) {
          console.error('获取智能体列表失败:', error)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: error.message }))
        }
      })

      // POST /api/agents - 创建智能体
      server.middlewares.use('/api/agents', async (req, res, next) => {
        if (req.method !== 'POST') return next()

        let body = ''
        req.on('data', chunk => {
          body += chunk.toString()
        })

        req.on('end', async () => {
          try {
            const agent = JSON.parse(body)
            const filename = `${agent.id}.json`
            const filePath = path.join(agentsDir, filename)

            await fs.writeFile(filePath, JSON.stringify(agent, null, 2))

            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
            res.statusCode = 200
            res.end(JSON.stringify({
              success: true,
              message: '智能体创建成功',
              data: agent
            }))
          } catch (error) {
            console.error('创建智能体失败:', error)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              success: false,
              message: error.message
            }))
          }
        })
      })

      // PUT /api/agents/:id - 更新智能体
      server.middlewares.use(/^\/api\/agents\/([^\/]+)$/, async (req, res, next) => {
        if (req.method !== 'PUT') return next()

        const agentId = req.url.match(/^\/api\/agents\/([^\/]+)$/)[1]
        
        let body = ''
        req.on('data', chunk => {
          body += chunk.toString()
        })

        req.on('end', async () => {
          try {
            const agent = JSON.parse(body)
            const filename = `${agentId}.json`
            const filePath = path.join(agentsDir, filename)

            await fs.writeFile(filePath, JSON.stringify(agent, null, 2))

            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
            res.statusCode = 200
            res.end(JSON.stringify({
              success: true,
              message: '智能体更新成功',
              data: agent
            }))
          } catch (error) {
            console.error('更新智能体失败:', error)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              success: false,
              message: error.message
            }))
          }
        })
      })

      // DELETE /api/agents/:id - 删除智能体
      server.middlewares.use(/^\/api\/agents\/([^\/]+)$/, async (req, res, next) => {
        if (req.method !== 'DELETE') return next()

        const agentId = req.url.match(/^\/api\/agents\/([^\/]+)$/)[1]
        
        try {
          const filename = `${agentId}.json`
          const filePath = path.join(agentsDir, filename)

          await fs.unlink(filePath)

          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
          res.statusCode = 200
          res.end(JSON.stringify({
            success: true,
            message: '智能体删除成功'
          }))
        } catch (error) {
          console.error('删除智能体失败:', error)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            success: false,
            message: error.message
          }))
        }
      })

      // 处理预检请求 OPTIONS
      server.middlewares.use('/api/agents*', (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
          res.statusCode = 200
          res.end()
          return
        }
        next()
      })
    }
  }
}