"use client";

import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  Edit,
  Eye,
  GripVertical,
  MoreHorizontal,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Input } from "@/shared/components/ui/input";

export interface KanbanColumn {
  id: string;
  title: string;
  color?: string;
  limit?: number;
  count?: number;
}

export interface KanbanCard<T = any> {
  id: string | number;
  title: string;
  description?: string;
  status: string;
  data: T;
  priority?: "low" | "medium" | "high" | "urgent";
  assignee?: {
    id: string;
    name: string;
    avatar?: string;
  };
  labels?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  dueDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface KanbanViewProps<T = any> {
  // Data
  data: T[];
  columns: KanbanColumn[];
  loading?: boolean;
  error?: string | null;

  // Column configuration
  groupByField: keyof T | string;
  cardTitleField: keyof T | string;
  cardDescriptionField?: keyof T | string;

  // Search & Filtering (handled by parent ViewManager)
  // searchQuery and onSearchChange removed - handled by ViewManager
  // filters removed - handled by ViewManager

  // CRUD operations
  onCreateClick?: (columnId: string) => void;
  onEditClick?: (item: T) => void;
  onDeleteClick?: (item: T) => void;
  onViewClick?: (item: T) => void;
  onMoveCard?: (
    cardId: string | number,
    sourceColumnId: string,
    targetColumnId: string,
  ) => void;

  // Quick add
  enableQuickAdd?: boolean;
  onQuickAdd?: (columnId: string, title: string) => void;

  // Card rendering
  renderCard?: (item: T, provided: any) => React.ReactNode;
  cardFields?: Array<{
    key: keyof T | string;
    label: string;
    render?: (value: unknown, item: T) => React.ReactNode;
    type?: "text" | "badge" | "date" | "avatar" | "priority";
  }>;

  // UI customization
  showColumnLimits?: boolean;
  showCardCount?: boolean;
  allowColumnReorder?: boolean;

  // Permissions
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canMove?: boolean;

  // Custom actions
  customActions?: Array<{
    label: string;
    icon?: React.ReactNode;
    action: (item: T) => void;
    variant?:
      | "default"
      | "destructive"
      | "outline"
      | "secondary"
      | "ghost"
      | "link";
  }>;
}

export function KanbanView<T extends { id?: string | number }>({
  data,
  columns: initialColumns,
  loading = false,
  error = null,
  groupByField,
  cardTitleField,
  cardDescriptionField,
  onCreateClick,
  onEditClick,
  onDeleteClick,
  onViewClick,
  onMoveCard,
  enableQuickAdd = false,
  onQuickAdd,
  renderCard,
  cardFields = [],
  showColumnLimits = true,
  showCardCount = true,
  allowColumnReorder = false,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  canMove = true,
  customActions = [],
}: KanbanViewProps<T>) {
  const [quickAddStates, setQuickAddStates] = useState<Record<string, boolean>>(
    {},
  );
  const [quickAddValues, setQuickAddValues] = useState<Record<string, string>>(
    {},
  );
  const [columnOrder, setColumnOrder] = useState<string[]>(
    initialColumns.map((col) => col.id),
  );

  // Use the data directly as it's already filtered by ViewManager
  const filteredData = data;

  // Ordered columns
  const orderedColumns = useMemo(() => {
    return columnOrder
      .map((id) => initialColumns.find((col) => col.id === id))
      .filter((col): col is KanbanColumn => col !== undefined);
  }, [columnOrder, initialColumns]);

  // Group data by columns
  const groupedData = useMemo(() => {
    const groups: Record<string, T[]> = {};

    orderedColumns.forEach((column) => {
      groups[column.id] = filteredData.filter(
        (item) => String(item[groupByField as keyof T]) === column.id,
      );
    });

    return groups;
  }, [filteredData, orderedColumns, groupByField]);

  // Search is handled by parent ViewManager - removed handleSearchChange

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { destination, source, draggableId, type } = result;

      if (!destination) return;

      if (type === "column" && allowColumnReorder) {
        const newColumnOrder = Array.from(columnOrder);
        const [reorderedColumn] = newColumnOrder.splice(source.index, 1);
        newColumnOrder.splice(destination.index, 0, reorderedColumn);
        setColumnOrder(newColumnOrder);
        return;
      }

      if (type === "card") {
        const sourceColumnId = source.droppableId;
        const targetColumnId = destination.droppableId;

        if (
          sourceColumnId === targetColumnId &&
          source.index === destination.index
        ) {
          return;
        }

        if (canMove && onMoveCard) {
          onMoveCard(draggableId, sourceColumnId, targetColumnId);
        }
      }
    },
    [columnOrder, allowColumnReorder, canMove, onMoveCard],
  );

  const handleQuickAdd = useCallback(
    (columnId: string) => {
      const title = quickAddValues[columnId]?.trim();
      if (title && onQuickAdd) {
        onQuickAdd(columnId, title);
        setQuickAddValues((prev) => ({ ...prev, [columnId]: "" }));
        setQuickAddStates((prev) => ({ ...prev, [columnId]: false }));
      }
    },
    [quickAddValues, onQuickAdd],
  );

  const toggleQuickAdd = useCallback((columnId: string, show: boolean) => {
    setQuickAddStates((prev) => ({ ...prev, [columnId]: show }));
    if (!show) {
      setQuickAddValues((prev) => ({ ...prev, [columnId]: "" }));
    }
  }, []);

  const renderPriorityBadge = useCallback((priority: string) => {
    const colors = {
      low: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-orange-100 text-orange-800",
      urgent: "bg-red-100 text-red-800",
    };

    return (
      <Badge
        className={`text-xs ${colors[priority as keyof typeof colors] || colors.medium}`}
      >
        {priority}
      </Badge>
    );
  }, []);

  const renderDefaultCard = useCallback(
    (item: T, provided: any) => {
      const title = String(item[cardTitleField as keyof T] || "");
      const description = cardDescriptionField
        ? String(item[cardDescriptionField as keyof T] || "")
        : "";

      return (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="cursor-move hover:shadow-md transition-shadow bg-white mb-2"
        >
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-sm font-medium line-clamp-2 flex-1">
                {title}
              </CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onViewClick && (
                    <DropdownMenuItem onClick={() => onViewClick(item)}>
                      <Eye className="h-3 w-3 mr-2" />
                      View
                    </DropdownMenuItem>
                  )}
                  {canEdit && onEditClick && (
                    <DropdownMenuItem onClick={() => onEditClick(item)}>
                      <Edit className="h-3 w-3 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {customActions.map((action, index) => (
                    <DropdownMenuItem
                      key={index}
                      onClick={() => action.action(item)}
                    >
                      {action.icon}
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                  {canDelete && onDeleteClick && (
                    <DropdownMenuItem
                      onClick={() => onDeleteClick(item)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-3 w-3 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                {description}
              </p>
            )}
          </CardHeader>

          {cardFields.length > 0 && (
            <CardContent className="pt-0 pb-3">
              <div className="space-y-2">
                {cardFields.map((field, index) => {
                  const value = item[field.key as keyof T];

                  if (field.type === "badge" && value) {
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-1 flex-wrap"
                      >
                        <span className="text-xs text-muted-foreground">
                          {field.label}:
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {field.render
                            ? field.render(value, item)
                            : String(value)}
                        </Badge>
                      </div>
                    );
                  }

                  if (field.type === "priority" && value) {
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {field.label}:
                        </span>
                        {renderPriorityBadge(String(value))}
                      </div>
                    );
                  }

                  if (field.type === "date" && value) {
                    const date = new Date(value as string);
                    return (
                      <div key={index} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          {field.label}:
                        </span>
                        <span>{date.toLocaleDateString()}</span>
                      </div>
                    );
                  }

                  return (
                    <div key={index} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        {field.label}:
                      </span>
                      <span className="text-right flex-1 ml-2">
                        {field.render
                          ? field.render(value, item)
                          : String(value || "-")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          )}
        </Card>
      );
    },
    [
      cardTitleField,
      cardDescriptionField,
      cardFields,
      canEdit,
      canDelete,
      onViewClick,
      onEditClick,
      onDeleteClick,
      customActions,
      renderPriorityBadge,
    ],
  );

  const renderColumn = useCallback(
    (column: KanbanColumn, index: number) => {
      const columnItems = groupedData[column.id] || [];
      const isOverLimit = column.limit && columnItems.length >= column.limit;
      const isQuickAddActive = quickAddStates[column.id];

      return (
        <Draggable
          key={column.id}
          draggableId={column.id}
          index={index}
          isDragDisabled={!allowColumnReorder}
        >
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              className="flex-shrink-0 w-80"
            >
              <div className="bg-muted/30 rounded-lg p-4 h-full">
                {/* Column Header */}
                <div
                  {...(allowColumnReorder ? provided.dragHandleProps : {})}
                  className="flex items-center justify-between mb-4"
                >
                  <div className="flex items-center gap-2">
                    {allowColumnReorder && (
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    )}
                    <h3 className="font-semibold text-sm">{column.title}</h3>
                    {showCardCount && (
                      <Badge variant="secondary" className="text-xs">
                        {columnItems.length}
                        {showColumnLimits && column.limit && `/${column.limit}`}
                      </Badge>
                    )}
                  </div>

                  {canCreate && onCreateClick && !isOverLimit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onCreateClick(column.id)}
                      className="h-6 w-6 p-0"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {/* Quick Add */}
                {enableQuickAdd && !isOverLimit && (
                  <div className="mb-3">
                    {isQuickAddActive ? (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter title..."
                          value={quickAddValues[column.id] || ""}
                          onChange={(e) =>
                            setQuickAddValues((prev) => ({
                              ...prev,
                              [column.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleQuickAdd(column.id);
                            } else if (e.key === "Escape") {
                              toggleQuickAdd(column.id, false);
                            }
                          }}
                          className="text-sm"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={() => handleQuickAdd(column.id)}
                          disabled={!quickAddValues[column.id]?.trim()}
                        >
                          Add
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleQuickAdd(column.id, false)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleQuickAdd(column.id, true)}
                        className="w-full justify-start text-muted-foreground hover:text-foreground"
                      >
                        <Plus className="h-3 w-3 mr-2" />
                        Add card
                      </Button>
                    )}
                  </div>
                )}

                {/* Cards Droppable Area */}
                <Droppable droppableId={column.id} type="card">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[200px] transition-colors ${
                        snapshot.isDraggingOver ? "bg-muted/50" : ""
                      }`}
                    >
                      {columnItems.map((item, cardIndex) => {
                        // Generate a unique key for items without id
                        const itemId = item.id ?? `temp-${cardIndex}`;
                        return (
                          <Draggable
                            key={String(itemId)}
                            draggableId={String(itemId)}
                            index={cardIndex}
                            isDragDisabled={!canMove}
                          >
                            {(provided) => (
                              <div className="group">
                                {renderCard
                                  ? renderCard(item, provided)
                                  : renderDefaultCard(item, provided)}
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}

                      {/* Empty State */}
                      {columnItems.length === 0 && (
                        <div className="text-center py-8">
                          <p className="text-sm text-muted-foreground">
                            No items in {column.title.toLowerCase()}
                          </p>
                          {canCreate && onCreateClick && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2"
                              onClick={() => onCreateClick(column.id)}
                            >
                              <Plus className="h-3 w-3 mr-2" />
                              Add first item
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>

                {/* Column Limit Warning */}
                {isOverLimit && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                    Column limit reached ({column.limit})
                  </div>
                )}
              </div>
            </div>
          )}
        </Draggable>
      );
    },
    [
      groupedData,
      allowColumnReorder,
      showCardCount,
      showColumnLimits,
      canCreate,
      onCreateClick,
      enableQuickAdd,
      quickAddStates,
      quickAddValues,
      canMove,
      renderCard,
      renderDefaultCard,
      handleQuickAdd,
      toggleQuickAdd,
    ],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive mb-2">Error loading kanban data</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable
          droppableId="board"
          type="column"
          direction="horizontal"
          isDropDisabled={!allowColumnReorder}
        >
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex gap-4 overflow-x-auto pb-4 h-full"
            >
              {orderedColumns.map((column, index) =>
                renderColumn(column, index),
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
