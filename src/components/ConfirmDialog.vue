<template>
  <div class="confirm-dialog">
    <div class="dialog-backdrop" @click="$emit('cancel')"></div>
    
    <div class="dialog-container">
      <div class="dialog-content">
        <div class="dialog-icon">
          <IconInfo class="warning-icon" />
        </div>
        
        <h3 class="dialog-title">{{ title }}</h3>
        
        <p class="dialog-message">{{ message }}</p>
      </div>
      
      <div class="dialog-actions">
        <button
          @click="$emit('cancel')"
          class="btn btn-secondary"
        >
          取消
        </button>
        
        <button
          @click="$emit('confirm')"
          class="btn btn-danger"
        >
          确认
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import IconInfo from '@/components/icons/IconInfo.vue'

// Props
interface Props {
  title: string
  message: string
}

defineProps<Props>()

// Emits
defineEmits<{
  'confirm': []
  'cancel': []
}>()
</script>

<style scoped>
.confirm-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.dialog-container {
  position: relative;
  width: 90%;
  max-width: 400px;
  background: var(--primary-white);
  border-radius: var(--radius-large);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.dialog-content {
  padding: var(--spacing-6) var(--spacing-4) var(--spacing-4);
  text-align: center;
}

.dialog-icon {
  margin-bottom: var(--spacing-4);
}

.warning-icon {
  width: 48px;
  height: 48px;
  color: var(--warning-orange);
}

.dialog-title {
  margin: 0 0 var(--spacing-3) 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--primary-black);
}

.dialog-message {
  margin: 0;
  font-size: 14px;
  color: var(--gray-600);
  line-height: 1.5;
}

.dialog-actions {
  padding: var(--spacing-4);
  border-top: 1px solid var(--gray-200);
  display: flex;
  gap: var(--spacing-3);
  justify-content: flex-end;
}

.btn {
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--radius-medium);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  border: none;
  min-width: 80px;
}

.btn.btn-secondary {
  background: var(--primary-white);
  color: var(--gray-600);
  border: 1px solid var(--gray-300);
}

.btn.btn-secondary:hover {
  background: var(--gray-50);
  border-color: var(--gray-400);
}

.btn.btn-danger {
  background: var(--error-red);
  color: var(--primary-white);
}

.btn.btn-danger:hover {
  background: #d70015;
}
</style>