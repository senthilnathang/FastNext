"use client"

import * as React from "react"
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import {
  useSortable,
} from "@dnd-kit/sortable"
import { Plus, MoreHorizontal, GripVertical } from "lucide-react"

import { cn } from '@/shared/utils'
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"

export interface KanbanItem {
  id: string
  title: string
  description?: string
  status: string
  priority?: "low" | "medium" | "high"
  assignee?: string
  tags?: string[]
  createdAt?: Date
  updatedAt?: Date
  [key: string]: unknown
}

export interface KanbanColumn {
  id: string
  title: string
  items: KanbanItem[]
  color?: string
  limit?: number
}

interface KanbanItemProps {
  item: KanbanItem
  onEdit?: (item: KanbanItem) => void
  onDelete?: (item: KanbanItem) => void
  renderItem?: (item: KanbanItem) => React.ReactNode
}

function KanbanItemCard({ item, onEdit, onDelete, renderItem }: KanbanItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
  })

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  if (renderItem) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        {renderItem(item)}
      </div>
    )
  }

  const priorityColors = {
    low: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800", 
    high: "bg-red-100 text-red-800",
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-grab active:cursor-grabbing mb-3 hover:shadow-md transition-shadow",
        isDragging && "shadow-lg"
      )}
      {...attributes}
      {...listeners}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium leading-tight">{item.title}</h4>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(item)}>
                  Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  className="text-red-600"
                  onClick={() => onDelete(item)}
                >
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {item.description && (
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
            {item.description}
          </p>
        )}
        
        <div className="flex flex-wrap gap-1 mb-2">
          {item.priority && (
            <Badge 
              variant="secondary" 
              className={cn("text-xs", priorityColors[item.priority])}
            >
              {item.priority}
            </Badge>
          )}
          {item.tags?.map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        {item.assignee && (
          <div className="text-xs text-muted-foreground">
            Assigned to: {item.assignee}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface KanbanColumnProps {
  column: KanbanColumn
  onAddItem?: (columnId: string) => void
  onEditItem?: (item: KanbanItem) => void
  onDeleteItem?: (item: KanbanItem) => void
  renderItem?: (item: KanbanItem) => React.ReactNode
  renderColumnHeader?: (column: KanbanColumn) => React.ReactNode
}

function KanbanColumnComponent({ 
  column, 
  onAddItem, 
  onEditItem, 
  onDeleteItem, 
  renderItem,
  renderColumnHeader 
}: KanbanColumnProps) {
  const {
    setNodeRef,
    isOver,
  } = useSortable({
    id: column.id,
    data: {
      type: "column",
      column,
    },
  })

  const isOverLimit = column.limit && column.items.length >= column.limit

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "bg-muted/30 rounded-lg p-3 min-h-96 w-72 flex-shrink-0",
        isOver && "bg-muted/50"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        {renderColumnHeader ? (
          renderColumnHeader(column)
        ) : (
          <>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm">{column.title}</h3>
              <Badge variant="secondary" className="text-xs">
                {column.items.length}
                {column.limit && `/${column.limit}`}
              </Badge>
            </div>
            {onAddItem && !isOverLimit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onAddItem(column.id)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            )}
          </>
        )}
      </div>

      {isOverLimit && (
        <div className="text-xs text-amber-600 mb-2">
          Column limit reached ({column.limit})
        </div>
      )}

      <SortableContext items={column.items.map(item => item.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {column.items.map(item => (
            <KanbanItemCard
              key={item.id}
              item={item}
              onEdit={onEditItem}
              onDelete={onDeleteItem}
              renderItem={renderItem}
            />
          ))}
        </div>
      </SortableContext>

      {column.items.length === 0 && (
        <div className="text-center text-muted-foreground text-sm mt-8">
          No items in this column
        </div>
      )}
    </div>
  )
}

interface KanbanBoardProps {
  columns: KanbanColumn[]
  onColumnsChange?: (columns: KanbanColumn[]) => void
  onAddItem?: (columnId: string) => void
  onEditItem?: (item: KanbanItem) => void
  onDeleteItem?: (item: KanbanItem) => void
  onMoveItem?: (itemId: string, fromColumn: string, toColumn: string) => void
  renderItem?: (item: KanbanItem) => React.ReactNode
  renderColumnHeader?: (column: KanbanColumn) => React.ReactNode
  className?: string
}

export function KanbanBoard({
  columns,
  onColumnsChange,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onMoveItem,
  renderItem,
  renderColumnHeader,
  className,
}: KanbanBoardProps) {
  const [activeItem, setActiveItem] = React.useState<KanbanItem | null>(null)
  const sensors = useSensors(useSensor(PointerSensor))

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const item = columns
      .flatMap(col => col.items)
      .find(item => item.id === active.id)
    
    if (item) {
      setActiveItem(item)
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id
    const overId = over.id

    if (activeId === overId) return

    // Find the columns
    const activeColumn = columns.find(col => 
      col.items.some(item => item.id === activeId)
    )
    const overColumn = columns.find(col => 
      col.id === overId || col.items.some(item => item.id === overId)
    )

    if (!activeColumn || !overColumn) return

    // If moving to a different column
    if (activeColumn.id !== overColumn.id) {
      // Check column limits
      if (overColumn.limit && overColumn.items.length >= overColumn.limit) {
        return
      }

      const newColumns = columns.map(col => {
        if (col.id === activeColumn.id) {
          return {
            ...col,
            items: col.items.filter(item => item.id !== activeId)
          }
        }
        if (col.id === overColumn.id) {
          const activeItem = activeColumn.items.find(item => item.id === activeId)!
          const overIndex = col.items.findIndex(item => item.id === overId)
          const insertIndex = overIndex >= 0 ? overIndex : col.items.length

          return {
            ...col,
            items: [
              ...col.items.slice(0, insertIndex),
              { ...activeItem, status: col.id },
              ...col.items.slice(insertIndex)
            ]
          }
        }
        return col
      })

      onColumnsChange?.(newColumns)
      onMoveItem?.(activeId.toString(), activeColumn.id, overColumn.id)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveItem(null)
    const { active, over } = event

    if (!over) return

    const activeId = active.id
    const overId = over.id

    if (activeId === overId) return

    // Handle reordering within the same column
    const activeColumn = columns.find(col => 
      col.items.some(item => item.id === activeId)
    )

    if (activeColumn) {
      const overItem = activeColumn.items.find(item => item.id === overId)
      
      if (overItem) {
        const activeIndex = activeColumn.items.findIndex(item => item.id === activeId)
        const overIndex = activeColumn.items.findIndex(item => item.id === overId)

        const newColumns = columns.map(col => {
          if (col.id === activeColumn.id) {
            return {
              ...col,
              items: arrayMove(col.items, activeIndex, overIndex)
            }
          }
          return col
        })

        onColumnsChange?.(newColumns)
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className={cn("flex gap-4 overflow-x-auto pb-4", className)}>
        {columns.map(column => (
          <KanbanColumnComponent
            key={column.id}
            column={column}
            onAddItem={onAddItem}
            onEditItem={onEditItem}
            onDeleteItem={onDeleteItem}
            renderItem={renderItem}
            renderColumnHeader={renderColumnHeader}
          />
        ))}
      </div>

      <DragOverlay>
        {activeItem ? (
          <KanbanItemCard
            item={activeItem}
            renderItem={renderItem}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}