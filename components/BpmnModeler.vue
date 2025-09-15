<template>
  <div class="bpmn-modeler">
    <el-card>
      <template #header>
        <div class="modeler-header">
          <span>BPMN 流程设计器</span>
          <div class="modeler-actions">
            <el-button @click="newDiagram" :loading="loading">新建流程</el-button>
            <el-button @click="saveDiagram" type="primary" :loading="saving">保存流程</el-button>
            <el-button @click="exportDiagram">导出XML</el-button>
            <el-button @click="importDiagram">导入XML</el-button>
            <el-button @click="toggleDataPanel">{{ showDataPanel ? '隐藏' : '显示' }}数据模型</el-button>
          </div>
        </div>
      </template>
      
      <div class="modeler-container">
        <div class="modeler-canvas" ref="canvasRef"></div>
        
        <!-- 数据模型面板 -->
        <div v-if="showDataPanel" class="data-model-panel">
          <div class="panel-header">
            <h4>数据模型</h4>
            <p>拖拽表到流程中使用</p>
          </div>
          
          <div class="model-list">
            <div v-if="!tables.length" class="empty-state">
              <p>暂无数据模型</p>
              <small>请先在数据建模中创建表</small>
            </div>
            
            <div v-else class="table-items">
              <div 
                v-for="table in tables" 
                :key="table.id"
                class="table-item"
                draggable="true"
                @dragstart="handleDragStart($event, table)"
              >
                <div class="table-info">
                  <h5>{{ table.name }}</h5>
                  <p v-if="table.businessComment">{{ table.businessComment }}</p>
                  <div class="column-preview">
                    <span 
                      v-for="column in table.columns.slice(0, 3)" 
                      :key="column.id"
                      class="column-tag"
                      :class="{ primary: column.isPrimaryKey }"
                    >
                      {{ column.name }}
                    </span>
                    <span v-if="table.columns.length > 3" class="more-columns">
                      +{{ table.columns.length - 3 }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modeler-properties" ref="propertiesRef"></div>
      </div>
    </el-card>
    
    <!-- 导入对话框 -->
    <el-dialog v-model="importDialogVisible" title="导入BPMN XML" width="600px">
      <el-input
        v-model="importXml"
        type="textarea"
        :rows="10"
        placeholder="请粘贴BPMN XML内容"
      />
      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleImport" :loading="importing">导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import BpmnModeler from 'bpmn-js/lib/Modeler'
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule,
} from 'bpmn-js-properties-panel'
import { ElMessage } from 'element-plus'

interface Props {
  initialXml?: string
  tables?: Array<{
    id: string
    name: string
    businessComment?: string
    columns: Array<{
      id: string
      name: string
      isPrimaryKey?: boolean
    }>
  }>
}

interface Emits {
  save: [xml: string]
  export: [xml: string]
}

const props = withDefaults(defineProps<Props>(), {
  initialXml: '',
  tables: () => []
})

const emit = defineEmits<Emits>()

// 响应式数据
const canvasRef = ref<HTMLElement>()
const propertiesRef = ref<HTMLElement>()
const loading = ref(false)
const saving = ref(false)
const importing = ref(false)
const importDialogVisible = ref(false)
const importXml = ref('')
const showDataPanel = ref(false)
const tables = computed(() => props.tables || [])

let modeler: BpmnModeler | null = null

// 默认BPMN XML
const defaultXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn" exporter="Camunda Modeler" exporterVersion="5.0.0">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="179" y="79" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`

// 初始化BPMN建模器
const initModeler = async () => {
  if (!canvasRef.value || !propertiesRef.value) return
  
  loading.value = true
  
  try {
    modeler = new BpmnModeler({
      container: canvasRef.value,
      propertiesPanel: {
        parent: propertiesRef.value
      },
      additionalModules: [
        BpmnPropertiesPanelModule,
        BpmnPropertiesProviderModule
      ]
    })
    
    // 导入初始XML
    const xmlToImport = props.initialXml || defaultXml
    await modeler.importXML(xmlToImport)
    
    // 适应画布大小
    const canvas = modeler.get('canvas')
    canvas.zoom('fit-viewport')
    
    ElMessage.success('BPMN建模器初始化成功')
  } catch (error) {
    console.error('初始化BPMN建模器失败:', error)
    ElMessage.error('初始化BPMN建模器失败')
  } finally {
    loading.value = false
  }
}

// 新建流程图
const newDiagram = async () => {
  if (!modeler) return
  
  loading.value = true
  try {
    await modeler.importXML(defaultXml)
    const canvas = modeler.get('canvas')
    canvas.zoom('fit-viewport')
    ElMessage.success('新建流程图成功')
  } catch (error) {
    console.error('新建流程图失败:', error)
    ElMessage.error('新建流程图失败')
  } finally {
    loading.value = false
  }
}

