<template>
  <el-drawer
    v-model="modelStore.commentPanelVisible"
    :title="drawerTitle"
    direction="rtl"
    size="400px"
    @close="onClose"
  >
    <div class="comment-panel">
      <!-- Context Info -->
      <div v-if="currentContext" class="context-info">
        <div class="context-header">
          <el-tag type="primary">{{ currentContext.table.businessName }}</el-tag>
          <el-text size="small" type="info">{{ currentContext.table.name }}</el-text>
        </div>
        <div v-if="currentContext.column" class="context-column">
          <el-icon><Key /></el-icon>
          <span class="column-name">{{ currentContext.column.name }}</span>
          <span class="column-business">{{ currentContext.column.businessName }}</span>
        </div>
      </div>

      <el-divider />

      <!-- Comments List -->
      <div class="comments-list">
        <div v-if="comments.length === 0" class="no-comments">
          <el-empty description="暂无评论" :image-size="60" />
        </div>
        
        <div v-for="comment in comments" :key="comment.id" class="comment-item">
          <div class="comment-header">
            <div class="comment-meta">
              <el-tag 
                :type="comment.role === 'business' ? 'success' : 'primary'" 
                size="small"
              >
                {{ comment.role === 'business' ? '业务' : '技术' }}
              </el-tag>
              <span class="author">{{ comment.author }}</span>
              <span class="time">{{ formatTime(comment.timestamp) }}</span>
            </div>
            <div class="comment-actions">
              <el-button 
                v-if="!comment.resolved" 
                @click="resolveComment(comment.id)" 
                size="small" 
                type="success"
                :icon="Check"
              >
                解决
              </el-button>
              <el-tag v-else size="small" type="success">
                ✅ 已解决
              </el-tag>
            </div>
          </div>
          <div class="comment-content">
            <p>{{ comment.content }}</p>
          </div>
        </div>
      </div>

      <!-- Add Comment Form -->
      <div class="add-comment-section">
        <el-divider content-position="center">
          <span style="color: #909399; font-size: 14px;">添加评论</span>
        </el-divider>
        
        <el-form @submit.prevent="submitComment">
          <el-form-item label="角色">
            <el-radio-group v-model="commentForm.role">
              <el-radio label="business">
                <el-icon color="#67c23a"><User /></el-icon>
                业务视角
              </el-radio>
              <el-radio label="technical">
                <el-icon color="#409eff"><Setting /></el-icon>
                技术视角
              </el-radio>
            </el-radio-group>
          </el-form-item>
          
          <el-form-item label="姓名">
            <el-input 
              v-model="commentForm.author" 
              placeholder="请输入您的姓名"
              size="small"
            />
          </el-form-item>
          
          <el-form-item label="评论内容">
            <el-input 
              v-model="commentForm.content" 
              type="textarea" 
              :rows="3"
              placeholder="请输入您的意见或建议..."
              maxlength="500"
              show-word-limit
            />
          </el-form-item>
          
          <el-form-item>
            <el-button 
              type="primary" 
              @click="submitComment"
              style="width: 100%;"
              :disabled="!commentForm.content.trim() || !commentForm.author.trim()"
            >
              发布评论
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  Key, 
  Check, 
  User, 
  Setting 
} from '@element-plus/icons-vue'
import { useModelStore } from '~/stores/model'
import type { Comment } from '~/types/model'

const modelStore = useModelStore()

const commentForm = reactive({
  content: '',
  author: localStorage.getItem('modelflow-user') || '',
  role: 'business' as 'business' | 'technical'
})

// Get current context (table and column)
const currentContext = computed(() => {
  if (!modelStore.selectedTable || !modelStore.project) return null
  
  const table = modelStore.project.tables.find(t => t.id === modelStore.selectedTable)
  if (!table) return null
  
  const column = modelStore.selectedColumn 
    ? table.columns.find(c => c.id === modelStore.selectedColumn)
    : null
  
  return { table, column }
})

// Get comments for current context
const comments = computed(() => {
  if (!currentContext.value) return []
  
  if (currentContext.value.column) {
    return currentContext.value.column.comments || []
  } else {
    return currentContext.value.table.comments || []
  }
})

// Drawer title
const drawerTitle = computed(() => {
  if (!currentContext.value) return '评论'
  
  if (currentContext.value.column) {
    return `字段评论: ${currentContext.value.column.businessName || currentContext.value.column.name}`
  } else {
    return `表评论: ${currentContext.value.table.businessName}`
  }
})

// Format timestamp
const formatTime = (timestamp: Date) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  
  return date.toLocaleDateString('zh-CN')
}

// Submit comment
const submitComment = () => {
  if (!commentForm.content.trim() || !commentForm.author.trim()) {
    ElMessage.warning('请填写完整信息')
    return
  }
  
  if (!modelStore.selectedTable) {
    ElMessage.error('未选择表')
    return
  }
  
  // Save author name to localStorage
  localStorage.setItem('modelflow-user', commentForm.author)
  
  modelStore.addComment(
    modelStore.selectedTable,
    modelStore.selectedColumn,
    {
      content: commentForm.content.trim(),
      author: commentForm.author.trim(),
      role: commentForm.role,
      timestamp: new Date(),
      resolved: false
    }
  )
  
  // Clear form
  commentForm.content = ''
  
  ElMessage.success('评论已添加')
}

// Resolve comment
const resolveComment = (commentId: string) => {
  if (!currentContext.value) return
  
  let targetComments: Comment[]
  
  if (currentContext.value.column) {
    targetComments = currentContext.value.column.comments
  } else {
    targetComments = currentContext.value.table.comments
  }
  
  const comment = targetComments.find(c => c.id === commentId)
  if (comment) {
    comment.resolved = true
    ElMessage.success('评论已标记为已解决')
  }
}

// Close handler
const onClose = () => {
  modelStore.selectedTable = null
  modelStore.selectedColumn = null
}

// Watch for author changes to persist
watch(() => commentForm.author, (newAuthor) => {
  if (newAuthor.trim()) {
    localStorage.setItem('modelflow-user', newAuthor)
  }
})
</script>

<style scoped>
.comment-panel {
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.context-info {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.context-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.context-column {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #606266;
}

.column-name {
  font-family: 'Consolas', 'Monaco', monospace;
  font-weight: 600;
  color: #2c3e50;
}

.column-business {
  color: #909399;
  font-size: 14px;
}

.comments-list {
  flex: 1;
  overflow-y: auto;
  margin: 16px 0;
}

.no-comments {
  text-align: center;
  padding: 40px 20px;
}

.comment-item {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  margin-bottom: 12px;
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.comment-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #fafafa;
  border-bottom: 1px solid #e4e7ed;
}

.comment-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.author {
  font-weight: 500;
  color: #2c3e50;
}

.time {
  font-size: 12px;
  color: #909399;
}

.comment-content {
  padding: 12px;
}

.comment-content p {
  margin: 0;
  line-height: 1.6;
  color: #2c3e50;
  word-wrap: break-word;
}

.add-comment-section {
  border-top: 1px solid #e4e7ed;
  padding-top: 16px;
  margin-top: auto;
}

:deep(.el-drawer__header) {
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e4e7ed;
}

:deep(.el-drawer__title) {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

:deep(.el-form-item) {
  margin-bottom: 16px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: #606266;
}

:deep(.el-radio) {
  margin-right: 16px;
  white-space: nowrap;
}

:deep(.el-textarea__inner) {
  resize: none;
}
</style>