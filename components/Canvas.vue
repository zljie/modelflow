<template>
  <div class="canvas-container">
    <VueFlow
      v-model="elements"
      class="modeling-canvas"
      :default-viewport="{ zoom: 1 }"
      :min-zoom="0.2"
      :max-zoom="2"
      @node-drag-stop="onNodeDragStop"
      @connect="onConnect"
      :connection-line-type="ConnectionLineType.SmoothStep"
      :default-edge-options="{ type: 'smoothstep', animated: true }"
    >
      <Background pattern-color="#aaa" :gap="20" />
      <Controls />
      <MiniMap node-color="#409eff" mask-color="rgba(255, 255, 255, 0.7)" />
      
      <!-- Custom node template for entity cards -->
      <template #node-entity="{ data, id }">
        <EntityCard 
          :table="data.table" 
          :node-id="id"
          @update="handleTableUpdate"
        />
      </template>
    </VueFlow>

    <!-- Floating add table button -->
    <el-button 
      class="add-table-btn"
      type="primary" 
      :icon="Plus" 
      circle 
      size="large"
      @click="showAddTableDialog = true"
    />

    <!-- Add Table Dialog -->
    <el-dialog 
      v-model="showAddTableDialog" 
      title="添加数据表" 
      width="500px"
      @close="resetTableForm"
    >
      <el-form :model="tableForm" label-width="100px">
        <el-form-item label="表名">
          <el-input v-model="tableForm.name" placeholder="如: user_profile" />
        </el-form-item>
        <el-form-item label="业务名称">
          <el-input v-model="tableForm.businessName" placeholder="如: 用户档案" />
        </el-form-item>
        <el-form-item label="业务说明">
          <el-input 
            v-model="tableForm.businessComment" 
            type="textarea" 
            placeholder="表的业务用途和说明" 
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddTableDialog = false">取消</el-button>
        <el-button type="primary" @click="addTable">添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import { 
  VueFlow, 
  ConnectionLineType,
  type Node,
  type Edge,
  type Connection
} from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
// EntityCard will be auto-imported
import { useModelStore } from '~/stores/model'
import type { Table } from '~/types/model'

const modelStore = useModelStore()
const showAddTableDialog = ref(false)

const tableForm = reactive({
  name: '',
  businessName: '',
  businessComment: ''
})

// Convert tables and relations to Vue Flow elements
const elements = computed(() => {
  const nodes: Node[] = []
  const edges: Edge[] = []
  
  if (modelStore.project) {
    // Convert tables to nodes
    modelStore.project.tables.forEach(table => {
      nodes.push({
        id: table.id,
        type: 'entity',
        position: table.position,
        data: { table },
        dragHandle: '.card-header'
      })
    })
    
    // Convert relations to edges
    modelStore.project.relations.forEach(relation => {
      const sourceTable = modelStore.project!.tables.find(t => t.id === relation.sourceTableId)
      const targetTable = modelStore.project!.tables.find(t => t.id === relation.targetTableId)
      
      if (sourceTable && targetTable) {
        edges.push({
          id: relation.id,
          source: relation.sourceTableId,
          target: relation.targetTableId,
          type: 'smoothstep',
          animated: true,
          label: relation.type,
          labelStyle: { 
            fontSize: '12px', 
            fontWeight: 'bold',
            background: 'white',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1px solid #ddd'
          },
          style: {
            stroke: '#409eff',
            strokeWidth: 2
          },
          markerEnd: {
            type: 'arrowclosed',
            color: '#409eff'
          }
        })
      }
    })
  }
  
  return { nodes, edges }
})

// Handle node drag to update table positions
const onNodeDragStop = (event: any) => {
  const { node } = event
  if (node.type === 'entity') {
    modelStore.updateTable(node.id, {
      position: node.position
    })
  }
}

// Handle connection creation for relationships
const onConnect = (connection: Connection) => {
  if (connection.source && connection.target && connection.source !== connection.target) {
    // Determine relationship type based on table context
    // For MVP, default to 1:N relationship
    modelStore.addRelation({
      sourceTableId: connection.source,
      sourceColumnId: 'id', // Assume connecting to primary key
      targetTableId: connection.target,
      targetColumnId: 'id', // Simplified for MVP
      type: '1:N'
    })
    
    ElMessage.success(`已创建 ${connection.source} -> ${connection.target} 关系`)
  }
}

const resetTableForm = () => {
  Object.assign(tableForm, {
    name: '',
    businessName: '',
    businessComment: ''
  })
}

const addTable = () => {
  if (!tableForm.name.trim() || !tableForm.businessName.trim()) {
    ElMessage.warning('请填写表名和业务名称')
    return
  }
  
  // Find a good position for the new table
  const existingTables = modelStore.project?.tables || []
  const newPosition = {
    x: 100 + (existingTables.length % 3) * 350,
    y: 100 + Math.floor(existingTables.length / 3) * 300
  }
  
  modelStore.addTable({
    name: tableForm.name,
    businessName: tableForm.businessName,
    businessComment: tableForm.businessComment,
    position: newPosition,
    columns: [
      {
        id: `${tableForm.name}_id`,
        name: 'id',
        type: 'BIGINT AUTO_INCREMENT',
        businessName: 'ID',
        businessComment: `${tableForm.businessName}唯一标识`,
        isPrimaryKey: true,
        isForeignKey: false,
        isRequired: true,
        comments: []
      }
    ],
    comments: []
  })
  
  showAddTableDialog.value = false
  resetTableForm()
  ElMessage.success('表添加成功')
}

const handleTableUpdate = (tableId: string, updates: Partial<Table>) => {
  modelStore.updateTable(tableId, updates)
}

// Watch for project changes to re-render
watch(() => modelStore.project, () => {
  // Force reactivity update
}, { deep: true })
</script>

<style scoped>
.canvas-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.modeling-canvas {
  width: 100%;
  height: 100%;
  background: #fafafa;
}

.add-table-btn {
  position: absolute;
  bottom: 30px;
  right: 30px;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.add-table-btn:hover {
  transform: scale(1.1);
  transition: transform 0.2s ease;
}

/* Vue Flow overrides */
:deep(.vue-flow__node-entity) {
  background: transparent;
  border: none;
  padding: 0;
}

:deep(.vue-flow__edge-label) {
  font-size: 12px;
  font-weight: bold;
}

:deep(.vue-flow__controls) {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 20px;
}

:deep(.vue-flow__controls button) {
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

:deep(.vue-flow__controls button:hover) {
  background: #f5f7fa;
  border-color: #409eff;
}

:deep(.vue-flow__minimap) {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>