// 保存流程图
const saveDiagram = async () => {
  if (!modeler) return
  
  saving.value = true
  try {
    const { xml } = await modeler.saveXML({ format: true })
    emit('save', xml)
    ElMessage.success('保存流程图成功')
  } catch (error) {
    console.error('保存流程图失败:', error)
    ElMessage.error('保存流程图失败')
  } finally {
    saving.value = false
  }
}

// 导出流程图
const exportDiagram = async () => {
  if (!modeler) return
  
  try {
    const { xml } = await modeler.saveXML({ format: true })
    
    // 创建下载链接
    const blob = new Blob([xml], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `process_${Date.now()}.bpmn`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    emit('export', xml)
    ElMessage.success('导出流程图成功')
  } catch (error) {
    console.error('导出流程图失败:', error)
    ElMessage.error('导出流程图失败')
  }
}

// 导入流程图
const importDiagram = () => {
  importXml.value = ''
  importDialogVisible.value = true
}

// 处理导入
const handleImport = async () => {
  if (!modeler || !importXml.value.trim()) {
    ElMessage.warning('请输入有效的BPMN XML内容')
    return
  }
  
  importing.value = true
  try {
    await modeler.importXML(importXml.value)
    const canvas = modeler.get('canvas')
    canvas.zoom('fit-viewport')
    importDialogVisible.value = false
    ElMessage.success('导入流程图成功')
  } catch (error) {
    console.error('导入流程图失败:', error)
    ElMessage.error('导入流程图失败，请检查XML格式')
  } finally {
    importing.value = false
  }
}

// 切换数据模型面板
const toggleDataPanel = () => {
  showDataPanel.value = !showDataPanel.value
}

// 处理拖拽开始
const handleDragStart = (event: DragEvent, table: any) => {
  if (event.dataTransfer) {
    event.dataTransfer.setData('application/json', JSON.stringify({
      type: 'data-table',
      table: table
    }))
  }
}

// 获取当前XML
const getCurrentXml = async (): Promise<string> => {
  if (!modeler) return ''
  
  try {
    const { xml } = await modeler.saveXML({ format: true })
    return xml
  } catch (error) {
    console.error('获取XML失败:', error)
    return ''
  }
}

// 暴露方法给父组件
defineExpose({
  getCurrentXml,
  newDiagram,
  saveDiagram,
  exportDiagram,
  toggleDataPanel
})

// 生命周期
onMounted(() => {
  initModeler()
})

onUnmounted(() => {
  if (modeler) {
    modeler.destroy()
  }
})
</script>

<style scoped>
.bpmn-modeler {
  margin: 20px;
}

.modeler-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modeler-actions {
  display: flex;
  gap: 10px;
}

.modeler-container {
  display: flex;
  height: 600px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
}

.modeler-canvas {
  flex: 1;
  position: relative;
}

.data-model-panel {
  width: 280px;
  border-left: 1px solid #e4e7ed;
  background: #f8f9fa;
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid #e4e7ed;
  background: #fff;
}

.panel-header h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.panel-header p {
  margin: 0;
  font-size: 12px;
  color: #909399;
}

.model-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #909399;
}

.empty-state p {
  margin: 0 0 4px 0;
  font-size: 14px;
}

.empty-state small {
  font-size: 12px;
}

.table-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.table-item {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 12px;
  cursor: grab;
  transition: all 0.2s;
}

.table-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.table-item:active {
  cursor: grabbing;
}

.table-info h5 {
  margin: 0 0 4px 0;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.table-info p {
  margin: 0 0 8px 0;
  font-size: 12px;
  color: #606266;
  line-height: 1.4;
}

.column-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.column-tag {
  display: inline-block;
  padding: 2px 6px;
  font-size: 11px;
  background: #f0f2f5;
  color: #606266;
  border-radius: 3px;
  line-height: 1.2;
}

.column-tag.primary {
  background: #e1f3d8;
  color: #67c23a;
}

.more-columns {
  font-size: 11px;
  color: #909399;
  padding: 2px 4px;
}

.modeler-properties {
  width: 300px;
  border-left: 1px solid #e4e7ed;
  background: #fafafa;
  overflow-y: auto;
}

/* BPMN.js 样式覆盖 */
:deep(.djs-palette) {
  left: 20px;
  top: 20px;
}

:deep(.bpp-properties-panel) {
  background: #fafafa;
}

:deep(.bpp-properties-panel .bio-properties-panel-header) {
  background: #f5f5f5;
  border-bottom: 1px solid #e4e7ed;
}
</style>