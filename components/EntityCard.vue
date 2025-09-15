<template>
  <div class="entity-card" :class="{ 'business-view': modelStore.viewMode === 'business' }">
    <!-- Header with business name and table name -->
    <div class="card-header">
      <div class="title-section">
        <h3 class="business-name">{{ table.businessName }}</h3>
        <el-tag size="small" type="info">{{ table.name }}</el-tag>
      </div>
      <div class="actions">
        <el-button 
          @click="() => modelStore.openCommentPanel(table.id)" 
          size="small" 
          type="text"
          :icon="ChatDotRound"
        >
          {{ table.comments.length }}
        </el-button>
        <el-dropdown @command="handleCommand">
          <el-button size="small" type="text" :icon="MoreFilled" />
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="edit">编辑表</el-dropdown-item>
              <el-dropdown-item command="addColumn">添加字段</el-dropdown-item>
              <el-dropdown-item command="delete" divided>删除表</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- Business comment -->
    <div v-if="table.businessComment" class="business-comment">
      <el-text size="small" type="info">{{ table.businessComment }}</el-text>
    </div>

    <!-- Fields list -->
    <div class="fields-list">
      <div 
        v-for="column in table.columns" 
        :key="column.id" 
        class="field-row"
        :class="{
          'primary-key': column.isPrimaryKey,
          'foreign-key': column.isForeignKey,
          'required': column.isRequired
        }"
      >
        <!-- Field name and indicators -->
        <div class="field-main">
          <div class="field-indicators">
            <el-icon v-if="column.isPrimaryKey" color="#f56c6c" size="12"><Key /></el-icon>
            <el-icon v-if="column.isForeignKey" color="#409eff" size="12"><Link /></el-icon>
            <el-icon v-if="column.isRequired && !column.isPrimaryKey" color="#e6a23c" size="10"><StarFilled /></el-icon>
          </div>
          <span class="field-name">{{ column.name }}</span>
        </div>

        <!-- Business or technical info based on view mode -->
        <div class="field-info">
          <div v-if="modelStore.viewMode === 'business'" class="business-info">
            <span class="business-name">{{ column.businessName || column.name }}</span>
            <el-text v-if="column.businessComment" size="small" type="info" class="business-comment">
              {{ column.businessComment }}
            </el-text>
          </div>
          <div v-else class="technical-info">
            <el-tag size="small" :type="getTypeTagType(column.type)">{{ column.type }}</el-tag>
            <span v-if="column.defaultValue" class="default-value">= {{ column.defaultValue }}</span>
          </div>
        </div>

        <!-- Comment button -->
        <el-button 
          @click="() => modelStore.openCommentPanel(table.id, column.id)" 
          size="small" 
          type="text"
          class="comment-btn"
        >
          💬 {{ column.comments.length }}
        </el-button>
      </div>
    </div>

    <!-- Add field button -->
    <div class="add-field">
      <el-button @click="showAddColumnDialog = true" size="small" type="dashed" style="width: 100%">
        <el-icon><Plus /></el-icon>
        添加字段
      </el-button>
    </div>

    <!-- Add Column Dialog -->
    <el-dialog 
      v-model="showAddColumnDialog" 
      title="添加字段" 
      width="500px"
      @close="resetColumnForm"
    >
      <el-form :model="columnForm" label-width="100px">
        <el-form-item label="字段名">
          <el-input v-model="columnForm.name" placeholder="如: user_name" />
        </el-form-item>
        <el-form-item label="业务名称">
          <el-input v-model="columnForm.businessName" placeholder="如: 用户姓名" />
        </el-form-item>
        <el-form-item label="数据类型">
          <el-select v-model="columnForm.type" placeholder="选择类型">
            <el-option label="VARCHAR(50)" value="VARCHAR(50)" />
            <el-option label="VARCHAR(255)" value="VARCHAR(255)" />
            <el-option label="INT" value="INT" />
            <el-option label="BIGINT" value="BIGINT" />
            <el-option label="DECIMAL(10,2)" value="DECIMAL(10,2)" />
            <el-option label="DATE" value="DATE" />
            <el-option label="DATETIME" value="DATETIME" />
            <el-option label="TEXT" value="TEXT" />
            <el-option label="BOOLEAN" value="BOOLEAN" />
          </el-select>
        </el-form-item>
        <el-form-item label="业务说明">
          <el-input 
            v-model="columnForm.businessComment" 
            type="textarea" 
            placeholder="字段的业务含义和用途" 
          />
        </el-form-item>
        <el-form-item label="属性">
          <el-checkbox v-model="columnForm.isPrimaryKey">主键</el-checkbox>
          <el-checkbox v-model="columnForm.isForeignKey">外键</el-checkbox>
          <el-checkbox v-model="columnForm.isRequired">必填</el-checkbox>
        </el-form-item>
        <el-form-item label="默认值">
          <el-input v-model="columnForm.defaultValue" placeholder="如: CURRENT_TIMESTAMP" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddColumnDialog = false">取消</el-button>
        <el-button type="primary" @click="addColumn">添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  ChatDotRound, 
  MoreFilled, 
  Key, 
  Link, 
  StarFilled, 
  Plus 
} from '@element-plus/icons-vue'
import type { Table, Column } from '~/types/model'
import { useModelStore } from '~/stores/model'

