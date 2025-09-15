/**
 * ERDL (Entity Relationship Diagram Language) Parser
 * 支持 databasediagram.com 的语法格式
 * 
 * 语法示例:
 * Customer-
 * CustomerID int
 * Name varchar(100)
 * Address1 string
 * Address2 string
 * City string
 */

import { v4 as uuidv4 } from 'uuid'
import type { Table, Column } from '~/types/model'

export interface ParseResult {
  success: boolean
  tables: Table[]
  errors: string[]
}

export class ERDLParser {
  private errors: string[] = []
  private currentLine = 0

  /**
   * 解析ERDL文本
   */
  parse(erdlText: string): ParseResult {
    this.errors = []
    this.currentLine = 0
    
    const tables: Table[] = []
    const lines = erdlText.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    
    let currentTable: Partial<Table> | null = null
    
    for (let i = 0; i < lines.length; i++) {
      this.currentLine = i + 1
      const line = lines[i]
      
      if (this.isTableDefinition(line)) {
        // 保存上一个表
        if (currentTable && currentTable.name) {
          tables.push(this.completeTable(currentTable))
        }
        
        // 开始新表
        currentTable = this.parseTableDefinition(line)
      } else if (currentTable && this.isColumnDefinition(line)) {
        // 解析字段
        const column = this.parseColumnDefinition(line)
        if (column) {
          if (!currentTable.columns) {
            currentTable.columns = []
          }
          currentTable.columns.push(column)
        }
      } else if (line.length > 0) {
        this.addError(`第${this.currentLine}行: 无法识别的语法 "${line}"`)
      }
    }
    
    // 保存最后一个表
    if (currentTable && currentTable.name) {
      tables.push(this.completeTable(currentTable))
    }
    
    return {
      success: this.errors.length === 0,
      tables,
      errors: this.errors
    }
  }
  
  /**
   * 检查是否为表定义行
   */
  private isTableDefinition(line: string): boolean {
    return line.endsWith('-') && !line.includes(' ')
  }
  
  /**
   * 检查是否为字段定义行
   */
  private isColumnDefinition(line: string): boolean {
    return line.includes(' ') && !line.endsWith('-')
  }
  
  /**
   * 解析表定义
   */
  private parseTableDefinition(line: string): Partial<Table> {
    let tableName = line.slice(0, -1) // 移除末尾的 '-'
    
    // 处理带引号的表名
    if (tableName.startsWith('"') && tableName.endsWith('"')) {
      tableName = tableName.slice(1, -1)
    }
    
    // 处理schema.table格式
    const parts = tableName.split('.')
    const actualTableName = parts.length > 1 ? parts[parts.length - 1] : tableName
    const schema = parts.length > 1 ? parts.slice(0, -1).join('.') : undefined
    
    return {
      name: actualTableName,
      businessName: actualTableName,
      businessComment: schema ? `Schema: ${schema}` : '',
      columns: [],
      position: { x: 0, y: 0 },
      comments: []
    }
  }
  
  /**
   * 解析字段定义
   */
  private parseColumnDefinition(line: string): Column | null {
    const parts = line.split(/\s+/)
    if (parts.length < 2) {
      this.addError(`第${this.currentLine}行: 字段定义格式错误 "${line}"`)
      return null
    }
    
    const columnName = parts[0]
    const columnType = parts.slice(1).join(' ')
    
    // 转换常见类型
    const normalizedType = this.normalizeColumnType(columnType)
    
    return {
      id: uuidv4(),
      name: columnName,
      type: normalizedType,
      businessName: columnName,
      businessComment: '',
      isPrimaryKey: this.isPrimaryKeyType(columnName, normalizedType),
      isForeignKey: this.isForeignKeyType(columnName),
      isRequired: this.isRequiredType(normalizedType),
      comments: []
    }
  }
  
  /**
   * 标准化字段类型
   */
  private normalizeColumnType(type: string): string {
    const lowerType = type.toLowerCase()
    
    // 类型映射
    const typeMap: Record<string, string> = {
      'string': 'VARCHAR(255)',
      'text': 'TEXT',
      'int': 'INT',
      'integer': 'INT',
      'bigint': 'BIGINT',
      'float': 'FLOAT',
      'double': 'DOUBLE',
      'decimal': 'DECIMAL(10,2)',
      'bool': 'BOOLEAN',
      'boolean': 'BOOLEAN',
      'date': 'DATE',
      'datetime': 'DATETIME',
      'timestamp': 'TIMESTAMP',
      'time': 'TIME'
    }
    
    // 检查是否有直接映射
    if (typeMap[lowerType]) {
      return typeMap[lowerType]
    }
    
    // 检查varchar格式
    if (lowerType.startsWith('varchar(')) {
      return type.toUpperCase()
    }
    
    // 检查其他带括号的类型
    if (lowerType.includes('(')) {
      return type.toUpperCase()
    }
    
    // 默认返回原类型
    return type.toUpperCase()
  }
  
  /**
   * 判断是否为主键
   */
  private isPrimaryKeyType(columnName: string, type: string): boolean {
    const lowerName = columnName.toLowerCase()
    return lowerName === 'id' || 
           lowerName.endsWith('id') && lowerName.length <= 10 ||
           type.includes('AUTO_INCREMENT')
  }
  
  /**
   * 判断是否为外键
   */
  private isForeignKeyType(columnName: string): boolean {
    const lowerName = columnName.toLowerCase()
    return lowerName.endsWith('id') && lowerName !== 'id' && lowerName.length > 2
  }
  
  /**
   * 判断是否为必填字段
   */
  private isRequiredType(type: string): boolean {
    return !type.toLowerCase().includes('null')
  }
  
  /**
   * 完善表定义
   */
  private completeTable(partialTable: Partial<Table>): Table {
    return {
      id: uuidv4(),
      name: partialTable.name || '',
      businessName: partialTable.businessName || partialTable.name || '',
      businessComment: partialTable.businessComment || '',
      position: partialTable.position || { x: 100, y: 100 },
      columns: partialTable.columns || [],
      comments: partialTable.comments || []
    }
  }
  
  /**
   * 添加错误信息
   */
  private addError(message: string): void {
    this.errors.push(message)
  }
}

/**
 * 导出解析函数
 */
export function parseERDL(erdlText: string): ParseResult {
  const parser = new ERDLParser()
  return parser.parse(erdlText)
}

/**
 * 示例ERDL文本
 */
export const SAMPLE_ERDL = `Customer-
CustomerID int
Name varchar(100)
Address1 string
Address2 string
City string

Order-
OrderID int
CustomerID int
OrderDate datetime
TotalAmount decimal

OrderItem-
OrderItemID int
OrderID int
ProductID int
Quantity int
UnitPrice decimal`