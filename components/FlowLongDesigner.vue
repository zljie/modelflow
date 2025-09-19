<template>
  <div class="flowlong-designer">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-button-group>
          <el-button @click="undo" :disabled="!canUndo" size="small" title="撤销">
            <el-icon><RefreshLeft /></el-icon>
          </el-button>
          <el-button @click="redo" :disabled="!canRedo" size="small" title="重做">
            <el-icon><RefreshRight /></el-icon>
          </el-button>
        </el-button-group>
        
        <el-divider direction="vertical" />
        
        <el-button @click="importProcess" size="small" title="导入流程">
          <el-icon><Upload /></el-icon>
          导入
        </el-button>
        <el-button @click="exportProcess" size="small" title="导出流程">
          <el-icon><Download /></el-icon>
          导出
        </el-button>
        
        <el-divider direction="vertical" />
        
        <el-button @click="saveProcess" type="primary" size="small">
          <el-icon><DocumentAdd /></el-icon>
          保存流程
        </el-button>
        <el-button @click="previewProcess" size="small">
          <el-icon><View /></el-icon>
          预览
        </el-button>
        <el-button @click="clearCanvas" type="danger" size="small">
          <el-icon><Delete /></el-icon>
          清空画布
        </el-button>
      </div>
      
      <div class="toolbar-center">
        <el-input 
          v-model="processData.name" 
          placeholder="请输入流程名称" 
          style="width: 200px;"
        />
      </div>
      
      <div class="toolbar-right">
        <el-button-group>
          <el-button @click="zoomOut" :disabled="zoomLevel <= 0.5" size="small" title="缩小">
            <el-icon><ZoomOut /></el-icon>
          </el-button>
          <el-button size="small" style="min-width: 60px;">{{ Math.round(zoomLevel * 100) }}%</el-button>
          <el-button @click="zoomIn" :disabled="zoomLevel >= 2" size="small" title="放大">
            <el-icon><ZoomIn /></el-icon>
          </el-button>
          <el-button @click="resetZoom" size="small" title="重置缩放">
            <el-icon><Refresh /></el-icon>
          </el-button>
        </el-button-group>
        
        <el-divider direction="vertical" />
        
        <el-button @click="toggleDataPanel" size="small">
          <el-icon><Grid /></el-icon>
          数据面板
        </el-button>
        <el-button @click="toggleMiniMap" size="small" title="小地图">
          <el-icon><Location /></el-icon>
        </el-button>
      </div>
    </div>
    
    <!-- 文件导入隐藏input -->
    <input 
      ref="fileInput" 
      type="file" 
      accept=".json,.xml" 
      style="display: none" 
      @change="handleFileImport"
    />

    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 节点面板 -->
      <div class="node-panel">
        <h4>流程节点</h4>
        
        <!-- 基础节点 -->
        <div class="node-category">
          <h5>基础节点</h5>
          <div class="node-types">
            <div 
              v-for="nodeType in nodeTypes.filter(n => n.category === 'basic')" 
              :key="nodeType.type"
              class="node-type-item"
              draggable="true"
              @dragstart="handleNodeDragStart($event, nodeType)"
            >
              <el-icon><component :is="nodeType.icon" /></el-icon>
              <span>{{ nodeType.label }}</span>
            </div>
          </div>
        </div>

        <!-- 网关节点 -->
        <div class="node-category">
          <h5>网关节点</h5>
          <div class="node-types">
            <div 
              v-for="nodeType in nodeTypes.filter(n => n.category === 'gateway')" 
              :key="nodeType.type"
              class="node-type-item"
              draggable="true"
              @dragstart="handleNodeDragStart($event, nodeType)"
            >
              <el-icon><component :is="nodeType.icon" /></el-icon>
              <span>{{ nodeType.label }}</span>
            </div>
          </div>
        </div>

        <!-- 审批节点 -->
        <div class="node-category">
          <h5>审批节点</h5>
          <div class="node-types">
            <div 
              v-for="nodeType in nodeTypes.filter(n => n.category === 'approval')" 
              :key="nodeType.type"
              class="node-type-item"
              draggable="true"
              @dragstart="handleNodeDragStart($event, nodeType)"
            >
              <el-icon><component :is="nodeType.icon" /></el-icon>
              <span>{{ nodeType.label }}</span>
            </div>
          </div>
        </div>

        <!-- 事件节点 -->
        <div class="node-category">
          <h5>事件节点</h5>
          <div class="node-types">
            <div 
              v-for="nodeType in nodeTypes.filter(n => ['event', 'notification', 'interaction', 'subprocess', 'data'].includes(n.category))" 
              :key="nodeType.type"
              class="node-type-item"
              draggable="true"
              @dragstart="handleNodeDragStart($event, nodeType)"
            >
              <el-icon><component :is="nodeType.icon" /></el-icon>
              <span>{{ nodeType.label }}</span>
            </div>
          </div>
        </div>
        
        <!-- 数据表面板 -->
        <div v-if="showDataPanel" class="data-panel">
          <h4>数据表</h4>
          <div class="table-list">
            <div 
              v-for="table in tables" 
              :key="table.id"
              class="table-item"
              draggable="true"
              @dragstart="handleTableDragStart($event, table)"
            >
              <strong>{{ table.name }}</strong>
              <div class="table-fields">
                <span v-for="field in table.fields?.slice(0, 3)" :key="field.name" class="field-item">
                  {{ field.name }}
                </span>
                <span v-if="table.fields?.length > 3" class="more-fields">
                  +{{ table.fields.length - 3 }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 画布区域 -->
      <div class="canvas-container">
        <div 
          class="canvas"
          :style="{ 
            transform: `scale(${zoomLevel}) translate(${canvasTransform.x}px, ${canvasTransform.y}px)`,
            transformOrigin: 'top left'
          }"
          @drop="handleDrop"
          @dragover="handleDragOver"
          @click="clearSelection"
          @mousemove="handleCanvasMouseMove"
        >
          <!-- 流程节点 -->
          <div
            v-for="node in nodes"
            :key="node.id"
            class="flow-node"
            :class="{ 
              selected: selectedNode?.id === node.id,
              [node.type]: true 
            }"
            :style="{ 
              left: node.position.x + 'px', 
              top: node.position.y + 'px' 
            }"
            @click.stop="selectNode(node)"
            @mousedown="startDrag($event, node)"
          >
            <!-- 输入连接点 -->
            <div 
              v-if="node.type !== 'start'"
              class="connection-point input"
              @click.stop="handleConnectionPoint(node, 'input')"
              @mouseenter="highlightConnectionPoint"
              @mouseleave="unhighlightConnectionPoint"
            ></div>
            
            <!-- 节点内容 -->
            <div class="node-content">
              <el-icon><component :is="getNodeIcon(node.type)" /></el-icon>
              <span>{{ node.label }}</span>
            </div>
            
            <!-- 输出连接点 -->
            <div 
              v-if="node.type !== 'end'"
              class="connection-point output"
              @click.stop="handleConnectionPoint(node, 'output')"
              @mouseenter="highlightConnectionPoint"
              @mouseleave="unhighlightConnectionPoint"
            ></div>
          </div>

          <!-- 连接线 -->
          <svg class="connections-layer">
            <path
              v-for="connection in connections"
              :key="connection.id"
              :d="getConnectionPath(connection)"
              class="connection-line"
              :class="{ selected: selectedConnection?.id === connection.id }"
              @click="selectConnection(connection)"
            />
            
            <!-- 临时连接线 -->
            <path
              v-if="connectingNode && mousePosition"
              :d="getTempConnectionPath()"
              class="temp-connection-line"
            />
          </svg>
        </div>
      </div>

      <!-- 属性面板 -->
      <div class="property-panel">
        <div v-if="selectedNode" class="node-properties">
          <h4>{{ selectedNode.label }} - 属性配置</h4>
          <el-form label-width="100px" size="small">
            <el-form-item label="节点名称">
              <el-input v-model="selectedNode.label" />
            </el-form-item>
            
            <el-form-item label="节点ID">
              <el-input v-model="selectedNode.id" disabled />
            </el-form-item>
            
            <!-- 基础节点配置 -->
            <template v-if="['start', 'end'].includes(selectedNode.type)">
              <el-form-item label="描述">
                <el-input 
                  v-model="selectedNode.config.description" 
                  type="textarea" 
                  :rows="2"
                  placeholder="节点描述"
                />
              </el-form-item>
            </template>
            
            <!-- 任务节点配置 -->
            <template v-if="selectedNode.type === 'task'">
              <el-form-item label="任务类型">
                <el-select v-model="selectedNode.config.taskType" placeholder="选择任务类型">
                  <el-option label="用户任务" value="userTask" />
                  <el-option label="服务任务" value="serviceTask" />
                  <el-option label="脚本任务" value="scriptTask" />
                </el-select>
              </el-form-item>
              <el-form-item label="执行人">
                <el-input v-model="selectedNode.config.assignee" placeholder="执行人" />
              </el-form-item>
              <el-form-item label="候选人">
                <el-input v-model="selectedNode.config.candidateUsers" placeholder="候选人，逗号分隔" />
              </el-form-item>
            </template>
            
            <!-- 审批节点配置 -->
            <template v-if="['approval', 'sequential', 'parallel_sign', 'or_sign', 'vote_sign'].includes(selectedNode.type)">
              <el-form-item label="审批类型">
                <el-select v-model="selectedNode.config.approvalType" placeholder="选择审批类型">
                  <el-option label="单人审批" value="single" />
                  <el-option label="多人审批" value="multiple" />
                  <el-option label="会签" value="countersign" />
                </el-select>
              </el-form-item>
              <el-form-item label="审批人">
                <el-select 
                  v-model="selectedNode.config.approvers" 
                  multiple 
                  placeholder="选择审批人"
                  style="width: 100%"
                >
                  <el-option label="张三" value="zhangsan" />
                  <el-option label="李四" value="lisi" />
                  <el-option label="王五" value="wangwu" />
                  <el-option label="赵六" value="zhaoliu" />
                </el-select>
              </el-form-item>
              <el-form-item v-if="selectedNode.type === 'vote_sign'" label="通过比例">
                <el-input-number 
                  v-model="selectedNode.config.passRatio" 
                  :min="0" 
                  :max="100" 
                  :step="10"
                  placeholder="通过比例(%)"
                />
              </el-form-item>
            </template>
            
            <!-- 条件分支配置 -->
            <template v-if="['condition', 'inclusive', 'route'].includes(selectedNode.type)">
              <el-form-item label="条件表达式">
                <el-input 
                  v-model="selectedNode.config.condition" 
                  type="textarea" 
                  :rows="3"
                  placeholder="输入条件表达式"
                />
              </el-form-item>
              <el-form-item label="默认分支">
                <el-switch v-model="selectedNode.config.isDefault" />
              </el-form-item>
            </template>
            
            <!-- 定时器配置 -->
            <template v-if="selectedNode.type === 'timer'">
              <el-form-item label="定时类型">
                <el-select v-model="selectedNode.config.timerType" placeholder="选择定时类型">
                  <el-option label="延时" value="duration" />
                  <el-option label="定时" value="date" />
                  <el-option label="周期" value="cycle" />
                </el-select>
              </el-form-item>
              <el-form-item label="时间配置">
                <el-input v-model="selectedNode.config.timerValue" placeholder="时间配置" />
              </el-form-item>
            </template>
            
            <!-- 子流程配置 -->
            <template v-if="selectedNode.type === 'subprocess'">
              <el-form-item label="子流程ID">
                <el-input v-model="selectedNode.config.subProcessId" placeholder="子流程ID" />
              </el-form-item>
              <el-form-item label="执行方式">
                <el-select v-model="selectedNode.config.executionType" placeholder="执行方式">
                  <el-option label="同步" value="sync" />
                  <el-option label="异步" value="async" />
                </el-select>
              </el-form-item>
            </template>
            
            <!-- 抄送配置 -->
            <template v-if="selectedNode.type === 'copy'">
              <el-form-item label="抄送人">
                <el-select 
                  v-model="selectedNode.config.copyUsers" 
                  multiple 
                  placeholder="选择抄送人"
                  style="width: 100%"
                >
                  <el-option label="张三" value="zhangsan" />
                  <el-option label="李四" value="lisi" />
                  <el-option label="王五" value="wangwu" />
                </el-select>
              </el-form-item>
            </template>
          </el-form>
          
          <div class="property-actions">
            <el-button @click="deleteNode(selectedNode.id)" type="danger" size="small">
              <el-icon><Delete /></el-icon>
              删除节点
            </el-button>
          </div>
        </div>
        
        <div v-else-if="selectedConnection" class="connection-properties">
          <h4>连接线属性</h4>
          <el-form label-width="80px" size="small">
            <el-form-item label="连接名称">
              <el-input v-model="selectedConnection.label" placeholder="连接线名称" />
            </el-form-item>
            <el-form-item label="连接类型">
              <el-select v-model="selectedConnection.type" placeholder="选择连接类型">
                <el-option label="顺序流" value="sequence" />
                <el-option label="条件流" value="condition" />
                <el-option label="默认流" value="default" />
              </el-select>
            </el-form-item>
            <el-form-item v-if="selectedConnection.type === 'condition'" label="条件表达式">
              <el-input 
                v-model="selectedConnection.condition" 
                type="textarea" 
                :rows="2"
                placeholder="输入条件表达式"
              />
            </el-form-item>
          </el-form>
          
          <div class="property-actions">
            <el-button @click="deleteConnection(selectedConnection.id)" type="danger" size="small">
              <el-icon><Delete /></el-icon>
              删除连接线
            </el-button>
          </div>
        </div>
        
        <div v-else class="no-selection">
          <div class="empty-state">
            <el-icon size="48" color="#c0c4cc"><Setting /></el-icon>
            <p>请选择节点或连接线查看属性</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 预览对话框 -->
    <el-dialog v-model="showPreview" title="流程预览" width="60%">
      <div class="process-preview">
        <pre class="flow-json">{{ JSON.stringify(getProcessJSON(), null, 2) }}</pre>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  DocumentAdd, Delete, View, Grid, Close, 
  User, Share, Bell, Setting,
  VideoPlay, VideoPause, Document, Check,
  QuestionFilled, Connection, CirclePlus,
  Switch, Timer, Message, UserFilled,
  Promotion, Operation, Files, ChatDotRound,
  Position, Finished, Warning, Tools,
  Upload, Download, RefreshLeft, RefreshRight, ZoomIn, 
  ZoomOut, Refresh, Location
} from '@element-plus/icons-vue'

