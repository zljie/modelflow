<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <div class="project-info">
        <h2>{{ modelStore.project?.name || 'ModelFlow' }}</h2>
        <el-text v-if="modelStore.project?.description" size="small" type="info">
          {{ modelStore.project.description }}
        </el-text>
      </div>
    </div>
    
    <div class="toolbar-center">
      <el-button-group>
        <el-button 
          @click="modelStore.toggleViewMode()"
          :type="modelStore.viewMode === 'business' ? 'primary' : 'default'"
          :icon="modelStore.viewMode === 'business' ? User : Setting"
        >
          {{ modelStore.viewMode === 'business' ? '👥 业务视图' : '🔧 技术视图' }}
        </el-button>
      </el-button-group>
    </div>

    <div class="toolbar-right">
      <el-button-group>
        <el-button @click="loadProject" :icon="FolderOpened">
          打开
        </el-button>
        <el-button @click="saveProject" :icon="Document">
          保存
        </el-button>
        <el-button @click="handleExportDDL" type="success" :icon="Download">
          导出DDL
        </el-button>
        <el-button @click="showAbout = true" :icon="QuestionFilled" circle />
      </el-button-group>
    </div>

    <!-- Export DDL Dialog -->
    <el-dialog v-model="showExportDialog" title="导出MySQL DDL" width="70%" top="5vh">
      <div class="ddl-preview">
        <div class="ddl-header">
          <el-text>生成的DDL语句：</el-text>
          <el-button @click="copyDDL" size="small" :icon="CopyDocument">
            复制到剪贴板
          </el-button>
        </div>
        <el-input 
          v-model="generatedDDL"
          type="textarea"
          :rows="20"
          readonly
          class="ddl-textarea"
        />
      </div>
      <template #footer>
        <el-button @click="downloadDDL" type="primary" :icon="Download">
          下载为.sql文件
        </el-button>
        <el-button @click="showExportDialog = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- About Dialog -->
    <el-dialog v-model="showAbout" title="关于 ModelFlow" width="500px">
      <div class="about-content">
        <div class="logo-section">
          <h3>🏗️ ModelFlow</h3>
          <p>数据库模型设计协作工具</p>
        </div>
        
        <el-divider />
        
        <div class="features">
          <h4>✨ 核心特性</h4>
          <ul>
            <li>🎯 业务与技术双视图切换</li>
            <li>🖱️ 拖拽式实体建模</li>
            <li>💬 协作评论系统</li>
            <li>📄 一键导出MySQL DDL</li>
            <li>💾 本地项目保存</li>
          </ul>
        </div>
        
        <el-divider />
        
        <div class="usage-tips">
          <h4>💡 使用提示</h4>
          <ul>
            <li>双击表头可编辑表信息</li>
            <li>点击💬按钮添加协作评论</li>
            <li>拖拽表之间可创建关系</li>
            <li>切换视图模式查看不同信息</li>
          </ul>
        </div>
      </div>
      <template #footer>
        <el-button @click="showAbout = false" type="primary">好的</el-button>
      </template>
    </el-dialog>

    <!-- Load Project Dialog -->
    <el-dialog v-model="showLoadDialog" title="打开项目" width="400px">
      <div class="load-options">
        <el-button @click="loadFromLocal" style="width: 100%; margin-bottom: 12px;">
          📂 从本地存储加载
        </el-button>
        <el-upload
          ref="uploadRef"
          :auto-upload="false"
          :show-file-list="false"
          accept=".json"
          @change="handleFileUpload"
        >
          <el-button style="width: 100%;">📁 从文件加载</el-button>
        </el-upload>
      </div>
      <template #footer>
        <el-button @click="showLoadDialog = false">取消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  User,
  Setting,
  FolderOpened,
  Document,
  Download,
  QuestionFilled,
  CopyDocument
} from '@element-plus/icons-vue'
import { useModelStore } from '~/stores/model'
import type { Project } from '~/types/model'

const modelStore = useModelStore()
const showExportDialog = ref(false)
const showAbout = ref(false)
const showLoadDialog = ref(false)
const generatedDDL = ref('')
const uploadRef = ref()

const saveProject = () => {
  modelStore.saveProject()
}

const loadProject = () => {
  showLoadDialog.value = true
}

const loadFromLocal = () => {
  modelStore.loadProject()
  showLoadDialog.value = false
}

const handleFileUpload = (file: any) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const projectData = JSON.parse(e.target?.result as string)
      // Validate project structure
      if (projectData.id && projectData.name && projectData.tables) {
        // Assign project data
        modelStore.project.value = projectData
        ElMessage.success('项目加载成功')
        showLoadDialog.value = false
      } else {
        throw new Error('Invalid project format')
      }
    } catch (error) {
      ElMessage.error('项目文件格式错误')
    }
  }
  reader.readAsText(file.raw)
}

const handleExportDDL = () => {
  generatedDDL.value = modelStore.exportDDL()
  showExportDialog.value = true
}

const copyDDL = async () => {
  try {
    await navigator.clipboard.writeText(generatedDDL.value)
    ElMessage.success('DDL已复制到剪贴板')
  } catch (err) {
    ElMessage.error('复制失败，请手动复制')
  }
}

const downloadDDL = () => {
  const blob = new Blob([generatedDDL.value], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const projectName = modelStore.project?.name || 'modelflow'
  a.href = url
  a.download = `${projectName.replace(/\s+/g, '_')}_schema.sql`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  ElMessage.success('DDL文件下载成功')
}
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: white;
  border-bottom: 1px solid #e4e7ed;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.toolbar-left {
  display: flex;
  align-items: center;
}

.project-info h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
}

.toolbar-center {
  display: flex;
  align-items: center;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ddl-preview {
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  overflow: hidden;
}

.ddl-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #dcdfe6;
}

.ddl-textarea {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  line-height: 1.5;
}

:deep(.ddl-textarea .el-textarea__inner) {
  border: none;
  border-radius: 0;
  background: #fafafa;
}

.about-content {
  text-align: left;
}

.logo-section {
  text-align: center;
  margin-bottom: 20px;
}

.logo-section h3 {
  margin: 0;
  font-size: 24px;
  color: #409eff;
}

.logo-section p {
  margin: 8px 0 0 0;
  color: #606266;
  font-size: 14px;
}

.features h4,
.usage-tips h4 {
  margin: 0 0 12px 0;
  color: #2c3e50;
  font-size: 16px;
}

.features ul,
.usage-tips ul {
  margin: 0;
  padding-left: 20px;
}

.features li,
.usage-tips li {
  margin-bottom: 8px;
  color: #606266;
  line-height: 1.5;
}

.load-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    gap: 12px;
    padding: 16px;
  }
  
  .toolbar-left,
  .toolbar-center,
  .toolbar-right {
    width: 100%;
    justify-content: center;
  }
}
</style>