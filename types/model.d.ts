export interface Comment {
  id: string
  content: string
  author: string
  role: 'business' | 'technical'
  timestamp: Date
  resolved: boolean
}

export interface Column {
  id: string
  name: string
  type: string
  businessName?: string
  businessComment?: string
  isPrimaryKey: boolean
  isForeignKey: boolean
  isRequired: boolean
  defaultValue?: string
  comments: Comment[]
}

export interface Table {
  id: string
  name: string
  businessName: string
  businessComment?: string
  columns: Column[]
  position: { x: number; y: number }
  comments: Comment[]
}

export interface Relation {
  id: string
  sourceTableId: string
  sourceColumnId: string
  targetTableId: string
  targetColumnId: string
  type: '1:1' | '1:N' | 'N:N'
}

export interface Project {
  id: string
  name: string
  description?: string
  tables: Table[]
  relations: Relation[]
  viewMode: 'business' | 'technical'
  createdAt: Date
  updatedAt: Date
}