// Props
const props = defineProps({
  tables: {
    type: Array,
    default: () => []
  },
  processXml: {
    type: String,
    default: ''
  }
})

// Emits
const emit = defineEmits(['save', 'update:processXml'])

// 响应式数据
const processData = reactive({
  id: '',
  name: '',
  description: '',
  version: '1.0'
})

const nodes = ref([])
const connections = ref([])
const selectedNode = ref(null)
const selectedConnection = ref(null)
const connectingNode = ref(null)
const mousePosition = ref(null)
const showPreview = ref(false)
const showDataPanel = ref(false)
const showMiniMap = ref(false)

// 缩放相关
const zoomLevel = ref(1)
const canvasTransform = ref({ x: 0, y: 0 })

// 历史记录相关
const history = ref([])
const historyIndex = ref(-1)
const maxHistorySize = 50

// 文件导入相关
const fileInput = ref(null)

// 计数器
const nodeIdCounter = ref(1)
const connectionIdCounter = ref(1)

// 节点类型定义
const nodeTypes = [
  { type: 'start', label: '开始', icon: 'VideoPlay', category: 'basic' },
  { type: 'end', label: '结束', icon: 'VideoPause', category: 'basic' },
  { type: 'task', label: '任务', icon: 'Document', category: 'basic' },
  { type: 'approval', label: '审批', icon: 'Check', category: 'basic' },
  { type: 'condition', label: '条件分支', icon: 'QuestionFilled', category: 'gateway' },
  { type: 'parallel', label: '并行分支', icon: 'Connection', category: 'gateway' },
  { type: 'inclusive', label: '包容分支', icon: 'Switch', category: 'gateway' },
  { type: 'route', label: '路由分支', icon: 'Promotion', category: 'gateway' },
  { type: 'sequential', label: '顺序会签', icon: 'UserFilled', category: 'approval' },
  { type: 'parallel_sign', label: '并行会签', icon: 'Operation', category: 'approval' },
  { type: 'or_sign', label: '或签', icon: 'User', category: 'approval' },
  { type: 'vote_sign', label: '票签', icon: 'Position', category: 'approval' },
  { type: 'copy', label: '抄送', icon: 'Message', category: 'notification' },
  { type: 'timer', label: '定时', icon: 'Timer', category: 'event' },
  { type: 'trigger', label: '触发器', icon: 'Tools', category: 'event' },
  { type: 'subprocess', label: '子流程', icon: 'Files', category: 'subprocess' },
  { type: 'communication', label: '沟通', icon: 'ChatDotRound', category: 'interaction' },
  { type: 'data', label: '数据', icon: 'Grid', category: 'data' }
]

