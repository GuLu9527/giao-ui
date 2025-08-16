<template>
  <div class="image-upload">
    <!-- 拖拽上传区域 -->
    <div 
      class="upload-zone"
      :class="{ 
        'drag-over': isDragOver,
        'has-images': images.length > 0
      }"
      @dragover.prevent="handleDragOver"
      @dragleave.prevent="handleDragLeave" 
      @drop.prevent="handleDrop"
      @click="triggerFileInput"
    >
      <input
        ref="fileInput"
        type="file"
        multiple
        accept="image/*"
        @change="handleFileSelect"
        class="file-input"
      />
      
      <div v-if="images.length === 0" class="upload-placeholder">
        <IconImage class="upload-icon" />
        <p class="upload-text">点击或拖拽图片到此处</p>
        <p class="upload-hint">支持 JPG、PNG、WebP、GIF 格式</p>
      </div>
      
      <!-- 图片预览列表 -->
      <div v-if="images.length > 0" class="image-list">
        <div 
          v-for="(image, index) in images" 
          :key="image.id"
          class="image-item"
        >
          <div class="image-preview">
            <img :src="image.preview" :alt="image.name" />
            <div class="image-overlay">
              <button 
                @click.stop="removeImage(index)"
                class="remove-btn"
                :title="'移除图片'"
              >
                <IconClose />
              </button>
            </div>
          </div>
          <div class="image-info">
            <span class="image-name">{{ image.name }}</span>
            <span class="image-size">{{ formatFileSize(image.size) }}</span>
          </div>
        </div>
        
        <!-- 添加更多图片按钮 -->
        <div 
          v-if="images.length < maxImages"
          class="add-more"
          @click="triggerFileInput"
        >
          <IconPlus class="add-icon" />
          <span>添加图片</span>
        </div>
      </div>
    </div>
    
    <!-- 错误信息 -->
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
    
    <!-- 上传选项 -->
    <div v-if="showOptions && images.length > 0" class="upload-options">
      <label class="option-item">
        <input 
          type="checkbox" 
          v-model="compressImages"
          @change="updateSettings"
        />
        <span>压缩图片以减小文件大小</span>
      </label>
      <div v-if="compressImages" class="quality-slider">
        <label>图片质量: {{ Math.round(imageQuality * 100) }}%</label>
        <input 
          type="range" 
          min="0.1" 
          max="1" 
          step="0.1"
          v-model.number="imageQuality"
          @input="updateSettings"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useOllamaStore } from '@/stores/ollama'
import type { ImageFile, ImageUploadOptions } from '@/types/ollama'
import { 
  processImageFiles, 
  formatFileSize,
  DEFAULT_IMAGE_CONFIG 
} from '@/utils/imageUtils'
import IconImage from '@/components/icons/IconImage.vue'
import IconPlus from '@/components/icons/IconPlus.vue'
import IconClose from '@/components/icons/IconClose.vue'

// Props
interface Props {
  modelValue: ImageFile[]
  maxImages?: number
  showOptions?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  maxImages: 5,
  showOptions: true,
  disabled: false
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: ImageFile[]]
  'error': [message: string]
}>()

// Store
const ollamaStore = useOllamaStore()

// 响应式状态
const fileInput = ref<HTMLInputElement>()
const isDragOver = ref(false)
const errorMessage = ref('')
const images = ref<ImageFile[]>(props.modelValue || [])
const compressImages = ref(ollamaStore.settings.multimodal?.compressImages ?? true)
const imageQuality = ref(ollamaStore.settings.multimodal?.imageQuality ?? 0.8)

// 计算属性
const maxImages = computed(() => props.maxImages)
const uploadOptions = computed((): ImageUploadOptions => ({
  maxSize: ollamaStore.settings.multimodal?.maxImageSize ?? 5120,
  allowedTypes: ollamaStore.settings.multimodal?.allowedFormats ?? ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  quality: imageQuality.value
}))

// 方法
function triggerFileInput() {
  if (props.disabled) return
  fileInput.value?.click()
}

function handleDragOver(event: DragEvent) {
  if (props.disabled) return
  isDragOver.value = true
}

function handleDragLeave(event: DragEvent) {
  isDragOver.value = false
}

function handleDrop(event: DragEvent) {
  if (props.disabled) return
  isDragOver.value = false
  const files = Array.from(event.dataTransfer?.files || [])
  processFiles(files)
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])
  processFiles(files)
  // 清空input以允许重复选择同一文件
  target.value = ''
}

