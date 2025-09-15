<template>
  <div class="dynamic-list">
    <div class="list-header">
      <h3>{{ table.name }} - 数据列表</h3>
      <div class="list-actions">
        <button @click="refreshData" class="btn-secondary">刷新</button>
        <button @click="addRecord" class="btn-primary">新增记录</button>
      </div>
    </div>
    
    <div class="list-content">
      <div v-if="loading" class="loading">
        加载中...
      </div>
      
      <div v-else-if="!data.length" class="empty-state">
        <p>暂无数据</p>
        <button @click="addRecord" class="btn-primary">添加第一条记录</button>
      </div>
      
      <div v-else class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th v-for="column in table.columns" :key="column.id" :class="getColumnClass(column)">
                <div class="column-header">
                  <span>{{ column.name }}</span>
                  <span v-if="column.isPrimaryKey" class="key-badge pk">PK</span>
                  <span v-if="column.isForeignKey" class="key-badge fk">FK</span>
                </div>
                <div v-if="column.businessComment" class="column-comment">
                  {{ column.businessComment }}
                </div>
              </th>
              <th class="actions-column">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(record, index) in data" :key="getRecordKey(record, index)" class="data-row">
              <td v-for="column in table.columns" :key="column.id" :class="getColumnClass(column)">
                <div class="cell-content">
                  <span v-if="isBooleanValue(record[column.name])" class="boolean-value">
                    {{ record[column.name] ? '是' : '否' }}
                  </span>
                  <span v-else-if="isDateValue(column.type, record[column.name])" class="date-value">
                    {{ formatDate(record[column.name]) }}
                  </span>
                  <span v-else-if="isNumberValue(column.type)" class="number-value">
                    {{ formatNumber(record[column.name]) }}
                  </span>
                  <span v-else class="text-value">
                    {{ record[column.name] || '-' }}
                  </span>
                </div>
              </td>
              <td class="actions-column">
                <div class="row-actions">
                  <button @click="editRecord(record, index)" class="btn-edit" title="编辑">
                    ✏️
                  </button>
                  <button @click="deleteRecord(record, index)" class="btn-delete" title="删除">
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- 分页 -->
    <div v-if="totalPages > 1" class="pagination">
      <button 
        @click="currentPage = Math.max(1, currentPage - 1)" 
        :disabled="currentPage === 1"
        class="btn-page"
      >
        上一页
      </button>
      <span class="page-info">
        第 {{ currentPage }} 页，共 {{ totalPages }} 页
      </span>
      <button 
        @click="currentPage = Math.min(totalPages, currentPage + 1)" 
        :disabled="currentPage === totalPages"
        class="btn-page"
      >
        下一页
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Table, Column } from '~/types/model'

interface Props {
  table: Table
  data: Record<string, any>[]
  loading?: boolean
  pageSize?: number
}

interface Emits {
  add: []
  edit: [record: Record<string, any>, index: number]
  delete: [record: Record<string, any>, index: number]
  refresh: []
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  pageSize: 10
})

const emit = defineEmits<Emits>()

// 分页
const currentPage = ref(1)

const totalPages = computed(() => {
  return Math.ceil(props.data.length / props.pageSize)
})

const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * props.pageSize
  const end = start + props.pageSize
  return props.data.slice(start, end)
})

// 使用分页数据
const data = computed(() => paginatedData.value)

// 操作方法
const addRecord = () => {
  emit('add')
}

const editRecord = (record: Record<string, any>, index: number) => {
  // 计算实际索引（考虑分页）
  const actualIndex = (currentPage.value - 1) * props.pageSize + index
  emit('edit', record, actualIndex)
}

const deleteRecord = (record: Record<string, any>, index: number) => {
  if (confirm('确定要删除这条记录吗？')) {
    // 计算实际索引（考虑分页）
    const actualIndex = (currentPage.value - 1) * props.pageSize + index
    emit('delete', record, actualIndex)
  }
}

const refreshData = () => {
  emit('refresh')
}

// 获取记录的唯一键
const getRecordKey = (record: Record<string, any>, index: number): string => {
  // 尝试使用主键
  const primaryKey = props.table.columns.find(col => col.isPrimaryKey)
  if (primaryKey && record[primaryKey.name] !== undefined) {
    return `${primaryKey.name}-${record[primaryKey.name]}`
  }
  // 回退到索引
  return `record-${index}`
}

// 获取列样式类
const getColumnClass = (column: Column): string => {
  const classes = ['table-cell']
  if (column.isPrimaryKey) classes.push('primary-key')
  if (column.isForeignKey) classes.push('foreign-key')
  return classes.join(' ')
}

// 值类型判断和格式化
const isBooleanValue = (value: any): boolean => {
  return typeof value === 'boolean'
}

const isDateValue = (type: string, value: any): boolean => {
  if (!value) return false
  const lowerType = type.toLowerCase()
  return lowerType.includes('date') || lowerType.includes('time')
}

const isNumberValue = (type: string): boolean => {
  const lowerType = type.toLowerCase()
  return lowerType.includes('int') || lowerType.includes('decimal') || lowerType.includes('float') || lowerType.includes('double')
}

const formatDate = (value: any): string => {
  if (!value) return '-'
  try {
    const date = new Date(value)
    return date.toLocaleString('zh-CN')
  } catch {
    return String(value)
  }
}

const formatNumber = (value: any): string => {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'number') {
    return value.toLocaleString()
  }
  return String(value)
}

// 监听数据变化，重置到第一页
watch(() => props.data.length, () => {
  currentPage.value = 1
})
</script>

<style scoped>
.dynamic-list {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.list-header h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.list-actions {
  display: flex;
  gap: 10px;
}

.list-content {
  min-height: 300px;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #6c757d;
}

.empty-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #6c757d;
}

.empty-state p {
  margin-bottom: 16px;
}

.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e9ecef;
}

.data-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #333;
  position: sticky;
  top: 0;
  z-index: 1;
}

.column-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.column-comment {
  font-size: 11px;
  color: #6c757d;
  font-weight: normal;
}

.key-badge {
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 9px;
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

.table-cell.primary-key {
  background: #fff9e6;
}

.table-cell.foreign-key {
  background: #e6f7ff;
}

.data-row:hover {
  background: #f8f9fa;
}

.cell-content {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.boolean-value {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.date-value {
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

.number-value {
  font-family: 'Courier New', monospace;
  text-align: right;
}

.actions-column {
  width: 100px;
  text-align: center;
}

.row-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.btn-edit,
.btn-delete {
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.btn-edit:hover {
  background: #e9ecef;
}

.btn-delete:hover {
  background: #f8d7da;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-top: 1px solid #e9ecef;
}

.btn-page {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-page:hover:not(:disabled) {
  background: #f8f9fa;
  border-color: #adb5bd;
}

.btn-page:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  color: #6c757d;
  font-size: 14px;
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