// 计算属性
const tables = computed(() => props.tables || [])

const canUndo = computed(() => historyIndex.value > 0)
const canRedo = computed(() => historyIndex.value < history.value.length - 1)

// 方法
const getNodeIcon = (type) => {
  const iconMap = {
    start: 'VideoPlay',
    end: 'VideoPause',
    task: 'Document',
    approval: 'Check',
    condition: 'QuestionFilled',
    parallel: 'Connection',
    inclusive: 'Switch',
    route: 'Promotion',
    sequential: 'UserFilled',
    parallel_sign: 'Operation',
    or_sign: 'User',
    vote_sign: 'Position',
    copy: 'Message',
    timer: 'Timer',
    trigger: 'Tools',
    subprocess: 'Files',
    communication: 'ChatDotRound',
    data: 'Grid'
  }
  return iconMap[type] || 'CirclePlus'
}

const handleNodeDragStart = (event, nodeType) => {
  event.dataTransfer.setData('nodeType', JSON.stringify(nodeType))
}

const handleTableDragStart = (event, table) => {
  const nodeType = { type: 'data', label: `数据: ${table.name}`, table }
  event.dataTransfer.setData('nodeType', JSON.stringify(nodeType))
}

const handleDragOver = (event) => {
  event.preventDefault()
}

