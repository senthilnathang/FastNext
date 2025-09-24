'use client'

import { useMemo, useCallback } from 'react'
import type { ExportOptions } from '../types'

interface UseDataTableExportProps<TData> {
  data: TData[]
  columns: Array<{ id: string; label: string; accessor?: string }>
  selectedRows?: TData[]
  visibleColumns?: string[]
}

export function useDataTableExport<TData extends Record<string, any>>({
  data,
  columns,
  selectedRows = [],
  visibleColumns,
}: UseDataTableExportProps<TData>) {
  
  const exportableData = useMemo(() => {
    const filteredColumns = visibleColumns 
      ? columns.filter(col => visibleColumns.includes(col.id))
      : columns

    return filteredColumns.map(col => ({
      id: col.id,
      label: col.label,
      accessor: col.accessor || col.id,
    }))
  }, [columns, visibleColumns])

  const formatDataForExport = useCallback((
    sourceData: TData[],
    includeHeaders = true
  ) => {
    const rows: string[][] = []
    
    if (includeHeaders) {
      rows.push(exportableData.map(col => col.label))
    }

    sourceData.forEach(row => {
      const rowData = exportableData.map(col => {
        const value = row[col.accessor]
        
        // Handle different data types
        if (value === null || value === undefined) return ''
        if (typeof value === 'boolean') return value ? 'Yes' : 'No'
        if (value instanceof Date) return value.toLocaleDateString()
        if (typeof value === 'object') return JSON.stringify(value)
        
        return String(value)
      })
      rows.push(rowData)
    })

    return rows
  }, [exportableData])

  const exportToCSV = useCallback((options: ExportOptions) => {
    const sourceData = options.selectedOnly ? selectedRows : data
    const rows = formatDataForExport(sourceData)
    
    const csvContent = rows
      .map(row => row.map(field => `"${field.replace(/"/g, '""')}"`).join(','))
      .join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', options.filename || 'export.csv')
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }, [data, selectedRows, formatDataForExport])

  const exportToJSON = useCallback((options: ExportOptions) => {
    const sourceData = options.selectedOnly ? selectedRows : data
    
    const jsonData = sourceData.map(row => {
      const filteredRow: Record<string, any> = {}
      exportableData.forEach(col => {
        filteredRow[col.label] = row[col.accessor]
      })
      return filteredRow
    })
    
    const jsonContent = JSON.stringify(jsonData, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json' })
    const link = document.createElement('a')
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', options.filename || 'export.json')
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }, [data, selectedRows, exportableData])

  const exportToExcel = useCallback(async (options: ExportOptions) => {
    // For Excel export, we'll use a simple HTML table that Excel can read
    const sourceData = options.selectedOnly ? selectedRows : data
    const rows = formatDataForExport(sourceData)
    
    let htmlContent = '<table border="1">'
    
    rows.forEach((row, index) => {
      const tag = index === 0 ? 'th' : 'td'
      htmlContent += '<tr>'
      row.forEach(cell => {
        htmlContent += `<${tag}>${cell}</${tag}>`
      })
      htmlContent += '</tr>'
    })
    
    htmlContent += '</table>'
    
    const blob = new Blob([htmlContent], { 
      type: 'application/vnd.ms-excel' 
    })
    const link = document.createElement('a')
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', options.filename || 'export.xls')
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }, [data, selectedRows, formatDataForExport])

  const exportData = useCallback((options: ExportOptions) => {
    switch (options.format) {
      case 'csv':
        exportToCSV(options)
        break
      case 'json':
        exportToJSON(options)
        break
      case 'excel':
        exportToExcel(options)
        break
      default:
        console.error('Unsupported export format:', options.format)
    }
  }, [exportToCSV, exportToJSON, exportToExcel])

  return {
    exportData,
    exportToCSV,
    exportToJSON,
    exportToExcel,
    exportableData,
  }
}