async function processFiles(files: File[]) {
  errorMessage.value = ''
  
  // 检查文件数量限制
  if (images.value.length + files.length > maxImages.value) {
    errorMessage.value = `最多只能上传 ${maxImages.value} 张图片`
    emit('error', errorMessage.value)
    return
  }
  
  try {
    // 使用优化的批量处理函数
    const result = await processImageFiles(files, {
      ...uploadOptions.value,
      compress: compressImages.value,
      maxWidth: DEFAULT_IMAGE_CONFIG.maxWidth,
      maxHeight: DEFAULT_IMAGE_CONFIG.maxHeight,
      onProgress: (current, total) => {
        console.log(`处理图片进度: ${current}/${total}`)
      }
    })
    
    // 添加成功处理的图片
    images.value.push(...result.success)
    
    // 处理错误
    if (result.errors.length > 0) {
      const errorMessages = result.errors.map(err => `${err.file.name}: ${err.error}`)
      errorMessage.value = errorMessages.join('; ')
      emit('error', errorMessage.value)
    }
    
    // 更新父组件
    emit('update:modelValue', images.value)
    
  } catch (error) {
    console.error('批量处理图片失败:', error)
    errorMessage.value = '图片处理失败，请重试'
    emit('error', errorMessage.value)
  }
}


function removeImage(index: number) {
  images.value.splice(index, 1)
  emit('update:modelValue', images.value)
  errorMessage.value = ''
}

// formatFileSize函数已从utils/imageUtils导入

function updateSettings() {
  ollamaStore.updateSettings({
    multimodal: {
      ...ollamaStore.settings.multimodal,
      compressImages: compressImages.value,
      imageQuality: imageQuality.value
    }
  })
}

// 监听props变化
function updateImages() {
  images.value = props.modelValue || []
}

onMounted(() => {
  updateImages()
})
</script>

<style scoped>
.image-upload {
  width: 100%;
}

.upload-zone {
  border: 2px dashed var(--gray-300);
  border-radius: var(--radius-large);
  padding: var(--spacing-4);
  text-align: center;
  cursor: pointer;
  transition: all var(--duration-normal) var(--ease-out);
  background: var(--gray-50);
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-zone:hover {
  border-color: var(--accent-blue);
  background: rgba(0, 122, 255, 0.05);
}

.upload-zone.drag-over {
  border-color: var(--accent-blue);
  background: rgba(0, 122, 255, 0.1);
  transform: scale(1.02);
}

.upload-zone.has-images {
  min-height: auto;
  padding: var(--spacing-3);
}

.file-input {
  display: none;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-2);
}

.upload-icon {
  width: 48px;
  height: 48px;
  color: var(--gray-400);
}

.upload-text {
  font-size: 16px;
  font-weight: 500;
  color: var(--primary-black);
  margin: 0;
}

.upload-hint {
  font-size: 14px;
  color: var(--gray-500);
  margin: 0;
}

.image-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: var(--spacing-3);
  width: 100%;
}

.image-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.image-preview {
  position: relative;
  aspect-ratio: 1;
  border-radius: var(--radius-medium);
  overflow: hidden;
  background: var(--gray-100);
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-overlay {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: var(--spacing-1);
  opacity: 0;
  transition: opacity var(--duration-fast) var(--ease-out);
}

.image-preview:hover .image-overlay {
  opacity: 1;
}

.remove-btn {
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: var(--radius-full);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--primary-black);
  transition: all var(--duration-fast) var(--ease-out);
}

.remove-btn:hover {
  background: var(--primary-white);
  transform: scale(1.1);
}

.image-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.image-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--primary-black);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.image-size {
  font-size: 11px;
  color: var(--gray-500);
}

.add-more {
  aspect-ratio: 1;
  border: 2px dashed var(--gray-300);
  border-radius: var(--radius-medium);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-1);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  background: var(--gray-50);
}

.add-more:hover {
  border-color: var(--accent-blue);
  background: rgba(0, 122, 255, 0.05);
}

.add-icon {
  width: 24px;
  height: 24px;
  color: var(--gray-400);
}

.add-more span {
  font-size: 12px;
  color: var(--gray-500);
  font-weight: 500;
}

.error-message {
  margin-top: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
  background: rgba(255, 59, 48, 0.1);
  color: rgba(255, 59, 48, 0.8);
  border-radius: var(--radius-medium);
  font-size: 14px;
}

.upload-options {
  margin-top: var(--spacing-3);
  padding: var(--spacing-3);
  background: var(--gray-50);
  border-radius: var(--radius-medium);
  border: 1px solid var(--gray-200);
}

.option-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: 14px;
  color: var(--primary-black);
  cursor: pointer;
}

.option-item input[type="checkbox"] {
  cursor: pointer;
}

.quality-slider {
  margin-top: var(--spacing-2);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.quality-slider label {
  font-size: 13px;
  color: var(--gray-600);
  font-weight: 500;
}

.quality-slider input[type="range"] {
  width: 100%;
  cursor: pointer;
}
</style>