const handleDrop = (event) => {
  event.preventDefault()
  const nodeTypeData = event.dataTransfer.getData('nodeType')
  if (nodeTypeData) {
    const nodeType = JSON.parse(nodeTypeData)
    const rect = event.currentTarget.getBoundingClientRect()
    const position = {
      x: event.clientX - rect.left - 50,
      y: event.clientY - rect.top - 25
    }
    createNode(nodeType, position)
  }
}

const createNode = (nodeType, position) => {
  // 保存到历史记录
  saveToHistory()
  
  const node = {
    id: `node_${nodeIdCounter.value++}`,
    type: nodeType.type,
    label: nodeType.label,
    position,
    config: getDefaultConfig(nodeType.type)
  }
  
  nodes.value.push(node)
  ElMessage.success(`已添加${nodeType.label}节点`)
}

const getDefaultConfig = (type) => {
  const configs = {
    approval: { approvers: [], approvalType: 'single' },
    condition: { condition: '' },
    notify: { notifiers: [], notifyMethods: [] },
    start: {},
    end: {}
  }
  return configs[type] || {}
}

const selectNode = (node) => {
  selectedNode.value = node
  selectedConnection.value = null
}

const clearSelection = (event) => {
  if (event.target.classList.contains('canvas')) {
    selectedNode.value = null
    selectedConnection.value = null
  }
}

