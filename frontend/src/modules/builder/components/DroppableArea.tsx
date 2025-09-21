"use client"

import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/shared/utils'

interface DroppableAreaProps {
  id: string
  children: React.ReactNode
  className?: string
  parentId?: number
  acceptTypes?: string[]
}

export default function DroppableArea({ 
  id, 
  children, 
  className,
  parentId,
  acceptTypes = ['component']
}: DroppableAreaProps) {
  const { setNodeRef, isOver, active } = useDroppable({
    id,
    data: {
      type: 'droppable-area',
      parentId,
      acceptTypes,
    },
  })

  const canDrop = active && acceptTypes.includes(active.data.current?.type || '')

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'transition-colors duration-200',
        {
          'bg-blue-50 border-blue-300': isOver && canDrop,
          'bg-red-50 border-red-300': isOver && !canDrop,
        },
        className
      )}
    >
      {children}
    </div>
  )
}