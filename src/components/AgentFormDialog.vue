<template>
  <div v-if="visible" class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog-content">
      <div class="dialog-header">
        <h2 class="dialog-title">
          {{ agent ? '编辑智能体' : '创建智能体' }}
        </h2>
        <button class="close-btn" @click="$emit('close')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="dialog-body">
        <form @submit.prevent="handleSubmit">
          <div class="form-grid">
            <!-- 基本信息 -->
            <div class="form-section">
              <h3 class="section-title">基本信息</h3>
              
              <div class="form-field">
                <label class="field-label">名称 *</label>
                <input
                  v-model="formData.name"
                  type="text"
                  class="field-input"
                  :class="{ error: formErrors.name }"
                  placeholder="输入智能体名称"
                  required
                  @blur="validateField('name')"
                />
                <div v-if="formErrors.name" class="field-error">{{ formErrors.name }}</div>
              </div>
              
              <div class="form-field">
                <label class="field-label">分类 *</label>
                <select 
                  v-model="formData.category" 
                  class="field-select" 
                  :class="{ error: formErrors.category }"
                  required
                  @change="validateField('category')"
                >
                  <option value="">选择分类</option>
                  <option value="通用">通用</option>
                  <option value="技术">技术</option>
                  <option value="教育">教育</option>
                  <option value="创作">创作</option>
                  <option value="商务">商务</option>
                  <option value="娱乐">娱乐</option>
                  <option value="其他">其他</option>
                </select>
                <div v-if="formErrors.category" class="field-error">{{ formErrors.category }}</div>
              </div>
              
              <div class="form-field">
                <label class="field-label">描述 *</label>
                <textarea
                  v-model="formData.description"
                  class="field-textarea"
                  :class="{ error: formErrors.description }"
                  placeholder="描述智能体的功能和特点"
                  rows="3"
                  required
                  @blur="validateField('description')"
                ></textarea>
                <div v-if="formErrors.description" class="field-error">{{ formErrors.description }}</div>
              </div>
              
              <div class="form-field">
                <label class="field-label">标签</label>
                <div class="tags-input">
                  <div class="tags-list">
                    <span
                      v-for="(tag, index) in formData.tags"
                      :key="index"
                      class="tag-item"
                    >
                      {{ tag }}
                      <button
                        type="button"
                        class="tag-remove"
                        @click="removeTag(index)"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <line x1="18" y1="6" x2="6" y2="18"/>
                          <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </span>
                  </div>
                  <input
                    v-model="newTag"
                    type="text"
                    class="tag-input"
                    placeholder="添加标签，按Enter确认"
                    @keydown.enter.prevent="addTag"
                  />
                </div>
              </div>
            </div>

            <!-- 系统提示 -->
            <div class="form-section full-width">
              <h3 class="section-title">系统提示词</h3>
              
              <div class="form-field">
                <label class="field-label">提示词 *</label>
                <textarea
                  v-model="formData.systemPrompt"
                  class="field-textarea large"
                  :class="{ error: formErrors.systemPrompt }"
                  placeholder="输入系统提示词，定义智能体的行为和角色"
                  rows="8"
                  required
                  @blur="validateField('systemPrompt')"
                ></textarea>
                <div v-if="formErrors.systemPrompt" class="field-error">{{ formErrors.systemPrompt }}</div>
                <div class="field-help">
                  系统提示词将在每次对话开始时发送给AI模型，用于定义智能体的角色、行为方式和回答风格。
                </div>
              </div>
            </div>

            <!-- 配置参数 -->
            <div class="form-section">
              <h3 class="section-title">生成配置</h3>
              
              <div class="form-field">
                <label class="field-label">
                  温度 (Temperature)
                  <span class="field-value">{{ formData.config.temperature }}</span>
                </label>
                <input
                  v-model.number="formData.config.temperature"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  class="field-range"
                />
                <div class="field-help">
                  控制输出的随机性。值越高越有创意，值越低越确定。
                </div>
              </div>
              
              <div class="form-field">
                <label class="field-label">最大Token数</label>
                <input
                  v-model.number="formData.config.maxTokens"
                  type="number"
                  min="100"
                  max="8192"
                  step="100"
                  class="field-input"
                  :class="{ error: formErrors.maxTokens }"
                  placeholder="4000"
                  @blur="validateField('maxTokens')"
                />
                <div v-if="formErrors.maxTokens" class="field-error">{{ formErrors.maxTokens }}</div>
                <div class="field-help">
                  限制单次回答的最大长度。
                </div>
              </div>
              
              <div class="form-field">
                <label class="field-label">
                  Top-P
                  <span class="field-value">{{ formData.config.topP }}</span>
                </label>
                <input
                  v-model.number="formData.config.topP"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  class="field-range"
                />
                <div class="field-help">
                  核采样参数。控制输出的多样性。
                </div>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="$emit('close')">
              取消
            </button>
            <button type="submit" class="btn btn-primary" :disabled="!isFormValid || loading">
              <div v-if="loading" class="loading-spinner"></div>
              {{ loading ? '处理中...' : (agent ? '保存更改' : '创建智能体') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { Agent, AgentFormData, AgentCategory } from '@/types/agent'

// Props
interface Props {
  visible: boolean
  agent?: Agent | null
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  agent: null,
  loading: false
})

// Emits
const emit = defineEmits<{
  'close': []
  'save': [formData: AgentFormData]
}>()

// 响应式数据
const formData = reactive<AgentFormData>({
  name: '',
  description: '',
  avatar: '👤',
  systemPrompt: '',
  category: '' as AgentCategory,
  tags: [],
  config: {
    temperature: 0.7,
    maxTokens: 4000,
    topP: 0.9
  }
})

const newTag = ref('')
const formErrors = reactive({
  name: '',
  description: '',
  systemPrompt: '',
  category: '',
  maxTokens: ''
})

// 计算属性
const isFormValid = computed(() => {
  return !!(
    formData.name.trim() &&
    formData.description.trim() &&
    formData.systemPrompt.trim() &&
    formData.category &&
    !hasErrors.value
  )
})

const hasErrors = computed(() => {
  return Object.values(formErrors).some(error => error !== '')
})

// 方法定义（必须在 watch 之前）
const clearErrors = () => {
  formErrors.name = ''
  formErrors.description = ''
  formErrors.systemPrompt = ''
  formErrors.category = ''
  formErrors.maxTokens = ''
}

const resetForm = () => {
  formData.name = ''
  formData.description = ''
  formData.avatar = '👤'
  formData.systemPrompt = ''
  formData.category = '' as AgentCategory
  formData.tags = []
  formData.config = {
    temperature: 0.7,
    maxTokens: 4000,
    topP: 0.9
  }
  clearErrors()
}

// 监听visible变化，重置错误状态
watch(() => props.visible, (newVisible) => {
  console.log('AgentFormDialog visible 变化:', newVisible)
  if (newVisible) {
    clearErrors()
  }
}, { immediate: true })

// 监听agent变化，初始化表单数据
watch(() => props.agent, (newAgent) => {
  if (newAgent) {
    // 编辑模式，填充现有数据
    formData.name = newAgent.name
    formData.description = newAgent.description
    formData.avatar = newAgent.avatar
    formData.systemPrompt = newAgent.systemPrompt
    formData.category = newAgent.category as AgentCategory
    formData.tags = [...newAgent.tags]
    formData.config = { ...newAgent.config }
  } else {
    // 创建模式，重置表单
    resetForm()
  }
}, { immediate: true })

const validateField = (field: keyof typeof formErrors) => {
  // 只清除当前字段的错误
  formErrors[field] = ''
  
  switch (field) {
    case 'name':
      if (!formData.name.trim()) {
        formErrors.name = '名称不能为空'
      } else if (formData.name.length > 50) {
        formErrors.name = '名称不能超过50个字符'
      }
      break
    case 'description':
      if (!formData.description.trim()) {
        formErrors.description = '描述不能为空'
      } else if (formData.description.length > 200) {
        formErrors.description = '描述不能超过200个字符'
      }
      break
    case 'systemPrompt':
      if (!formData.systemPrompt.trim()) {
        formErrors.systemPrompt = '系统提示词不能为空'
      } else if (formData.systemPrompt.length > 2000) {
        formErrors.systemPrompt = '系统提示词不能超过2000个字符'
      }
      break
    case 'category':
      if (!formData.category) {
        formErrors.category = '请选择分类'
      }
      break
    case 'maxTokens':
      if (formData.config.maxTokens < 100 || formData.config.maxTokens > 8192) {
        formErrors.maxTokens = 'Token数必须在100-8192之间'
      }
      break
  }
}

const validateForm = () => {
  validateField('name')
  validateField('description')
  validateField('systemPrompt')
  validateField('category')
  validateField('maxTokens')
  return !hasErrors.value
}

const addTag = () => {
  const tag = newTag.value.trim()
  if (tag && !formData.tags.includes(tag)) {
    formData.tags.push(tag)
    newTag.value = ''
  }
}

const removeTag = (index: number) => {
  formData.tags.splice(index, 1)
}

const handleSubmit = () => {
  if (!validateForm()) return
  
  emit('save', { ...formData })
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--spacing-4);
}

