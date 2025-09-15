<template>
  <div class="dynamic-list">
    <el-card>
      <template #header>
        <div class="list-header">
          <span>{{ table.name }} - 数据列表</span>
          <div class="list-actions">
            <el-button @click="refreshData" :loading="loading">刷新</el-button>
            <el-button type="primary" @click="addRecord">新增记录</el-button>
          </div>
        </div>
      </template>
      
      <div v-if="!data.length && !loading" class="empty-state">
        <el-empty description="暂无数据">
          <el-button type="primary" @click="addRecord">添加第一条记录</el-button>
        </el-empty>
      </div>
      
      <el-table v-else :data="data" v-loading="loading" stripe>
        <el-table-column 
          v-for="column in table.columns" 
          :key="column.id"
          :prop="column.name"
          :label="column.name"
          :min-width="getColumnWidth(column)"
        >
          <template #header>
            <div class="column-header">
              <span>{{ column.name }}</span>
              <el-tag v-if="column.isPrimaryKey" type="warning" size="small" class="key-badge">PK</el-tag>
              <el-tag v-if="column.isForeignKey" type="info" size="small" class="key-badge">FK</el-tag>
            </div>
            <div v-if="column.businessComment" class="column-comment">
              {{ column.businessComment }}
            </div>
          </template>
          <template #default="{ row }">
            <span v-if="isBooleanValue(row[column.name])">
              <el-tag :type="row[column.name] ? 'success' : 'danger'" size="small">
                {{ row[column.name] ? '是' : '否' }}
              </el-tag>
            </span>
            <span v-else-if="isDateValue(column.type, row[column.name])">
              {{ formatDate(row[column.name]) }}
            </span>
            <span v-else-if="isNumberValue(column.type)">
              {{ formatNumber(row[column.name]) }}
            </span>
            <span v-else>
              {{ row[column.name] || '-' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row, $index }">
            <el-button-group>
              <el-button size="small" @click="editRecord(row, $index)" :icon="Edit" />
              <el-button size="small" type="danger" @click="deleteRecord(row, $index)" :icon="Delete" />
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
      
      <div v-if="totalPages > 1" class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="totalRecords"
          layout="prev, pager, next, jumper, total"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Edit, Delete } from '@element-plus/icons-vue'
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

const totalRecords = computed(() => {
  return props.data.length
})

const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * props.pageSize
  const end = start + props.pageSize
  return props.data.slice(start, end)
})

// 使用分页数据
const data = computed(() => paginatedData.value)

// 分页处理
const handlePageChange = (page: number) => {
  currentPage.value = page
}

// 获取列宽度
const getColumnWidth = (column: Column): number => {
  if (column.isPrimaryKey) return 120
  if (column.isForeignKey) return 150
  if (column.type.toLowerCase().includes('text')) return 200
  if (column.type.toLowerCase().includes('date')) return 160
  return 120
}

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
  margin: 20px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.list-actions {
  display: flex;
  gap: 10px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
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
  margin-left: 4px;
}
</style>