const deleteNode = (nodeId) => {
  // 保存到历史记录
  saveToHistory()
  
  nodes.value = nodes.value.filter(n => n.id !== nodeId)
  connections.value = connections.value.filter(c => c.source !== nodeId && c.target !== nodeId)
  selectedNode.value = null
}

const handleConnectionPoint = (node, type) => {
  if (type === 'output') {
    // 如果已经在连线状态，取消连线
    if (connectingNode.value) {
      connectingNode.value = null
      mousePosition.value = null
      ElMessage.info('取消连线')
      return
    }
    
    connectingNode.value = node
    ElMessage.info(`开始从 "${node.label}" 连线，请点击目标节点的输入点或再次点击取消`)
  } else if (type === 'input') {
    if (connectingNode.value) {
      if (connectingNode.value.id === node.id) {
        ElMessage.warning('不能连接到自己')
        return
      }
      
      // 检查是否会形成循环
      if (wouldCreateCycle(connectingNode.value.id, node.id)) {
        ElMessage.warning('不能创建循环连接')
        return
      }
      
      createConnection(connectingNode.value.id, node.id)
      ElMessage.success(`已连接 "${connectingNode.value.label}" 到 "${node.label}"`)
      connectingNode.value = null
      mousePosition.value = null
    } else {
      ElMessage.info('请先点击源节点的输出连接点开始连线')
    }
  }
}

