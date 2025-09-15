<template>
  <div id="app">
    <div class="header">
      <h1>ModelFlow - 数据库模型设计工具</h1>
      <p v-if="!isLoaded">应用正在初始化...</p>
    </div>
    
    <div class="main-content" v-if="isLoaded">
      <div class="toolbar">
        <button @click="toggleView">切换视图: {{ viewMode }}</button>
        <button @click="saveData">保存</button>
        <button @click="showERDLEditor = !showERDLEditor" :class="{ active: showERDLEditor }">
          {{ showERDLEditor ? '隐藏' : '显示' }} ERDL编辑器
        </button>
        <button @click="parseERDLText" :disabled="!erdlText.trim()">解析ERDL</button>
      </div>
      
      <!-- ERDL编辑器 -->
      <div class="erdl-editor" v-if="showERDLEditor">
        <div class="editor-header">
          <h3>ERDL语法编辑器</h3>
          <button @click="loadSample" class="sample-btn">加载示例</button>
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
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { parseERDL, SAMPLE_ERDL } from '~/utils/erdl-parser'
import type { Table } from '~/types/model'

const isLoaded = ref(false)
const viewMode = ref('business')
const showERDLEditor = ref(false)
const erdlText = ref('')
const parseErrors = ref<string[]>([])
const tables = ref<Table[]>([
  {
    id: '1',
    name: '用户表',
    businessName: '用户表',
    businessComment: '系统用户信息',
    position: { x: 100, y: 100 },
    comments: [],
    columns: [
      { 
        id: '1', 
        name: 'id', 
        type: 'BIGINT', 
        businessName: 'ID',
        businessComment: '主键',
        isPrimaryKey: true,
        isForeignKey: false,
        isRequired: true,
        comments: []
      },
      { 
        id: '2', 
        name: 'name', 
        type: 'VARCHAR(50)',
        businessName: '姓名',
        businessComment: '用户姓名',
        isPrimaryKey: false,
        isForeignKey: false,
        isRequired: true,
        comments: []
      }
    ]
  }
])

const toggleView = () => {
  viewMode.value = viewMode.value === 'business' ? 'technical' : 'business'
}

const saveData = () => {
  if (typeof window !== 'undefined') {
    const data = {
      tables: tables.value,
      erdlText: erdlText.value,
      viewMode: viewMode.value
    }
    localStorage.setItem('modelflow-data', JSON.stringify(data))
    console.log('数据已保存')
  }
}

const loadSample = () => {
  erdlText.value = SAMPLE_ERDL
}

const parseERDLText = () => {
  if (!erdlText.value.trim()) {
    parseErrors.value = ['请输入ERDL语法文本']
    return
  }
  
  const result = parseERDL(erdlText.value)
  
  if (result.success) {
    // 为表设置位置
    result.tables.forEach((table, index) => {
      table.position = {
        x: 100 + (index % 3) * 300,
        y: 100 + Math.floor(index / 3) * 250
      }
    })
    
    tables.value = result.tables
    parseErrors.value = []
    console.log('ERDL解析成功，生成了', result.tables.length, '个表')
  } else {
    parseErrors.value = result.errors
    console.error('ERDL解析失败:', result.errors)
  }
}

const loadData = () => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('modelflow-data')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        if (data.tables) {
          tables.value = data.tables
        }
        if (data.erdlText) {
          erdlText.value = data.erdlText
        }
        if (data.viewMode) {
          viewMode.value = data.viewMode
        }
      } catch (error) {
        console.error('加载数据失败:', error)
      }
    }
  }
}

onMounted(() => {
  setTimeout(() => {
    isLoaded.value = true
    loadData()
    console.log('应用初始化完成')
  }, 1000)
})
</script>

<style scoped>
#app {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 0;
  min-height: 100vh;
  background: #f5f5f5;
}

.header {
  background: white;
  padding: 20px;
  text-align: center;
  border-bottom: 1px solid #ddd;
}

.header h1 {
  margin: 0 0 10px 0;
  color: #333;
}

.main-content {
  padding: 20px;
}

.toolbar {
  background: white;
  padding: 15px;
  margin-bottom: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.toolbar button {
  margin-right: 10px;
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
}

.toolbar button:hover {
  background: #f0f0f0;
}

.canvas {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.table-card {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  min-width: 200px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.table-card h3 {
  margin: 0 0 10px 0;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 5px;
}

.column {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  font-size: 14px;
  color: #666;
  border-bottom: 1px solid #f0f0f0;
  gap: 8px;
}

.column:last-child {
  border-bottom: none;
}

.column.primary {
  background: #fff7e6;
  border-left: 3px solid #faad14;
}

.column.foreign {
  background: #f6ffed;
  border-left: 3px solid #52c41a;
}

.column-name {
  font-weight: 500;
  color: #333;
  min-width: 80px;
}

.column-type {
  color: #666;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  flex: 1;
}

.key-indicator {
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 2px;
  font-weight: bold;
}

.key-indicator.pk {
  background: #faad14;
  color: white;
}

.key-indicator.fk {
  background: #52c41a;
  color: white;
}

.table-comment {
  margin: 5px 0 10px 0;
  font-size: 12px;
  color: #999;
  font-style: italic;
}

/* ERDL编辑器样式 */
.erdl-editor {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-bottom: 20px;
  overflow: hidden;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #ddd;
}

.editor-header h3 {
  margin: 0;
  color: #333;
  font-size: 16px;
}

.sample-btn {
  padding: 6px 12px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.sample-btn:hover {
  background: #40a9ff;
}

.editor-content {
  display: flex;
  min-height: 300px;
}

.editor-left {
  flex: 2;
  border-right: 1px solid #ddd;
}

.editor-right {
  flex: 1;
  padding: 15px;
  background: #fafafa;
}

.erdl-textarea {
  width: 100%;
  height: 300px;
  border: none;
  padding: 15px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  outline: none;
}

.syntax-help h4 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 14px;
}

.syntax-help ul {
  margin: 0;
  padding-left: 20px;
  font-size: 12px;
  color: #666;
}

.syntax-help li {
  margin-bottom: 5px;
}

.syntax-help code {
  background: #f0f0f0;
  padding: 2px 4px;
  border-radius: 2px;
  font-family: 'Courier New', monospace;
}

.parse-errors {
  margin-top: 20px;
}

.parse-errors h4 {
  margin: 0 0 10px 0;
  color: #ff4d4f;
  font-size: 14px;
}

.parse-errors ul {
  margin: 0;
  padding-left: 20px;
}

.parse-errors .error {
  color: #ff4d4f;
  font-size: 12px;
  margin-bottom: 5px;
}

.toolbar button.active {
  background: #1890ff;
  color: white;
}

.toolbar button:disabled {
  background: #f5f5f5;
  color: #ccc;
  cursor: not-allowed;
}
</style>