interface Props {
  table: Table
}

const props = defineProps<Props>()

const modelStore = useModelStore()
const showAddColumnDialog = ref(false)

const columnForm = reactive({
  name: '',
  businessName: '',
  type: 'VARCHAR(50)',
  businessComment: '',
  isPrimaryKey: false,
  isForeignKey: false,
  isRequired: false,
  defaultValue: ''
})

const resetColumnForm = () => {
  Object.assign(columnForm, {
    name: '',
    businessName: '',
    type: 'VARCHAR(50)',
    businessComment: '',
    isPrimaryKey: false,
    isForeignKey: false,
    isRequired: false,
    defaultValue: ''
  })
}

const addColumn = () => {
  if (!columnForm.name.trim()) {
    ElMessage.warning('请输入字段名')
    return
  }
  
  const table = modelStore.project?.tables.find(t => t.id === props.table.id)
  if (table) {
    modelStore.addColumn(table.id, {
      name: columnForm.name,
      type: columnForm.type,
      businessName: columnForm.businessName || columnForm.name,
      businessComment: columnForm.businessComment,
      isPrimaryKey: columnForm.isPrimaryKey,
      isForeignKey: columnForm.isForeignKey,
      isRequired: columnForm.isRequired,
      defaultValue: columnForm.defaultValue || undefined,
      comments: []
    })
  }
  
  showAddColumnDialog.value = false
  resetColumnForm()
  ElMessage.success('字段添加成功')
}

const getTypeTagType = (type: string) => {
  if (type.includes('VARCHAR') || type.includes('TEXT')) return 'success'
  if (type.includes('INT') || type.includes('DECIMAL')) return 'warning'
  if (type.includes('DATE') || type.includes('TIME')) return 'info'
  return 'primary'
}

const handleCommand = (command: string) => {
  switch (command) {
    case 'edit':
      ElMessage.info('编辑功能开发中...')
      break
    case 'addColumn':
      showAddColumnDialog.value = true
      break
    case 'delete':
      ElMessageBox.confirm('确定要删除这个表吗？', '确认删除', {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        modelStore.deleteTable(props.table.id)
        ElMessage.success('表已删除')
      })
      break
  }
}
</script>

<style scoped>
.entity-card {
  background: white;
  border: 2px solid #e4e7ed;
  border-radius: 8px;
  min-width: 280px;
  max-width: 320px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.entity-card:hover {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.card-header {
  padding: 12px 16px;
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 6px 6px 0 0;
}

.title-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.business-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.actions {
  display: flex;
  gap: 4px;
}

.business-comment {
  padding: 8px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #eee;
  font-style: italic;
}

.fields-list {
  padding: 8px 0;
}

.field-row {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  gap: 8px;
  border-bottom: 1px solid #f5f5f5;
  transition: background-color 0.2s;
}

.field-row:hover {
  background-color: #f8f9fa;
}

.field-row.primary-key {
  background-color: #fef0f0;
}

.field-row.foreign-key {
  background-color: #f0f9ff;
}

.field-main {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 80px;
}

.field-indicators {
  display: flex;
  gap: 2px;
  min-width: 20px;
}

.field-name {
  font-family: 'Consolas', 'Monaco', monospace;
  font-weight: 600;
  color: #2c3e50;
}

.field-info {
  flex: 1;
  min-width: 0;
}

.business-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.business-info .business-name {
  font-weight: 500;
  color: #1f2937;
}

.business-info .business-comment {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.3;
}

.technical-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.default-value {
  font-size: 12px;
  color: #909399;
  font-family: monospace;
}

.comment-btn {
  font-size: 12px;
  min-width: auto;
  padding: 4px 8px;
}

.add-field {
  padding: 12px 16px;
  border-top: 1px solid #eee;
}

.business-view .technical-info {
  opacity: 0.7;
}

.business-view .field-indicators {
  opacity: 0.5;
}
</style>