// 检查是否会创建循环连接
const wouldCreateCycle = (sourceId, targetId) => {
  const visited = new Set()
  
  const dfs = (nodeId) => {
    if (visited.has(nodeId)) return false
    if (nodeId === sourceId) return true
    
    visited.add(nodeId)
    
    const outgoingConnections = connections.value.filter(c => c.source === nodeId)
    for (const connection of outgoingConnections) {
      if (dfs(connection.target)) return true
    }
    
    return false
  }
  
  return dfs(targetId)
}

const highlightConnectionPoint = (event) => {
  event.target.style.transform = 'scale(1.2)'
  event.target.style.boxShadow = '0 0 8px rgba(64, 158, 255, 0.6)'
}

const unhighlightConnectionPoint = (event) => {
  event.target.style.transform = 'scale(1)'
  event.target.style.boxShadow = 'none'
}

const selectConnection = (connection) => {
  selectedConnection.value = connection
  selectedNode.value = null
}

const getTempConnectionPath = () => {
  if (!connectingNode.value || !mousePosition.value) return ''
  
  const sourceNode = connectingNode.value
  const sourceX = sourceNode.position.x + 100
  const sourceY = sourceNode.position.y + 25
  const targetX = mousePosition.value.x
  const targetY = mousePosition.value.y
  
  const midX = (sourceX + targetX) / 2
  
  return `M ${sourceX} ${sourceY} Q ${midX} ${sourceY} ${midX} ${(sourceY + targetY) / 2} Q ${midX} ${targetY} ${targetX} ${targetY}`
}

const handleCanvasMouseMove = (event) => {
  if (connectingNode.value) {
    const rect = event.currentTarget.getBoundingClientRect()
    mousePosition.value = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    }
  }
}

const createConnection = (sourceId, targetId) => {
  if (sourceId === targetId) return
  
  // 检查是否已存在连接
  const existingConnection = connections.value.find(
    c => c.source === sourceId && c.target === targetId
  )
  
  if (existingConnection) {
    ElMessage.warning('连接已存在')
    return
  }
  
  // 保存到历史记录
  saveToHistory()
  
  const connection = {
    id: `connection_${connectionIdCounter.value++}`,
    source: sourceId,
    target: targetId,
    label: '', // 连接线标签
    condition: '', // 条件表达式
    type: 'sequence' // 连接类型：sequence, condition, default
  }
  
  connections.value.push(connection)
}

const getConnectionPath = (connection) => {
  const sourceNode = nodes.value.find(n => n.id === connection.source)
  const targetNode = nodes.value.find(n => n.id === connection.target)
  
  if (!sourceNode || !targetNode) return ''
  
  const sourceX = sourceNode.position.x + 100
  const sourceY = sourceNode.position.y + 25
  const targetX = targetNode.position.x
  const targetY = targetNode.position.y + 25
  
  const midX = (sourceX + targetX) / 2
  
  return `M ${sourceX} ${sourceY} Q ${midX} ${sourceY} ${midX} ${(sourceY + targetY) / 2} Q ${midX} ${targetY} ${targetX} ${targetY}`
}

const deleteConnection = (connectionId) => {
  // 保存到历史记录
  saveToHistory()
  
  connections.value = connections.value.filter(c => c.id !== connectionId)
  selectedConnection.value = null
}

