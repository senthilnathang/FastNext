"use client"

import React from 'react'
import Image from 'next/image'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ComponentInstance, ComponentType } from '@/shared/types'
import { cn } from '@/shared/utils'
import DroppableArea from './DroppableArea'

interface ComponentRendererProps {
  instance: ComponentInstance
  allInstances: ComponentInstance[]
  isSelected: boolean
  onSelect: (instanceId: number) => void
}

export default function ComponentRenderer({
  instance,
  allInstances,
  isSelected,
  onSelect,
}: ComponentRendererProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: instance.id.toString(),
    data: {
      type: 'component-instance',
      instance,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Get child instances
  const children = allInstances
    .filter(child => child.parent_id === instance.id)
    .sort((a, b) => a.order_index - b.order_index)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect(instance.id)
  }

  const renderComponent = () => {
    const { component, props } = instance
    
    if (!component) {
      return (
        <div className="p-4 border border-gray-300 bg-gray-100 rounded">
          <div className="text-gray-500 text-sm">Component not found</div>
        </div>
      )
    }

    // Merge default props with instance props
    const mergedProps = { ...component.default_props, ...props }

    switch (component.type) {
      case ComponentType.TEXT:
        return (
          <div
            style={{
              textAlign: (mergedProps.alignment as 'left' | 'center' | 'right' | 'justify') || 'left',
              color: String(mergedProps.color) || '#000000',
              fontSize: mergedProps.fontSize === 'sm' ? '14px' :
                        mergedProps.fontSize === 'lg' ? '18px' :
                        mergedProps.fontSize === 'xl' ? '24px' : '16px'
            }}
          >
            {String(mergedProps.content) || 'Text content'}
          </div>
        )

      case ComponentType.BUTTON:
        return (
          <button
            className={cn(
              'px-4 py-2 rounded transition-colors',
              {
                'bg-blue-500 text-white hover:bg-blue-600': mergedProps.variant === 'primary',
                'bg-gray-500 text-white hover:bg-gray-600': mergedProps.variant === 'secondary',
                'border border-gray-300 bg-white hover:bg-gray-50': mergedProps.variant === 'outline',
              },
              {
                'text-sm px-2 py-1': mergedProps.size === 'sm',
                'text-lg px-6 py-3': mergedProps.size === 'lg',
              }
            )}
          >
            {String(mergedProps.text) || 'Button'}
          </button>
        )

      case ComponentType.IMAGE:
        return (
          <Image
            src={String(mergedProps.src) || 'https://via.placeholder.com/300x200'}
            alt={String(mergedProps.alt) || 'Image'}
            width={parseInt(String(mergedProps.width)) || 300}
            height={parseInt(String(mergedProps.height)) || 200}
            style={{
              objectFit: 'cover',
            }}
          />
        )

      case ComponentType.LAYOUT:
        return (
          <div
            style={{
              padding: String(mergedProps.padding) || '16px',
              margin: String(mergedProps.margin) || '0px',
              backgroundColor: String(mergedProps.backgroundColor) || 'transparent',
              display: 'flex',
              flexDirection: (mergedProps.flexDirection as 'row' | 'column') || 'column',
              minHeight: children.length === 0 ? '100px' : 'auto',
            }}
          >
            {children.length === 0 ? (
              <DroppableArea
                id={`container-${instance.id}`}
                parentId={instance.id}
                className="flex-1 border-2 border-dashed border-gray-300 rounded p-4 flex items-center justify-center"
              >
                <div className="text-gray-500 text-sm">Drop components here</div>
              </DroppableArea>
            ) : (
              children.map(child => (
                <ComponentRenderer
                  key={child.id}
                  instance={child}
                  allInstances={allInstances}
                  isSelected={isSelected}
                  onSelect={onSelect}
                />
              ))
            )}
          </div>
        )

      case ComponentType.FORM:
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {String(mergedProps.label) || 'Label'}
            </label>
            <input
              type={String(mergedProps.type) || 'text'}
              placeholder={String(mergedProps.placeholder) || 'Enter value...'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )

      default:
        return (
          <div className="p-4 border border-gray-300 bg-gray-100 rounded">
            <div className="text-gray-500 text-sm">
              {component.name} ({component.type})
            </div>
          </div>
        )
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        'relative group',
        {
          'opacity-50': isDragging,
          'ring-2 ring-blue-500': isSelected,
        }
      )}
      onClick={handleClick}
    >
      {/* Selection overlay */}
      <div
        className={cn(
          'absolute inset-0 border-2 border-transparent rounded pointer-events-none',
          {
            'border-blue-500 bg-blue-50 bg-opacity-10': isSelected,
            'border-blue-300': !isSelected && !isDragging,
          }
        )}
      />
      
      {/* Drag handle */}
      <div
        {...listeners}
        className={cn(
          'absolute top-0 right-0 w-6 h-6 bg-blue-500 text-white',
          'flex items-center justify-center cursor-grab active:cursor-grabbing',
          'opacity-0 group-hover:opacity-100 transition-opacity',
          'text-xs font-bold rounded-bl',
          { 'opacity-100': isSelected }
        )}
      >
        ⋮⋮
      </div>

      {/* Component content */}
      <div className="relative">
        {renderComponent()}
      </div>
    </div>
  )
}