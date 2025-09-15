<template>
  <div class="dynamic-form">
    <div class="form-header">
      <h3>{{ table.name }} - 新增记录</h3>
      <div class="form-actions">
        <button @click="resetForm" class="btn-secondary">重置</button>
        <button @click="submitForm" class="btn-primary">保存</button>
      </div>
    </div>
    
    <form @submit.prevent="submitForm" class="form-content">
      <div v-for="column in table.columns" :key="column.id" class="form-field">
        <label :for="column.name" class="field-label">
          {{ column.name }}
          <span v-if="column.isPrimaryKey" class="key-badge pk">主键</span>
          <span v-if="column.isForeignKey" class="key-badge fk">外键</span>
          <span v-if="isRequired(column)" class="required">*</span>
        </label>
        
        <!-- 文本输入 -->
        <input 
          v-if="isTextInput(column.type)"
          :id="column.name"
          v-model="formData[column.name]"
          :type="getInputType(column.type)"
          :placeholder="getPlaceholder(column)"
          :required="isRequired(column)"
          :readonly="column.isPrimaryKey && column.type.toLowerCase().includes('int')"
          class="form-input"
        />
        
        <!-- 数字输入 -->
        <input 
          v-else-if="isNumberInput(column.type)"
          :id="column.name"
          v-model.number="formData[column.name]"
          type="number"
          :placeholder="getPlaceholder(column)"
          :required="isRequired(column)"
          :readonly="column.isPrimaryKey"
          class="form-input"
        />
        
        <!-- 日期时间输入 -->
        <input 
          v-else-if="isDateInput(column.type)"
          :id="column.name"
          v-model="formData[column.name]"
          :type="getDateInputType(column.type)"
          :required="isRequired(column)"
          class="form-input"
        />
        
        <!-- 布尔值输入 -->
        <div v-else-if="isBooleanInput(column.type)" class="checkbox-field">
          <input 
            :id="column.name"
            v-model="formData[column.name]"
            type="checkbox"
            class="form-checkbox"
          />
          <label :for="column.name" class="checkbox-label">是/否</label>
        </div>
        
        <!-- 文本域 -->
        <textarea 
          v-else-if="isTextArea(column.type)"
          :id="column.name"
          v-model="formData[column.name]"
          :placeholder="getPlaceholder(column)"
          :required="isRequired(column)"
          rows="3"
          class="form-textarea"
        ></textarea>
        
        <!-- 默认文本输入 -->
        <input 
          v-else
          :id="column.name"
          v-model="formData[column.name]"
          type="text"
          :placeholder="getPlaceholder(column)"
          :required="isRequired(column)"
          class="form-input"
        />
        
        <div v-if="column.businessComment" class="field-help">
          {{ column.businessComment }}
        </div>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import type { Table, Column } from '~/types/model'

interface Props {
  table: Table
  editData?: Record<string, any>
}

interface Emits {
  submit: [data: Record<string, any>]
  cancel: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 表单数据
const formData = reactive<Record<string, any>>({})

// 初始化表单数据
const initFormData = () => {
  props.table.columns.forEach(column => {
    if (props.editData && props.editData[column.name] !== undefined) {
      formData[column.name] = props.editData[column.name]
    } else {
      // 设置默认值
      if (column.isPrimaryKey && column.type.toLowerCase().includes('int')) {
        formData[column.name] = null // 自增主键
      } else if (isBooleanInput(column.type)) {
        formData[column.name] = false
      } else if (isNumberInput(column.type)) {
        formData[column.name] = null
      } else {
        formData[column.name] = ''
      }
    }
  })
}

// 重置表单
const resetForm = () => {
  initFormData()
}

// 提交表单
const submitForm = () => {
  // 验证必填字段
  const errors: string[] = []
  props.table.columns.forEach(column => {
    if (isRequired(column)) {
      const value = formData[column.name]
      if (value === null || value === undefined || value === '') {
        errors.push(`${column.name} 是必填字段`)
      }
    }
  })
  
  if (errors.length > 0) {
    alert('请填写必填字段：\n' + errors.join('\n'))
    return
  }
  
  // 清理数据
  const cleanData = { ...formData }
  Object.keys(cleanData).forEach(key => {
    if (cleanData[key] === '') {
      cleanData[key] = null
    }
  })
  
  emit('submit', cleanData)
}

// 判断是否必填
const isRequired = (column: Column): boolean => {
  return column.isPrimaryKey || column.name.toLowerCase().includes('name')
}

// 判断输入类型
const isTextInput = (type: string): boolean => {
  const lowerType = type.toLowerCase()
  return lowerType.includes('varchar') || lowerType.includes('char') || lowerType.includes('string')
}

const isNumberInput = (type: string): boolean => {
  const lowerType = type.toLowerCase()
  return lowerType.includes('int') || lowerType.includes('decimal') || lowerType.includes('float') || lowerType.includes('double')
}

const isDateInput = (type: string): boolean => {
  const lowerType = type.toLowerCase()
  return lowerType.includes('date') || lowerType.includes('time')
}

const isBooleanInput = (type: string): boolean => {
  const lowerType = type.toLowerCase()
  return lowerType.includes('bool') || lowerType.includes('bit')
}

const isTextArea = (type: string): boolean => {
  const lowerType = type.toLowerCase()
  return lowerType.includes('text') || lowerType.includes('longtext')
}

// 获取输入类型
const getInputType = (type: string): string => {
  const lowerType = type.toLowerCase()
  if (lowerType.includes('email')) return 'email'
  if (lowerType.includes('url')) return 'url'
  if (lowerType.includes('tel') || lowerType.includes('phone')) return 'tel'
  return 'text'
}

const getDateInputType = (type: string): string => {
  const lowerType = type.toLowerCase()
  if (lowerType.includes('datetime') || lowerType.includes('timestamp')) return 'datetime-local'
  if (lowerType.includes('time')) return 'time'
  return 'date'
}

// 获取占位符
const getPlaceholder = (column: Column): string => {
  if (column.businessComment) {
    return `请输入${column.businessComment}`
  }
  return `请输入${column.name}`
}

// 监听编辑数据变化
watch(() => props.editData, () => {
  initFormData()
}, { immediate: true })

// 初始化
initFormData()
</script>

<style scoped>
.dynamic-form {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.form-header h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.form-actions {
  display: flex;
  gap: 10px;
}

.form-content {
  padding: 20px;
  max-height: 500px;
  overflow-y: auto;
}

.form-field {
  margin-bottom: 20px;
}

.field-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.key-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: bold;
  text-transform: uppercase;
}

.key-badge.pk {
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
}

.key-badge.fk {
  background: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
}

.required {
  color: #dc3545;
  font-weight: bold;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.form-input:readonly {
  background-color: #f8f9fa;
  color: #6c757d;
}

.checkbox-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-checkbox {
  width: 18px;
  height: 18px;
}

.checkbox-label {
  margin: 0;
  font-weight: normal;
}

.field-help {
  margin-top: 4px;
  font-size: 12px;
  color: #6c757d;
}

.btn-primary,
.btn-secondary {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #545b62;
}
</style>