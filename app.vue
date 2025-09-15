<template>
  <div class="app-container">
    <div class="main-content">
      <!-- ERDL编辑器视图 -->
      <div v-if="currentView === 'erdl'" class="erdl-view">
        <div v-if="!tables.length" class="welcome-message">
          <h2>欢迎使用 ModelFlow</h2>
          <p>开始构建您的数据模型</p>
          <button @click="showERDLEditor = true" class="btn-primary">开始使用 ERDL 编辑器</button>
        </div>
        
        <!-- ERDL编辑器 -->
        <div v-if="showERDLEditor" class="erdl-editor">
          <div class="editor-header">
            <h3>ERDL语法编辑器</h3>
            <div class="editor-actions">
              <button @click="loadSample" class="sample-btn">加载示例</button>
              <button @click="goToDataManagement" class="btn-success" :disabled="!tables.length">下一步：数据管理</button>
            </div>
          </div>
          
          <div class="editor-content">
            <div class="editor-left">
              <textarea 
                v-model="erdlText" 
                placeholder="请输入ERDL语法，例如：&#10;&#10;Customer-&#10;CustomerID int&#10;Name varchar(100)&#10;Address string&#10;&#10;Order-&#10;OrderID int&#10;CustomerID int&#10;OrderDate datetime"
                class="erdl-textarea"
              ></textarea>
            </div>
            <div class="editor-right">
              <div class="syntax-help">
                <h4>ERDL语法说明</h4>
                <ul>
                  <li><code>TableName-</code> 定义表名</li>
                  <li><code>ColumnName type</code> 定义字段</li>
                  <li>支持类型: int, varchar(n), string, text, date, datetime等</li>
                  <li>以ID结尾的字段自动识别为主键/外键</li>
                </ul>
              </div>
              <div class="parse-errors" v-if="parseErrors.length > 0">
                <h4>解析错误</h4>
                <ul>
                  <li v-for="error in parseErrors" :key="error" class="error">{{ error }}</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div class="canvas">
            <div class="table-card" v-for="table in tables" :key="table.id">
              <h3>{{ table.name }}</h3>
              <p v-if="table.businessComment" class="table-comment">{{ table.businessComment }}</p>
              <div class="columns">
                <div v-for="column in table.columns" :key="column.id" class="column" :class="{ primary: column.isPrimaryKey, foreign: column.isForeignKey }">
                  <span class="column-name">{{ column.name }}</span>
                  <span class="column-type">{{ column.type }}</span>
                  <span v-if="column.isPrimaryKey" class="key-indicator pk">PK</span>
                  <span v-if="column.isForeignKey" class="key-indicator fk">FK</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 数据管理视图 -->
      <div v-if="currentView === 'data'" class="data-management">
        <div class="data-header">
          <h2>数据管理</h2>
          <div class="data-actions">
            <select v-model="selectedTableId" @change="switchTable" class="table-selector">
              <option value="">选择表</option>
              <option v-for="table in tables" :key="table.id" :value="table.id">
                {{ table.name }}
              </option>
            </select>
            <button @click="goBackToErdl" class="btn-secondary">返回编辑器</button>
          </div>
        </div>
        
        <div v-if="!selectedTable" class="table-selection">
          <p>请选择一个表开始数据管理</p>
          <div class="table-grid">
            <div 
              v-for="table in tables" 
              :key="table.id" 
              @click="selectTable(table.id)"
              class="table-card-mini"
            >
              <h4>{{ table.name }}</h4>
              <p v-if="table.businessComment">{{ table.businessComment }}</p>
              <span class="column-count">{{ table.columns.length }} 个字段</span>
            </div>
          </div>
        </div>
        
        <div v-else class="table-management">
          <div class="management-tabs">
            <button 
              @click="activeTab = 'list'" 
              :class="['tab-btn', { active: activeTab === 'list' }]"
            >
              数据列表
            </button>
            <button 
              @click="activeTab = 'form'" 
              :class="['tab-btn', { active: activeTab === 'form' }]"
            >
              {{ editingRecord ? '编辑记录' : '新增记录' }}
            </button>
          </div>
          
          <div class="tab-content">
            <DynamicList 
              v-if="activeTab === 'list'"
              :table="selectedTable"
              :data="getTableData(selectedTable.id)"
              :loading="dataLoading"
              @add="showAddForm"
              @edit="showEditForm"
              @delete="deleteRecord"
              @refresh="refreshTableData"
            />
            
            <DynamicForm 
              v-if="activeTab === 'form'"
              :table="selectedTable"
              :edit-data="editingRecord"
              @submit="saveRecord"
              @cancel="cancelForm"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { parseERDL, SAMPLE_ERDL } from '~/utils/erdl-parser'
