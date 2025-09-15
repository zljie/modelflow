import { defineStore } from 'pinia'
import { ref } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { Project, Table, Column, Relation, Comment } from '~/types/model'

export const useModelStore = defineStore('model', () => {
  const project = ref<Project | null>(null)
  const viewMode = ref<'business' | 'technical'>('business')
  const selectedTable = ref<string | null>(null)
  const selectedColumn = ref<string | null>(null)
  const commentPanelVisible = ref(false)

  // Initialize with simple template
  const initializeProject = () => {
    project.value = {
      id: uuidv4(),
      name: '图书馆管理系统',
      description: '经典的图书馆业务模型示例',
      viewMode: 'business',
      createdAt: new Date(),
      updatedAt: new Date(),
      tables: [],
      relations: []
    }
  }

  const addTable = (table: Omit<Table, 'id'>) => {
    if (!project.value) return
    
    const newTable: Table = {
      ...table,
      id: uuidv4()
    }
    
    project.value.tables.push(newTable)
    project.value.updatedAt = new Date()
  }

  const updateTable = (tableId: string, updates: Partial<Table>) => {
    if (!project.value) return
    
    const tableIndex = project.value.tables.findIndex(t => t.id === tableId)
    if (tableIndex !== -1) {
      project.value.tables[tableIndex] = { ...project.value.tables[tableIndex], ...updates }
      project.value.updatedAt = new Date()
    }
  }

  const deleteTable = (tableId: string) => {
    if (!project.value) return
    
    project.value.tables = project.value.tables.filter(t => t.id !== tableId)
    project.value.updatedAt = new Date()
  }

  const addColumn = (tableId: string, column: Omit<Column, 'id'>) => {
    if (!project.value) return
    
    const table = project.value.tables.find(t => t.id === tableId)
    if (table) {
      const newColumn: Column = {
        ...column,
        id: uuidv4()
      }
      
      table.columns.push(newColumn)
      project.value.updatedAt = new Date()
    }
  }

  const toggleViewMode = () => {
    viewMode.value = viewMode.value === 'business' ? 'technical' : 'business'
  }

  const saveProject = () => {
    if (project.value && typeof window !== 'undefined') {
      localStorage.setItem('modelflow-project', JSON.stringify(project.value))
    }
  }

  const loadProject = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('modelflow-project')
      if (saved) {
        try {
          project.value = JSON.parse(saved)
        } catch (error) {
          console.error('Failed to load project:', error)
          initializeProject()
        }
      } else {
        initializeProject()
      }
    } else {
      initializeProject()
    }
  }

  const exportDDL = () => {
    if (!project.value) return ''
    
    let ddl = '-- Generated DDL for ' + project.value.name + '\n\n'
    
    project.value.tables.forEach(table => {
      ddl += `CREATE TABLE ${table.name} (\n`
      
      table.columns.forEach((column, index) => {
        ddl += `  ${column.name} ${column.type}`
        if (column.isPrimaryKey) ddl += ' PRIMARY KEY'
        if (column.isRequired) ddl += ' NOT NULL'
        if (index < table.columns.length - 1) ddl += ','
        ddl += '\n'
      })
      
      ddl += ');\n\n'
    })
    
    return ddl
  }

  const openCommentPanel = (tableId: string, columnId?: string) => {
    selectedTable.value = tableId
    selectedColumn.value = columnId || null
    commentPanelVisible.value = true
  }

  return {
    // State
    project,
    viewMode,
    selectedTable,
    selectedColumn,
    commentPanelVisible,
    
    // Actions
    initializeProject,
    addTable,
    updateTable,
    deleteTable,
    addColumn,
    toggleViewMode,
    saveProject,
    loadProject,
    exportDDL,
    openCommentPanel
  }
})