.dialog-content {
  background: var(--primary-white);
  border-radius: var(--radius-large);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-5);
  border-bottom: 1px solid var(--gray-200);
  flex-shrink: 0;
}

.dialog-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--primary-black);
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: var(--radius-small);
  color: var(--gray-500);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: var(--gray-100);
  color: var(--primary-black);
}

.dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-5);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-6);
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.form-section.full-width {
  grid-column: 1 / -1;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--primary-black);
  margin: 0 0 var(--spacing-2) 0;
  padding-bottom: var(--spacing-2);
  border-bottom: 2px solid var(--gray-100);
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.field-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--primary-black);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.field-value {
  font-size: 12px;
  color: var(--gray-500);
  background: var(--gray-100);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}

.field-input,
.field-select {
  padding: 10px 12px;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-small);
  font-size: 14px;
  background: var(--primary-white);
  color: var(--primary-black);
  transition: border-color 0.2s ease;
}

.field-input:focus,
.field-select:focus {
  outline: none;
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.1);
}

.field-input.error,
.field-select.error,
.field-textarea.error {
  border-color: #ef4444;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.1);
}

.field-textarea {
  padding: 10px 12px;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-small);
  font-size: 14px;
  background: var(--primary-white);
  color: var(--primary-black);
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  line-height: 1.5;
  transition: border-color 0.2s ease;
}

