<template>
  <div class="dynamic-form">
    <el-card>
      <template #header>
        <div class="form-header">
          <span>{{ table.name }} - {{ editData ? '编辑记录' : '新增记录' }}</span>
          <div class="form-actions">
            <el-button @click="resetForm">重置</el-button>
            <el-button type="primary" @click="submitForm">保存</el-button>
          </div>
        </div>
      </template>
      
      <el-form :model="formData" label-width="120px" label-position="left">
        <el-form-item 
          v-for="column in table.columns" 
          :key="column.id" 
          v-show="!shouldHideField(column)"
          :label="column.name"
          :required="isRequired(column)"
        >
          <template #label>
            <div class="field-label">
              {{ column.name }}
              <el-tag v-if="column.isPrimaryKey" type="warning" size="small">主键</el-tag>
              <el-tag v-if="column.isForeignKey" type="info" size="small">外键</el-tag>
              <span v-if="isRequired(column)" class="required">*</span>
            </div>
          </template>
          
          <!-- 外键选择器 -->
          <el-select 
            v-if="column.isForeignKey"
            v-model="formData[column.name]"
            :placeholder="`请选择${column.businessComment || column.name}`"
            clearable
            style="width: 100%"
          >
            <el-option 
              v-for="option in getForeignKeyOptions(column)" 
              :key="option.value" 
              :value="option.value"
              :label="option.label"
            />
          </el-select>
          
          <!-- 文本输入 -->
          <el-input 
            v-else-if="isTextInput(column.type)"
            v-model="formData[column.name]"
            :type="getInputType(column.type)"
            :placeholder="getPlaceholder(column)"
            :readonly="column.isPrimaryKey && column.type.toLowerCase().includes('int')"
          />
          
          <!-- 数字输入 -->
          <el-input-number 
            v-else-if="isNumberInput(column.type)"
            v-model="formData[column.name]"
            :placeholder="getPlaceholder(column)"
            :disabled="column.isPrimaryKey"
            style="width: 100%"
          />
          
          <!-- 日期时间输入 -->
          <el-date-picker 
            v-else-if="isDateInput(column.type)"
            v-model="formData[column.name]"
            :type="getDatePickerType(column.type)"
            :placeholder="getPlaceholder(column)"
            style="width: 100%"
          />
          
          <!-- 布尔值输入 -->
          <el-switch 
            v-else-if="isBooleanInput(column.type)"
            v-model="formData[column.name]"
            active-text="是"
            inactive-text="否"
          />
          
          <!-- 文本域 -->
          <el-input 
            v-else-if="isTextArea(column.type)"
            v-model="formData[column.name]"
            type="textarea"
            :rows="3"
            :placeholder="getPlaceholder(column)"
          />
          
          <!-- 默认文本输入 -->
          <el-input 
            v-else
            v-model="formData[column.name]"
            :placeholder="getPlaceholder(column)"
          />
          
          <div v-if="column.businessComment" class="field-help">
            {{ column.businessComment }}
          </div>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import type { Table, Column } from '~/types/model'

interface Props {
  table: Table
  editData?: Record<string, any>
  allTables: Table[]
}

interface Emits {
  submit: [data: Record<string, any>]
  cancel: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 表单数据
const formData = reactive<Record<string, any>>({})

// 获取外键选项数据
const getForeignKeyOptions = (column: Column) => {
  if (!column.isForeignKey) return []
  
  // 根据外键字段名推断关联表
  const columnName = column.name.toLowerCase()
  let referencedTableName = ''
  
  if (columnName.endsWith('id')) {
    referencedTableName = columnName.slice(0, -2) // 移除 'id' 后缀
  }
  
  // 查找关联表
  const referencedTable = props.allTables.find(table => 
    table.name.toLowerCase() === referencedTableName ||
    table.name.toLowerCase() === referencedTableName + 's' ||
    table.name.toLowerCase() === referencedTableName.slice(0, -1) // 处理复数形式
  )
  
  if (!referencedTable) return []
  
  // 从localStorage获取关联表数据
  const tableDataKey = `table_data_${referencedTable.name}`
  const storedData = localStorage.getItem(tableDataKey)
  if (!storedData) return []
  
  try {
    const data = JSON.parse(storedData)
    return data.map((item: any) => {
      // 找到主键字段作为值
      const pkColumn = referencedTable.columns.find(col => col.isPrimaryKey)
      const pkValue = pkColumn ? item[pkColumn.name] : item.id
      
      // 找到显示字段（通常是name字段或第一个非主键字段）
      const displayColumn = referencedTable.columns.find(col => 
        col.name.toLowerCase().includes('name') || 
        col.name.toLowerCase().includes('title')
      ) || referencedTable.columns.find(col => !col.isPrimaryKey)
      
      const displayValue = displayColumn ? item[displayColumn.name] : pkValue
      
      return {
        value: pkValue,
        label: `${displayValue} (ID: ${pkValue})`
      }
    })
  } catch {
    return []
  }
}

// 判断是否应该隐藏字段（自增主键）
const shouldHideField = (column: Column): boolean => {
  return column.isPrimaryKey && 
         column.type.toLowerCase().includes('int') && 
         !props.editData // 新增时隐藏，编辑时显示
}

// 初始化表单数据
const initFormData = () => {
  props.table.columns.forEach(column => {
    if (props.editData && props.editData[column.name] !== undefined) {
      formData[column.name] = props.editData[column.name]
    } else {
      // 设置默认值
      if (shouldHideField(column)) {
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
  // 验证必填字段（排除隐藏的自增主键）
  const errors: string[] = []
  props.table.columns.forEach(column => {
    if (isRequired(column) && !shouldHideField(column)) {
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
  
  // 为自增主键生成ID（如果是新增记录）
  if (!props.editData) {
    props.table.columns.forEach(column => {
      if (shouldHideField(column)) {
        // 生成简单的自增ID
        const tableDataKey = `table_data_${props.table.name}`
        const storedData = localStorage.getItem(tableDataKey)
        let maxId = 0
        if (storedData) {
          try {
            const data = JSON.parse(storedData)
            maxId = Math.max(...data.map((item: any) => item[column.name] || 0))
          } catch {}
        }
        cleanData[column.name] = maxId + 1
      }
    })
  }
  
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

const getDatePickerType = (type: string): string => {
  const lowerType = type.toLowerCase()
  if (lowerType.includes('datetime') || lowerType.includes('timestamp')) return 'datetime'
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
  margin: 20px;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-actions {
  display: flex;
  gap: 10px;
}

.field-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
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

.field-help {
  margin-top: 4px;
  font-size: 12px;
  color: #6c757d;
}
</style>