const startDrag = (event, node) => {
  const startX = event.clientX - node.position.x
  const startY = event.clientY - node.position.y
  
  const handleMouseMove = (e) => {
    node.position.x = e.clientX - startX
    node.position.y = e.clientY - startY
  }
  
  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

const toggleDataPanel = () => {
  showDataPanel.value = !showDataPanel.value
}

const clearCanvas = () => {
  // 保存到历史记录
  saveToHistory()
  
  nodes.value = []
  connections.value = []
  selectedNode.value = null
  selectedConnection.value = null
}

const getProcessJSON = () => {
  return {
    id: processData.id,
    name: processData.name,
    description: processData.description,
    version: processData.version,
    nodes: nodes.value,
    connections: connections.value
  }
}

const saveProcess = () => {
  if (!processData.name) {
    ElMessage.warning('请输入流程名称')
    return
  }
  
  if (nodes.value.length === 0) {
    ElMessage.warning('请至少添加一个节点')
    return
  }
  
  const processJSON = getProcessJSON()
  emit('save', processJSON)
  emit('update:processXml', JSON.stringify(processJSON))
  ElMessage.success('流程保存成功')
}

const previewProcess = () => {
  showPreview.value = true
}

// 历史记录管理
const saveToHistory = () => {
  const state = {
    nodes: JSON.parse(JSON.stringify(nodes.value)),
    connections: JSON.parse(JSON.stringify(connections.value))
  }
  
  // 如果当前不在历史记录末尾，删除后面的记录
  if (historyIndex.value < history.value.length - 1) {
    history.value = history.value.slice(0, historyIndex.value + 1)
  }
  
  history.value.push(state)
  
  // 限制历史记录大小
  if (history.value.length > maxHistorySize) {
    history.value.shift()
  } else {
    historyIndex.value++
  }
}

const undo = () => {
  if (canUndo.value) {
    historyIndex.value--
    const state = history.value[historyIndex.value]
    nodes.value = JSON.parse(JSON.stringify(state.nodes))
    connections.value = JSON.parse(JSON.stringify(state.connections))
    clearSelection({ target: { classList: { contains: () => true } } })
  }
}

const redo = () => {
  if (canRedo.value) {
    historyIndex.value++
    const state = history.value[historyIndex.value]
    nodes.value = JSON.parse(JSON.stringify(state.nodes))
    connections.value = JSON.parse(JSON.stringify(state.connections))
    clearSelection({ target: { classList: { contains: () => true } } })
  }
}

// 缩放功能
const zoomIn = () => {
  if (zoomLevel.value < 2) {
    zoomLevel.value = Math.min(2, zoomLevel.value + 0.1)
  }
}

const zoomOut = () => {
  if (zoomLevel.value > 0.5) {
    zoomLevel.value = Math.max(0.5, zoomLevel.value - 0.1)
  }
}

const resetZoom = () => {
  zoomLevel.value = 1
  canvasTransform.value = { x: 0, y: 0 }
}

// 导入导出功能
const importProcess = () => {
  fileInput.value?.click()
}

const handleFileImport = (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const content = e.target.result
      let processData
      
      if (file.name.endsWith('.json')) {
        processData = JSON.parse(content)
      } else if (file.name.endsWith('.xml')) {
        // 这里可以添加XML解析逻辑
        ElMessage.warning('XML格式导入功能待实现')
        return
      }
      
      if (processData && processData.nodes) {
        // 保存当前状态到历史记录
        saveToHistory()
        
        // 导入新数据
        nodes.value = processData.nodes || []
        connections.value = processData.connections || []
        processData.name && (processData.name = processData.name)
        
        ElMessage.success('流程导入成功')
      } else {
        ElMessage.error('无效的流程文件格式')
      }
    } catch (error) {
      ElMessage.error('文件解析失败：' + error.message)
    }
  }
  reader.readAsText(file)
  
  // 清空input值，允许重复选择同一文件
  event.target.value = ''
}

