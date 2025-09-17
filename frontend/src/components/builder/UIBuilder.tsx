"use client"

import React, { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import ComponentLibrary from './ComponentLibrary'
import Canvas from './Canvas'
import PropertyPanel from './PropertyPanel'
import { usePageComponents, useCreateComponentInstance, useUpdateComponentInstance } from '@/hooks/useComponents'
import { Component } from '@/types'

interface UIBuilderProps {
  projectId: number
  pageId: number
}

export default function UIBuilder({ projectId, pageId }: UIBuilderProps) {
  const [selectedInstanceId, setSelectedInstanceId] = useState<number | undefined>()
  const [activeId, setActiveId] = useState<string | null>(null)

  const { data: instances = [] } = usePageComponents(pageId)
  const createInstanceMutation = useCreateComponentInstance()
  const updateInstanceMutation = useUpdateComponentInstance()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const selectedInstance = selectedInstanceId 
    ? instances.find(instance => instance.id === selectedInstanceId)
    : null

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    // Handle drag over logic if needed
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const activeData = active.data.current
    const overData = over.data.current

    // Dropping a component from library
    if (activeData?.type === 'component' && overData?.type === 'canvas') {
      const component: Component = activeData.component
      
      try {
        await createInstanceMutation.mutateAsync({
          component_id: component.id,
          page_id: pageId,
          props: component.default_props || {},
          order_index: instances.length,
        })
      } catch (error) {
        console.error('Failed to create component instance:', error)
      }
      return
    }

    // Dropping a component into a container
    if (activeData?.type === 'component' && overData?.type === 'droppable-area') {
      const component: Component = activeData.component
      
      try {
        await createInstanceMutation.mutateAsync({
          component_id: component.id,
          page_id: pageId,
          props: component.default_props || {},
          parent_id: overData.parentId,
          order_index: 0,
        })
      } catch (error) {
        console.error('Failed to create component instance:', error)
      }
      return
    }

    // Reordering existing components
    if (activeData?.type === 'component-instance' && overData?.type === 'component-instance') {
      const activeInstance = activeData.instance
      const overInstance = overData.instance

      // Only reorder if they have the same parent
      if (activeInstance.parent_id === overInstance.parent_id) {
        const siblings = instances.filter(
          instance => instance.parent_id === activeInstance.parent_id
        ).sort((a, b) => a.order_index - b.order_index)

        const oldIndex = siblings.findIndex(instance => instance.id === activeInstance.id)
        const newIndex = siblings.findIndex(instance => instance.id === overInstance.id)

        if (oldIndex !== newIndex) {
          const newOrder = arrayMove(siblings, oldIndex, newIndex)
          
          // Update order for all affected instances
          for (let i = 0; i < newOrder.length; i++) {
            if (newOrder[i].order_index !== i) {
              try {
                await updateInstanceMutation.mutateAsync({
                  id: newOrder[i].id,
                  data: { order_index: i }
                })
              } catch (error) {
                console.error('Failed to update component order:', error)
              }
            }
          }
        }
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-screen bg-gray-100">
        <ComponentLibrary projectId={projectId} />
        
        <Canvas 
          pageId={pageId}
          selectedInstanceId={selectedInstanceId}
          onSelectInstance={setSelectedInstanceId}
        />
        
        <PropertyPanel instance={selectedInstance} />
      </div>
    </DndContext>
  )
}