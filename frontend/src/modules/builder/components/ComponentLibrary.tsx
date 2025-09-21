"use client"

import React from 'react'
import { useDraggable } from '@dnd-kit/core'
import { useComponents } from '@/modules/builder/hooks/useComponents'
import { Component, ComponentType } from '@/shared/types'
import { 
  Type, 
  Square, 
  Image, 
  MousePointer, 
  FileText, 
  Navigation,
  Layers
} from 'lucide-react'

const componentIcons = {
  [ComponentType.TEXT]: Type,
  [ComponentType.BUTTON]: MousePointer,
  [ComponentType.IMAGE]: Image,
  [ComponentType.LAYOUT]: Layers,
  [ComponentType.FORM]: FileText,
  [ComponentType.NAVIGATION]: Navigation,
  [ComponentType.CUSTOM]: Square,
}

interface DraggableComponentProps {
  component: Component
}

function DraggableComponent({ component }: DraggableComponentProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `component-${component.id}`,
    data: {
      type: 'component',
      component,
    },
  })

  const Icon = componentIcons[component.type] || Square

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        p-3 border rounded-lg cursor-grab active:cursor-grabbing
        flex items-center space-x-2 hover:bg-gray-50
        ${isDragging ? 'opacity-50' : ''}
      `}
    >
      <Icon className="w-4 h-4 text-gray-500" />
      <div>
        <div className="text-sm font-medium">{component.name}</div>
        <div className="text-xs text-gray-500">{component.category}</div>
      </div>
    </div>
  )
}

interface ComponentLibraryProps {
  projectId?: number
}

export default function ComponentLibrary({ projectId }: ComponentLibraryProps) {
  const { data: globalComponents = [], isLoading: globalLoading } = useComponents({
    is_global: true
  })
  
  const { data: projectComponents = [], isLoading: projectLoading } = useComponents({
    project_id: projectId
  })

  const groupedComponents = React.useMemo(() => {
    const globalItems = Array.isArray(globalComponents) ? globalComponents : globalComponents?.items || []
    const projectItems = Array.isArray(projectComponents) ? projectComponents : projectComponents?.items || []
    const all = [...globalItems, ...projectItems]
    const grouped: Record<string, Component[]> = {}
    
    all.forEach(component => {
      if (!grouped[component.category]) {
        grouped[component.category] = []
      }
      grouped[component.category].push(component)
    })
    
    return grouped
  }, [globalComponents, projectComponents])

  if (globalLoading || projectLoading) {
    return (
      <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto p-4">
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold">Components</h3>
      </div>
      
      <div className="p-4 space-y-6">
        {Object.entries(groupedComponents).map(([category, components]) => (
          <div key={category}>
            <h4 className="text-sm font-medium text-gray-700 mb-3 capitalize">
              {category}
            </h4>
            <div className="space-y-2">
              {components.map(component => (
                <DraggableComponent
                  key={component.id}
                  component={component}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}