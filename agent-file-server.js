const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001;
const AGENTS_DIR = path.join(__dirname, 'public/data/agents');

app.use(cors());
app.use(express.json());

// 获取所有智能体
app.get('/api/agents', async (req, res) => {
  try {
    const files = await fs.readdir(AGENTS_DIR);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    const agents = [];
    
    for (const file of jsonFiles) {
      const filePath = path.join(AGENTS_DIR, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const agent = JSON.parse(content);
      agents.push(agent);
    }
    
    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建新智能体
app.post('/api/agents', async (req, res) => {
  try {
    const agent = req.body;
    const filename = `${agent.id}.json`;
    const filePath = path.join(AGENTS_DIR, filename);
    
    await fs.writeFile(filePath, JSON.stringify(agent, null, 2));
    res.json({ success: true, message: '智能体创建成功', data: agent });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 更新智能体
app.put('/api/agents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const agent = req.body;
    const filename = `${id}.json`;
    const filePath = path.join(AGENTS_DIR, filename);
    
    await fs.writeFile(filePath, JSON.stringify(agent, null, 2));
    res.json({ success: true, message: '智能体更新成功', data: agent });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 删除智能体
app.delete('/api/agents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const filename = `${id}.json`;
    const filePath = path.join(AGENTS_DIR, filename);
    
    await fs.unlink(filePath);
    res.json({ success: true, message: '智能体删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`智能体文件服务器运行在 http://localhost:${PORT}`);
});