const exportProcess = () => {
  const processJSON = getProcessJSON()
  const dataStr = JSON.stringify(processJSON, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  
  const link = document.createElement('a')
  link.href = URL.createObjectURL(dataBlob)
  link.download = `${processData.name || '流程设计'}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  ElMessage.success('流程导出成功')
}

// 小地图功能
const toggleMiniMap = () => {
  showMiniMap.value = !showMiniMap.value
}

// 初始化
if (props.processXml) {
  try {
    const processData = JSON.parse(props.processXml)
    if (processData.nodes) {
      nodes.value = processData.nodes
      connections.value = processData.connections || []
    }
  } catch (e) {
    console.warn('无法解析流程数据:', e)
  }
}

// 初始化历史记录
const initHistory = () => {
  const initialState = {
    nodes: JSON.parse(JSON.stringify(nodes.value)),
    connections: JSON.parse(JSON.stringify(connections.value))
  }
  history.value = [initialState]
  historyIndex.value = 0
}

// 组件挂载时初始化历史记录
onMounted(() => {
  initHistory()
})
</script>

<style scoped>
.flowlong-designer {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #e4e7ed;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.toolbar-left, .toolbar-center, .toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-center {
  flex: 1;
  justify-content: center;
}

.main-content {
  flex: 1;
  display: flex;
  height: calc(100vh - 60px);
}

.node-panel {
  width: 200px;
  background: white;
  border-right: 1px solid #e4e7ed;
  padding: 16px;
  overflow-y: auto;
}

.node-panel h4 {
  margin: 0 0 12px 0;
  color: #303133;
}

.node-category {
  margin-bottom: 16px;
}

.node-category h5 {
  margin: 0 0 8px 0;
  color: #606266;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.node-types {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.node-type-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #f8f9fa;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  cursor: grab;
  transition: all 0.2s;
}

.node-type-item:hover {
  background: #e3f2fd;
  border-color: #2196f3;
}

.node-type-item i {
  margin-right: 8px;
  color: #606266;
}

.canvas-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.canvas {
  width: 100%;
  height: 100%;
  position: relative;
  background: 
    radial-gradient(circle, #ddd 1px, transparent 1px);
  background-size: 20px 20px;
}

.flow-node {
  position: absolute;
  width: 100px;
  height: 50px;
  background: white;
  border: 2px solid #e4e7ed;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: move;
  user-select: none;
  transition: all 0.2s;
}

.flow-node:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.flow-node.selected {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.flow-node.start {
  background: #e8f5e8;
  border-color: #67c23a;
}

.flow-node.end {
  background: #fef0f0;
  border-color: #f56c6c;
}

.flow-node.approval {
  background: #f0f9ff;
  border-color: #409eff;
}

.connection-point {
  position: absolute;
  width: 12px;
  height: 12px;
  background: #409eff;
  border: 2px solid white;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.connection-point.input {
  left: -6px;
  top: 50%;
  transform: translateY(-50%);
}

.connection-point.output {
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
}

.connection-point:hover {
  transform: scale(1.2) translateY(-50%);
  box-shadow: 0 0 8px rgba(64, 158, 255, 0.6);
}

.connections-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.connection-line {
  fill: none;
  stroke: #409eff;
  stroke-width: 2;
  pointer-events: stroke;
  cursor: pointer;
}

.connection-line:hover {
  stroke-width: 3;
  stroke: #66b1ff;
}

.connection-line.selected {
  stroke: #f56c6c;
  stroke-width: 3;
}

.temp-connection-line {
  fill: none;
  stroke: #409eff;
  stroke-width: 2;
  stroke-dasharray: 5,5;
  opacity: 0.6;
}

.property-panel {
  width: 280px;
  background: white;
  border-left: 1px solid #e4e7ed;
  padding: 16px;
  overflow-y: auto;
}

.property-panel h4 {
  margin: 0 0 16px 0;
  color: #303133;
}

.no-selection {
  text-align: center;
  color: #909399;
  padding: 40px 0;
}

.data-panel {
  margin-top: 20px;
}

.table-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.table-item {
  padding: 8px;
  background: #f8f9fa;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  cursor: grab;
}

.table-item:hover {
  background: #e3f2fd;
  border-color: #2196f3;
}

.table-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.field-item {
  font-size: 12px;
  color: #606266;
}

.more-fields {
  font-size: 12px;
  color: #909399;
}

.process-preview {
  max-height: 400px;
  overflow-y: auto;
}

.flow-json {
  background: #f5f5f5;
  padding: 16px;
  border-radius: 6px;
  margin-top: 16px;
}
</style>