import type { Table } from '~/types/model'
import DynamicForm from '~/components/DynamicForm.vue'
import DynamicList from '~/components/DynamicList.vue'

const isLoaded = ref(false)
const viewMode = ref('business')
const showERDLEditor = ref(false)
const currentView = ref<'erdl' | 'data'>('erdl')
const erdlText = ref('')
const parseErrors = ref<string[]>([])
const tables = ref<Table[]>([])

// 数据管理相关状态
const selectedTableId = ref('')
const activeTab = ref<'list' | 'form'>('list')
const editingRecord = ref(null)
const dataLoading = ref(false)
const tableData = ref<Record<string, any[]>>({})

// 计算属性
const selectedTable = computed(() => {
  return tables.value.find(table => table.id === selectedTableId.value) || null
})

// 方法
const toggleView = () => {
  viewMode.value = viewMode.value === 'business' ? 'technical' : 'business'
}

const parseERDLText = () => {
  try {
    const result = parseERDL(erdlText.value)
    tables.value = result.tables
    parseErrors.value = result.errors
    saveData()
  } catch (error) {
    parseErrors.value = [error instanceof Error ? error.message : '解析失败']
  }
}

const loadSample = () => {
  erdlText.value = SAMPLE_ERDL
  parseERDLText()
}

const goToDataManagement = () => {
  currentView.value = 'data'
}

const goBackToErdl = () => {
  currentView.value = 'erdl'
}

const selectTable = (tableId: string) => {
  selectedTableId.value = tableId
  activeTab.value = 'list'
  refreshTableData()
}

const switchTable = () => {
  activeTab.value = 'list'
  editingRecord.value = null
  refreshTableData()
}

const getTableData = (tableId: string) => {
  return tableData.value[tableId] || []
}

const refreshTableData = () => {
  if (!selectedTable.value) return
  
  dataLoading.value = true
  setTimeout(() => {
    const data = loadTableData(selectedTable.value!.id)
    tableData.value[selectedTable.value!.id] = data
    dataLoading.value = false
  }, 500)
}

const loadTableData = (tableId: string) => {
  const stored = localStorage.getItem(`table_data_${tableId}`)
  return stored ? JSON.parse(stored) : []
}

const saveTableData = (tableId: string, data: any[]) => {
  localStorage.setItem(`table_data_${tableId}`, JSON.stringify(data))
  tableData.value[tableId] = data
}

const showAddForm = () => {
  editingRecord.value = null
  activeTab.value = 'form'
}

const showEditForm = (record: any) => {
  editingRecord.value = record
  activeTab.value = 'form'
}

const saveRecord = (record: any) => {
  if (!selectedTable.value) return
  
  const tableId = selectedTable.value.id
  const currentData = getTableData(tableId)
  
  if (editingRecord.value) {
    // 编辑模式
    const index = currentData.findIndex(item => item.id === editingRecord.value.id)
    if (index !== -1) {
      currentData[index] = { ...record, id: editingRecord.value.id }
    }
  } else {
    // 新增模式
    const newRecord = { ...record, id: Date.now().toString() }
    currentData.push(newRecord)
  }
  
  saveTableData(tableId, currentData)
  editingRecord.value = null
  activeTab.value = 'list'
}

const deleteRecord = (record: any) => {
  if (!selectedTable.value) return
  
  const tableId = selectedTable.value.id
  const currentData = getTableData(tableId)
  const filteredData = currentData.filter(item => item.id !== record.id)
  
  saveTableData(tableId, filteredData)
}

const cancelForm = () => {
  editingRecord.value = null
  activeTab.value = 'list'
}

const saveData = () => {
  const data = {
    erdlText: erdlText.value,
    tables: tables.value,
    currentView: currentView.value
  }
  localStorage.setItem('modelflow_data', JSON.stringify(data))
}

const loadData = () => {
  const stored = localStorage.getItem('modelflow_data')
  if (stored) {
    try {
      const data = JSON.parse(stored)
      erdlText.value = data.erdlText || ''
      tables.value = data.tables || []
      currentView.value = data.currentView || 'erdl'
      
      if (tables.value.length > 0) {
        showERDLEditor.value = true
      }
    } catch (error) {
      console.error('加载数据失败:', error)
    }
  }
}

