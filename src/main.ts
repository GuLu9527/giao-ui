import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'

import App from './App.vue'
import './style.css'
import './assets/themes.css'

// 创建应用实例
const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// 挂载应用
app.mount('#app')

// 应用启动后的初始化
async function initializeApp() {
  try {
    console.log('应用初始化完成')
  } catch (error) {
    console.error('应用初始化失败:', error)
  }
}

// 在DOM挂载后初始化
setTimeout(initializeApp, 100)