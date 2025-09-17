"use client"

import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { 
  SortableContext, 
  verticalListSortingStrategy,
  rectSortingStrategy 
} from '@dnd-kit/sortable'
import { usePageComponents } from '@/hooks/useComponents'
import { ComponentInstance } from '@/types'
import DroppableArea from './DroppableArea'
import ComponentRenderer from './ComponentRenderer'

interface CanvasProps {
  pageId: number
  selectedInstanceId?: number
  onSelectInstance: (instanceId: number) => void
}

export default function Canvas({ 
  pageId, 
  selectedInstanceId, 
  onSelectInstance 
}: CanvasProps) {
  const { data: instances = [], isLoading } = usePageComponents(pageId)
  
  const { setNodeRef } = useDroppable({
    id: 'canvas',
    data: {
      type: 'canvas',
      pageId,
    },
  })

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading canvas...</div>
      </div>
    )
  }

  // Filter root level instances (no parent)
  const rootInstances = instances.filter(instance => !instance.parent_id)
  const sortedInstances = rootInstances.sort((a, b) => a.order_index - b.order_index)

  return (
    <div className="flex-1 bg-gray-50 overflow-auto">
      <div 
        ref={setNodeRef}
        className="min-h-full p-8"
      >
        <div className="bg-white shadow-sm border border-gray-200 min-h-[600px] p-4">
          {sortedInstances.length === 0 ? (
            <DroppableArea 
              id="empty-canvas"
              className="h-full flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg"
            >
              <div className="text-center text-gray-500">
                <div className="text-lg font-medium mb-2">
                  Drop components here to start building
                </div>
                <div className="text-sm">
                  Drag components from the library on the left
                </div>
              </div>
            </DroppableArea>
          ) : (
            <SortableContext 
              items={sortedInstances.map(i => i.id.toString())}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {sortedInstances.map((instance) => (
                  <ComponentRenderer
                    key={instance.id}
                    instance={instance}
                    allInstances={instances}
                    isSelected={selectedInstanceId === instance.id}
                    onSelect={onSelectInstance}
                  />
                ))}
              </div>
            </SortableContext>
          )}
        </div>
      </div>
    </div>
  )
}