onMounted(() => {
  setTimeout(() => {
    isLoaded.value = true
    loadData()
  }, 1000)
})
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.main-content {
  max-width: 1400px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.welcome-message {
  text-align: center;
  padding: 60px 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.welcome-message h2 {
  color: #2c3e50;
  margin-bottom: 10px;
  font-size: 2.5em;
}

.welcome-message p {
  color: #7f8c8d;
  margin-bottom: 30px;
  font-size: 1.2em;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 30px;
  border-radius: 25px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

.erdl-editor {
  padding: 20px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #ecf0f1;
}

.editor-header h3 {
  color: #2c3e50;
  margin: 0;
}

.editor-actions {
  display: flex;
  gap: 10px;
}

.sample-btn {
  background: #3498db;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.sample-btn:hover {
  background: #2980b9;
}

.btn-success {
  background: #27ae60;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.btn-success:hover:not(:disabled) {
  background: #229954;
}

.btn-success:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}

.editor-content {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 20px;
  margin-bottom: 30px;
}

.erdl-textarea {
  width: 100%;
  height: 300px;
  padding: 15px;
  border: 2px solid #ecf0f1;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
  transition: border-color 0.3s ease;
}

.erdl-textarea:focus {
  outline: none;
  border-color: #3498db;
}

.syntax-help {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 15px;
}

.syntax-help h4 {
  margin: 0 0 10px 0;
  color: #2c3e50;
}

.syntax-help ul {
  margin: 0;
  padding-left: 20px;
}

.syntax-help li {
  margin-bottom: 5px;
  font-size: 14px;
}

.syntax-help code {
  background: #e9ecef;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
}

.parse-errors {
  background: #fff5f5;
  border: 1px solid #fed7d7;
  border-radius: 8px;
  padding: 15px;
}

.parse-errors h4 {
  margin: 0 0 10px 0;
  color: #e53e3e;
}

.parse-errors .error {
  color: #e53e3e;
  font-size: 14px;
  margin-bottom: 5px;
}

.canvas {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  min-height: 200px;
}

.table-card {
  background: white;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease;
}

.table-card:hover {
  transform: translateY(-2px);
}

.table-card h3 {
  margin: 0 0 10px 0;
  color: #2c3e50;
  font-size: 18px;
}

.table-comment {
  color: #7f8c8d;
  font-style: italic;
  margin-bottom: 15px;
  font-size: 14px;
}

.columns {
  border-top: 2px solid #ecf0f1;
}

.column {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #ecf0f1;
}

.column:last-child {
  border-bottom: none;
}

.column.primary {
  background: #fff3cd;
}

.column.foreign {
  background: #d1ecf1;
}

.column-name {
  font-weight: 500;
  color: #2c3e50;
}

.column-type {
  color: #7f8c8d;
  font-size: 12px;
}

.key-indicator {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: bold;
}

.key-indicator.pk {
  background: #ffeaa7;
  color: #d63031;
}

.key-indicator.fk {
  background: #74b9ff;
  color: white;
}

/* 数据管理样式 */
.data-management {
  padding: 20px;
}

.data-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #ecf0f1;
}

.data-header h2 {
  color: #2c3e50;
  margin: 0;
}

.data-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.table-selector {
  padding: 8px 12px;
  border: 2px solid #ecf0f1;
  border-radius: 6px;
  background: white;
  cursor: pointer;
}

.btn-secondary {
  background: #95a5a6;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.btn-secondary:hover {
  background: #7f8c8d;
}

.table-selection {
  text-align: center;
  padding: 40px 20px;
}

.table-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
  margin-top: 20px;
}

.table-card-mini {
  background: #f8f9fa;
  border: 2px solid #ecf0f1;
  border-radius: 8px;
  padding: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.table-card-mini:hover {
  border-color: #3498db;
  transform: translateY(-2px);
}

.table-card-mini h4 {
  margin: 0 0 8px 0;
  color: #2c3e50;
}

.table-card-mini p {
  margin: 0 0 8px 0;
  color: #7f8c8d;
  font-size: 14px;
}

.column-count {
  color: #95a5a6;
  font-size: 12px;
}

.management-tabs {
  display: flex;
  border-bottom: 2px solid #ecf0f1;
  margin-bottom: 20px;
}

.tab-btn {
  background: none;
  border: none;
  padding: 12px 24px;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  transition: all 0.3s ease;
  font-size: 16px;
  color: #7f8c8d;
}

.tab-btn.active {
  color: #3498db;
  border-bottom-color: #3498db;
}

.tab-btn:hover {
  color: #2c3e50;
}

.tab-content {
  min-height: 400px;
}
</style>