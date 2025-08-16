import { ref, computed, watch } from 'vue'
import { useOllamaStore } from '@/stores/ollama'

export type Theme = 'light' | 'dark' | 'auto'

export function useTheme() {
  const ollamaStore = useOllamaStore()

  // 检测系统主题偏好
  const systemPrefersDark = ref(
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  // 监听系统主题变化
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', (e) => {
      systemPrefersDark.value = e.matches
    })
  }

  // 计算当前实际主题
  const currentTheme = computed(() => {
    const setting = ollamaStore.settings.appearance?.theme || 'light'
    if (setting === 'auto') {
      return systemPrefersDark.value ? 'dark' : 'light'
    }
    return setting as 'light' | 'dark'
  })

  // 应用主题到DOM
  function applyTheme(theme: 'light' | 'dark') {
    const root = document.documentElement
    
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark')
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.setAttribute('data-theme', 'light')
      root.classList.add('light')
      root.classList.remove('dark')
    }
  }

  // 设置主题
  function setTheme(theme: Theme) {
    const currentSettings = ollamaStore.settings
    ollamaStore.updateSettings({
      appearance: {
        ...currentSettings.appearance,
        theme
      }
    })
  }

  // 切换主题
  function toggleTheme() {
    const current = ollamaStore.settings.appearance?.theme || 'light'
    if (current === 'light') {
      setTheme('dark')
    } else if (current === 'dark') {
      setTheme('auto')
    } else {
      setTheme('light')
    }
  }

  // 监听主题变化并应用
  watch(currentTheme, (newTheme) => {
    applyTheme(newTheme)
  }, { immediate: true })

  return {
    currentTheme,
    systemPrefersDark,
    setTheme,
    toggleTheme
  }
}