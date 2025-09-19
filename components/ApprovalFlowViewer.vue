<template>
  <div class="approval-flow-viewer">
    <!-- 流程实例列表 -->
    <div class="flow-instances">
      <div class="instances-header">
        <h3>审批流程实例</h3>
        <el-button type="primary" @click="showCreateDialog = true">
          <el-icon><Plus /></el-icon>
          发起审批
        </el-button>
      </div>
      
      <div class="instances-filters">
        <el-form :model="filters" inline>
          <el-form-item label="流程状态">
            <el-select v-model="filters.status" placeholder="全部状态" clearable>
              <el-option label="进行中" value="running" />
              <el-option label="已完成" value="completed" />
              <el-option label="已驳回" value="rejected" />
              <el-option label="已撤销" value="cancelled" />
            </el-select>
          </el-form-item>
          <el-form-item label="发起人">
            <el-input v-model="filters.initiator" placeholder="发起人姓名" clearable />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="loadInstances">查询</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-table :data="instances" style="width: 100%">
        <el-table-column prop="id" label="流程ID" width="120" />
        <el-table-column prop="name" label="流程名称" />
        <el-table-column prop="initiator" label="发起人" width="100" />
        <el-table-column prop="currentNode" label="当前节点" width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="发起时间" width="160" />
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="viewInstance(row)">查看</el-button>
            <el-button 
              size="small" 
              type="primary" 
              v-if="row.status === 'running' && canApprove(row)"
              @click="approveInstance(row)"
            >
              审批
            </el-button>
            <el-button 
              size="small" 
              type="danger" 
              v-if="row.status === 'running' && canCancel(row)"
              @click="cancelInstance(row)"
            >
              撤销
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 流程详情对话框 -->
    <el-dialog v-model="showDetailDialog" title="流程详情" width="80%">
      <div class="flow-detail" v-if="selectedInstance">
        <div class="detail-header">
          <h3>{{ selectedInstance.name }}</h3>
          <el-tag :type="getStatusType(selectedInstance.status)">
            {{ getStatusText(selectedInstance.status) }}
          </el-tag>
        </div>
        
        <!-- 流程图展示 -->
        <div class="flow-diagram">
          <h4>流程图</h4>
          <div class="diagram-container">
            <div 
              v-for="node in selectedInstance.nodes" 
              :key="node.id"
              class="flow-node-display"
              :class="[
                `node-${node.type}`,
                { 
                  'current': node.id === selectedInstance.currentNodeId,
                  'completed': isNodeCompleted(node.id),
                  'pending': isNodePending(node.id)
                }
              ]"
            >
              <div class="node-icon">
                <el-icon :class="getNodeIcon(node.type)" />
              </div>
              <div class="node-info">
                <div class="node-name">{{ node.label }}</div>
                <div class="node-status" v-if="getNodeStatus(node.id)">
                  {{ getNodeStatus(node.id) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 审批记录 -->
        <div class="approval-history">
          <h4>审批记录</h4>
          <el-timeline>
            <el-timeline-item
              v-for="record in selectedInstance.approvalRecords"
              :key="record.id"
              :timestamp="record.createTime"
              :type="getRecordType(record.action)"
            >
              <div class="record-content">
                <div class="record-header">
                  <strong>{{ record.approver }}</strong>
                  <span class="action">{{ getActionText(record.action) }}</span>
                </div>
                <div class="record-node">节点：{{ record.nodeName }}</div>
                <div class="record-comment" v-if="record.comment">
                  意见：{{ record.comment }}
                </div>
              </div>
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>
    </el-dialog>

    <!-- 审批对话框 -->
    <el-dialog v-model="showApprovalDialog" title="审批处理" width="600px">
      <div class="approval-form" v-if="approvalInstance">
        <div class="approval-info">
          <h4>{{ approvalInstance.name }}</h4>
          <p>当前节点：{{ approvalInstance.currentNode }}</p>
        </div>
        
        <el-form :model="approvalForm" label-width="80px">
          <el-form-item label="审批动作">
            <el-radio-group v-model="approvalForm.action">
              <el-radio value="approve">同意</el-radio>
              <el-radio value="reject">驳回</el-radio>
              <el-radio value="transfer">转办</el-radio>
              <el-radio value="addSign">加签</el-radio>
            </el-radio-group>
          </el-form-item>
          
          <el-form-item label="审批意见">
            <el-input 
              v-model="approvalForm.comment" 
              type="textarea" 
              :rows="4"
              placeholder="请输入审批意见"
            />
          </el-form-item>
          
          <el-form-item 
            label="转办人" 
            v-if="approvalForm.action === 'transfer'"
          >
            <el-select v-model="approvalForm.transferTo" placeholder="选择转办人">
              <el-option label="张三" value="zhangsan" />
              <el-option label="李四" value="lisi" />
              <el-option label="王五" value="wangwu" />
            </el-select>
          </el-form-item>
          
          <el-form-item 
            label="加签人" 
            v-if="approvalForm.action === 'addSign'"
          >
            <el-select 
              v-model="approvalForm.addSignUsers" 
              multiple 
              placeholder="选择加签人"
            >
              <el-option label="张三" value="zhangsan" />
              <el-option label="李四" value="lisi" />
              <el-option label="王五" value="wangwu" />
            </el-select>
          </el-form-item>
        </el-form>
      </div>
      
      <template #footer>
        <el-button @click="showApprovalDialog = false">取消</el-button>
        <el-button type="primary" @click="submitApproval">提交</el-button>
      </template>
    </el-dialog>

    <!-- 发起审批对话框 -->
    <el-dialog v-model="showCreateDialog" title="发起审批" width="600px">
      <el-form :model="createForm" label-width="100px">
        <el-form-item label="选择流程">
          <el-select v-model="createForm.processId" placeholder="选择要发起的流程">
            <el-option 
              v-for="process in availableProcesses"
              :key="process.id"
              :label="process.name"
              :value="process.id"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="申请标题">
          <el-input v-model="createForm.title" placeholder="请输入申请标题" />
        </el-form-item>
        
        <el-form-item label="申请内容">
          <el-input 
            v-model="createForm.content" 
            type="textarea" 
            :rows="4"
            placeholder="请输入申请内容"
          />
        </el-form-item>
        
        <!-- 动态表单字段 -->
        <template v-if="selectedProcess">
          <el-form-item 
            v-for="field in selectedProcess.formFields"
            :key="field.name"
            :label="field.label"
          >
            <el-input 
              v-if="field.type === 'text'"
              v-model="createForm.formData[field.name]"
              :placeholder="field.placeholder"
            />
            <el-input-number 
              v-else-if="field.type === 'number'"
              v-model="createForm.formData[field.name]"
              :placeholder="field.placeholder"
            />
            <el-date-picker 
              v-else-if="field.type === 'date'"
              v-model="createForm.formData[field.name]"
              type="date"
              :placeholder="field.placeholder"
            />
          </el-form-item>
        </template>
      </el-form>
      
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="createInstance">发起</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

// 响应式数据
const instances = ref([])
const selectedInstance = ref(null)
const approvalInstance = ref(null)
const showDetailDialog = ref(false)
const showApprovalDialog = ref(false)
const showCreateDialog = ref(false)

const filters = reactive({
  status: '',
  initiator: ''
})

const approvalForm = reactive({
  action: 'approve',
  comment: '',
  transferTo: '',
  addSignUsers: []
})

const createForm = reactive({
  processId: '',
  title: '',
  content: '',
  formData: {}
})

const availableProcesses = ref([
  {
    id: 'leave_process',
    name: '请假申请',
    formFields: [
      { name: 'startDate', label: '开始日期', type: 'date', placeholder: '选择开始日期' },
      { name: 'endDate', label: '结束日期', type: 'date', placeholder: '选择结束日期' },
      { name: 'days', label: '请假天数', type: 'number', placeholder: '输入请假天数' },
      { name: 'reason', label: '请假原因', type: 'text', placeholder: '输入请假原因' }
    ]
  },
  {
    id: 'expense_process',
    name: '费用报销',
    formFields: [
      { name: 'amount', label: '报销金额', type: 'number', placeholder: '输入报销金额' },
      { name: 'category', label: '费用类别', type: 'text', placeholder: '输入费用类别' },
      { name: 'description', label: '费用说明', type: 'text', placeholder: '输入费用说明' }
    ]
  }
])

// 计算属性
const selectedProcess = computed(() => {
  return availableProcesses.value.find(p => p.id === createForm.processId)
})

// 方法
const loadInstances = () => {
  // 模拟数据
  instances.value = [
    {
      id: 'INST_001',
      name: '请假申请',
      initiator: '张三',
      currentNode: '部门经理审批',
      currentNodeId: 'node_2',
      status: 'running',
      createTime: '2024-01-15 09:30:00',
      nodes: [
        { id: 'node_1', type: 'start', label: '开始' },
        { id: 'node_2', type: 'approval', label: '部门经理审批' },
        { id: 'node_3', type: 'approval', label: 'HR审批' },
        { id: 'node_4', type: 'end', label: '结束' }
      ],
      approvalRecords: [
        {
          id: 'record_1',
          approver: '张三',
          action: 'submit',
          nodeName: '发起申请',
          comment: '申请3天年假',
          createTime: '2024-01-15 09:30:00'
        }
      ]
    },
    {
      id: 'INST_002',
      name: '费用报销',
      initiator: '李四',
      currentNode: '已完成',
      currentNodeId: 'node_4',
      status: 'completed',
      createTime: '2024-01-14 14:20:00',
      nodes: [
        { id: 'node_1', type: 'start', label: '开始' },
        { id: 'node_2', type: 'approval', label: '直属领导审批' },
        { id: 'node_3', type: 'approval', label: '财务审批' },
        { id: 'node_4', type: 'end', label: '结束' }
      ],
      approvalRecords: [
        {
          id: 'record_1',
          approver: '李四',
          action: 'submit',
          nodeName: '发起申请',
          comment: '差旅费报销',
          createTime: '2024-01-14 14:20:00'
        },
        {
          id: 'record_2',
          approver: '王经理',
          action: 'approve',
          nodeName: '直属领导审批',
          comment: '同意报销',
          createTime: '2024-01-14 16:30:00'
        },
        {
          id: 'record_3',
          approver: '财务部',
          action: 'approve',
          nodeName: '财务审批',
          comment: '审核通过，已打款',
          createTime: '2024-01-15 10:15:00'
        }
      ]
    }
  ]
}

const getStatusType = (status) => {
  const typeMap = {
    running: 'warning',
    completed: 'success',
    rejected: 'danger',
    cancelled: 'info'
  }
  return typeMap[status] || 'info'
}

const getStatusText = (status) => {
  const textMap = {
    running: '进行中',
    completed: '已完成',
    rejected: '已驳回',
    cancelled: '已撤销'
  }
  return textMap[status] || '未知'
}

const getNodeIcon = (type) => {
  const iconMap = {
    start: 'el-icon-video-play',
    approval: 'el-icon-user',
    condition: 'el-icon-share',
    notify: 'el-icon-bell',
    end: 'el-icon-video-pause'
  }
  return iconMap[type] || 'el-icon-setting'
}

const isNodeCompleted = (nodeId) => {
  if (!selectedInstance.value) return false
  const records = selectedInstance.value.approvalRecords
  return records.some(r => r.nodeId === nodeId && r.action === 'approve')
}

const isNodePending = (nodeId) => {
  return selectedInstance.value?.currentNodeId === nodeId
}

const getNodeStatus = (nodeId) => {
  if (!selectedInstance.value) return ''
  
  if (isNodeCompleted(nodeId)) return '已完成'
  if (isNodePending(nodeId)) return '进行中'
  return '待处理'
}

const getRecordType = (action) => {
  const typeMap = {
    submit: 'primary',
    approve: 'success',
    reject: 'danger',
    transfer: 'warning',
    addSign: 'info'
  }
  return typeMap[action] || 'primary'
}

const getActionText = (action) => {
  const textMap = {
    submit: '提交申请',
    approve: '同意',
    reject: '驳回',
    transfer: '转办',
    addSign: '加签'
  }
  return textMap[action] || '未知操作'
}

const canApprove = (instance) => {
  // 简化逻辑：当前用户可以审批进行中的流程
  return instance.status === 'running'
}

const canCancel = (instance) => {
  // 简化逻辑：发起人可以撤销自己发起的流程
  return instance.status === 'running' && instance.initiator === '当前用户'
}

const viewInstance = (instance) => {
  selectedInstance.value = instance
  showDetailDialog.value = true
}

const approveInstance = (instance) => {
  approvalInstance.value = instance
  // 重置表单
  Object.assign(approvalForm, {
    action: 'approve',
    comment: '',
    transferTo: '',
    addSignUsers: []
  })
  showApprovalDialog.value = true
}

const cancelInstance = async (instance) => {
  try {
    await ElMessageBox.confirm('确定要撤销此流程吗？', '确认撤销', {
      type: 'warning'
    })
    
    // 这里应该调用API撤销流程
    ElMessage.success('流程已撤销')
    loadInstances()
  } catch {
    // 用户取消
  }
}

const submitApproval = () => {
  if (!approvalForm.comment.trim()) {
    ElMessage.warning('请输入审批意见')
    return
  }
  
  // 这里应该调用API提交审批
  ElMessage.success('审批提交成功')
  showApprovalDialog.value = false
  loadInstances()
}

const createInstance = () => {
  if (!createForm.processId || !createForm.title.trim()) {
    ElMessage.warning('请填写必要信息')
    return
  }
  
  // 这里应该调用API创建流程实例
  ElMessage.success('流程发起成功')
  showCreateDialog.value = false
  
  // 重置表单
  Object.assign(createForm, {
    processId: '',
    title: '',
    content: '',
    formData: {}
  })
  
  loadInstances()
}

// 生命周期
onMounted(() => {
  loadInstances()
})
</script>

<style scoped>
.approval-flow-viewer {
  padding: 20px;
}

.instances-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.instances-filters {
  margin-bottom: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
}

.flow-detail {
  max-height: 600px;
  overflow-y: auto;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e4e7ed;
}

.flow-diagram {
  margin-bottom: 30px;
}

.diagram-container {
  display: flex;
  gap: 20px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 6px;
  overflow-x: auto;
}

.flow-node-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 100px;
  padding: 16px;
  background: white;
  border: 2px solid #e4e7ed;
  border-radius: 8px;
  position: relative;
}

.flow-node-display.current {
  border-color: #409eff;
  background: #f0f9ff;
}

.flow-node-display.completed {
  border-color: #67c23a;
  background: #f0f9ff;
}

.flow-node-display.pending {
  border-color: #e6a23c;
  background: #fdf6ec;
}

.node-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.node-info {
  text-align: center;
}

.node-name {
  font-weight: 500;
  margin-bottom: 4px;
}

.node-status {
  font-size: 12px;
  color: #666;
}

.approval-history h4 {
  margin-bottom: 16px;
}

.record-content {
  padding: 8px 0;
}

.record-header {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 4px;
}

.action {
  padding: 2px 8px;
  background: #f0f0f0;
  border-radius: 4px;
  font-size: 12px;
}

.record-node,
.record-comment {
  font-size: 14px;
  color: #666;
  margin-bottom: 2px;
}

.approval-form {
  padding: 16px 0;
}

.approval-info {
  margin-bottom: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
}

.approval-info h4 {
  margin: 0 0 8px 0;
}

.approval-info p {
  margin: 0;
  color: #666;
}
</style>