import type { ImageFile, ImageUploadOptions } from '@/types/ollama'

/**
 * 图像处理工具模块
 */

// 支持的图像类型
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/gif'
] as const

// 默认图像处理配置
export const DEFAULT_IMAGE_CONFIG = {
  maxSize: 5120, // KB
  quality: 0.8,
  maxWidth: 1920,
  maxHeight: 1920,
  maxImages: 5
} as const

/**
 * 验证图像文件
 */
export function validateImageFile(file: File, options: ImageUploadOptions): { valid: boolean; error?: string } {
  // 检查文件类型
  if (!options.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `不支持的文件格式: ${file.type}。支持的格式: ${options.allowedTypes.join(', ')}`
    }
  }
  
  // 检查文件大小 (KB)
  const fileSizeKB = file.size / 1024
  if (fileSizeKB > options.maxSize) {
    return {
      valid: false,
      error: `文件过大: ${formatFileSize(file.size)}。最大支持: ${formatFileSize(options.maxSize * 1024)}`
    }
  }
  
  return { valid: true }
}

/**
 * 压缩图像
 */
export function compressImage(
  file: File, 
  options: {
    quality?: number
    maxWidth?: number
    maxHeight?: number
    format?: string
  } = {}
): Promise<{ blob: Blob; base64: string; size: number }> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    if (!ctx) {
      reject(new Error('无法创建canvas上下文'))
      return
    }
    
    const handleLoad = () => {
      try {
        // 清理URL
        URL.revokeObjectURL(url)
        
        // 计算压缩后的尺寸
        const { width, height } = calculateCompressedSize(
          img.width, 
          img.height, 
          options.maxWidth || DEFAULT_IMAGE_CONFIG.maxWidth,
          options.maxHeight || DEFAULT_IMAGE_CONFIG.maxHeight
        )
        
        canvas.width = width
        canvas.height = height
        
        // 绘制图像
        ctx.drawImage(img, 0, 0, width, height)
        
        // 转换为blob
        const quality = options.quality || DEFAULT_IMAGE_CONFIG.quality
        const format = options.format || 'image/jpeg'
        
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('图像压缩失败'))
            return
          }
          
          // 转换为base64
          const reader = new FileReader()
          reader.onload = () => {
            const base64 = reader.result as string
            resolve({
              blob,
              base64,
              size: blob.size
            })
          }
          reader.onerror = () => reject(new Error('Base64转换失败'))
          reader.readAsDataURL(blob)
        }, format, quality)
        
      } catch (error) {
        reject(error)
      }
    }
    
    const handleError = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图像加载失败'))
    }
    
    img.onload = handleLoad
    img.onerror = handleError
    
    // 创建图像URL并加载
    const url = URL.createObjectURL(file)
    img.src = url
  })
}

/**
 * 计算压缩后的尺寸
 */
function calculateCompressedSize(
  originalWidth: number, 
  originalHeight: number, 
  maxWidth: number, 
  maxHeight: number
): { width: number; height: number } {
  let width = originalWidth
  let height = originalHeight
  
  // 如果图像尺寸超过最大限制，按比例缩放
  if (width > maxWidth || height > maxHeight) {
    const aspectRatio = width / height
    
    if (width > height) {
      width = maxWidth
      height = width / aspectRatio
    } else {
      height = maxHeight
      width = height * aspectRatio
    }
    
    // 确保不超过最大尺寸
    if (width > maxWidth) {
      width = maxWidth
      height = width / aspectRatio
    }
    if (height > maxHeight) {
      height = maxHeight
      width = height * aspectRatio
    }
  }
  
  return { 
    width: Math.round(width), 
    height: Math.round(height) 
  }
}

/**
 * 将文件转换为ImageFile对象
 */
export async function createImageFile(
  file: File, 
  options: {
    compress?: boolean
    quality?: number
    maxWidth?: number
    maxHeight?: number
  } = {}
): Promise<ImageFile> {
  let base64: string
  let processedSize = file.size
  
  if (options.compress && file.type !== 'image/gif') {
    // 压缩图像（GIF不压缩以保持动画）
    const compressed = await compressImage(file, options)
    base64 = compressed.base64
    processedSize = compressed.size
  } else {
    // 直接转换为base64
    base64 = await fileToBase64(file)
  }
  
  return {
    id: generateImageId(),
    file,
    base64: extractBase64Data(base64),
    preview: base64,
    size: processedSize,
    type: file.type,
    name: file.name
  }
}

/**
 * 文件转Base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * 提取base64数据部分（移除data:image/...;base64,前缀）
 */
export function extractBase64Data(base64String: string): string {
  const parts = base64String.split(',')
  return parts.length > 1 ? parts[1] : base64String
}

/**
 * 生成图像ID
 */
export function generateImageId(): string {
  return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * 检查是否为图像文件
 */
export function isImageFile(file: File): boolean {
  return SUPPORTED_IMAGE_TYPES.includes(file.type as any)
}

/**
 * 获取图像尺寸
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      })
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('无法获取图像尺寸'))
    }
    
    img.src = url
  })
}

/**
 * 批量处理图像文件
 */
export async function processImageFiles(
  files: File[],
  options: ImageUploadOptions & {
    compress?: boolean
    onProgress?: (index: number, total: number) => void
  } = {}
): Promise<{ success: ImageFile[]; errors: { file: File; error: string }[] }> {
  const success: ImageFile[] = []
  const errors: { file: File; error: string }[] = []
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    
    try {
      // 验证文件
      const validation = validateImageFile(file, options)
      if (!validation.valid) {
        errors.push({ file, error: validation.error! })
        continue
      }
      
      // 处理文件
      const imageFile = await createImageFile(file, {
        compress: options.compress,
        quality: options.quality,
        maxWidth: options.maxWidth,
        maxHeight: options.maxHeight
      })
      
      success.push(imageFile)
      
      // 更新进度
      options.onProgress?.(i + 1, files.length)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      errors.push({ file, error: errorMessage })
    }
  }
  
  return { success, errors }
}