.field-textarea:focus {
  outline: none;
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.1);
}

.field-textarea.large {
  min-height: 200px;
}

.field-range {
  -webkit-appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: var(--gray-200);
  outline: none;
  cursor: pointer;
}

.field-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--accent-blue);
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.field-range::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--accent-blue);
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.field-help {
  font-size: 12px;
  color: var(--gray-500);
  line-height: 1.4;
}

.field-error {
  font-size: 12px;
  color: #ef4444;
  line-height: 1.4;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.tags-input {
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-small);
  padding: var(--spacing-2);
  background: var(--primary-white);
  min-height: 80px;
}

.tags-input:focus-within {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.1);
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-2);
}

.tag-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: 4px 8px;
  background: var(--accent-blue);
  color: white;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.tag-remove {
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.tag-remove:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.tag-input {
  border: none;
  outline: none;
  font-size: 14px;
  flex: 1;
  min-width: 120px;
  background: transparent;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-3);
  margin-top: var(--spacing-6);
  padding-top: var(--spacing-4);
  border-top: 1px solid var(--gray-200);
}

.btn {
  padding: 10px 20px;
  border-radius: var(--radius-small);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.btn-secondary {
  background: var(--gray-100);
  color: var(--gray-700);
}

.btn-secondary:hover {
  background: var(--gray-200);
}

.btn-primary {
  background: var(--accent-blue);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-primary:disabled {
  background: var(--gray-300);
  cursor: not-allowed;
}

.loading-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: var(--spacing-2);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .dialog-overlay {
    padding: var(--spacing-2);
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .dialog-body {
    padding: var(--spacing-4);
  }
}
</style>