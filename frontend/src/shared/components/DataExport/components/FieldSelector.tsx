"use client";

import {
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  Hash,
  Search,
  Square,
  ToggleLeft,
  Type,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Separator } from "@/shared/components/ui/separator";
import type { ExportColumn } from "../types";

interface FieldSelectorProps {
  columns: ExportColumn[];
  selectedColumns: string[];
  onSelectionChange: (columns: string[]) => void;
  className?: string;
}

const getTypeIcon = (type: ExportColumn["type"]) => {
  switch (type) {
    case "string":
      return <Type className="h-3 w-3" />;
    case "number":
      return <Hash className="h-3 w-3" />;
    case "date":
      return <Calendar className="h-3 w-3" />;
    case "boolean":
      return <ToggleLeft className="h-3 w-3" />;
    case "object":
      return <FileText className="h-3 w-3" />;
    default:
      return <Type className="h-3 w-3" />;
  }
};

const getTypeColor = (type: ExportColumn["type"]) => {
  switch (type) {
    case "string":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    case "number":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    case "date":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
    case "boolean":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
    case "object":
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
  }
};

export function FieldSelector({
  columns,
  selectedColumns,
  onSelectionChange,
  className,
}: FieldSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [groupByType, setGroupByType] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(["all"]),
  );

  const filteredColumns = useMemo(() => {
    return columns.filter(
      (column) =>
        column.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        column.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        column.description?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [columns, searchTerm]);

  const groupedColumns = useMemo(() => {
    if (!groupByType) {
      return { all: filteredColumns };
    }

    return filteredColumns.reduce(
      (groups, column) => {
        const type = column.type || "string";
        if (!groups[type]) {
          groups[type] = [];
        }
        groups[type].push(column);
        return groups;
      },
      {} as Record<string, ExportColumn[]>,
    );
  }, [filteredColumns, groupByType]);

  const selectedCount = selectedColumns.length;
  const totalCount = columns.length;
  const isAllSelected = selectedCount === totalCount;

  const handleSelectAll = () => {
    if (isAllSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(columns.map((col) => col.key));
    }
  };

  const handleColumnToggle = (columnKey: string) => {
    if (selectedColumns.includes(columnKey)) {
      onSelectionChange(selectedColumns.filter((key) => key !== columnKey));
    } else {
      onSelectionChange([...selectedColumns, columnKey]);
    }
  };

  const handleGroupToggle = (groupColumns: ExportColumn[]) => {
    const groupKeys = groupColumns.map((col) => col.key);
    const allGroupSelected = groupKeys.every((key) =>
      selectedColumns.includes(key),
    );

    if (allGroupSelected) {
      // Deselect all in group
      onSelectionChange(
        selectedColumns.filter((key) => !groupKeys.includes(key)),
      );
    } else {
      // Select all in group
      const newSelection = [...selectedColumns];
      groupKeys.forEach((key) => {
        if (!newSelection.includes(key)) {
          newSelection.push(key);
        }
      });
      onSelectionChange(newSelection);
    }
  };

  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  const renderColumnItem = (column: ExportColumn) => {
    const isSelected = selectedColumns.includes(column.key);

    return (
      <div
        key={column.key}
        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <Checkbox
          id={column.key}
          checked={isSelected}
          onCheckedChange={() => handleColumnToggle(column.key)}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <Label
              htmlFor={column.key}
              className="text-sm font-medium cursor-pointer truncate"
            >
              {column.label}
            </Label>

            {column.required && (
              <Badge variant="destructive" className="text-xs">
                Required
              </Badge>
            )}

            <Badge
              variant="secondary"
              className={`text-xs ${getTypeColor(column.type)}`}
            >
              <div className="flex items-center space-x-1">
                {getTypeIcon(column.type)}
                <span>{column.type}</span>
              </div>
            </Badge>
          </div>

          {column.key !== column.label && (
            <div className="text-xs text-gray-500 mt-1">{column.key}</div>
          )}

          {column.description && (
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {column.description}
            </div>
          )}

          {column.format && (
            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Format: {column.format}
            </div>
          )}
        </div>

        <div className="flex items-center text-gray-400">
          {isSelected ? (
            <Eye className="h-4 w-4" />
          ) : (
            <EyeOff className="h-4 w-4" />
          )}
        </div>
      </div>
    );
  };

  const renderGroup = (groupName: string, groupColumns: ExportColumn[]) => {
    const isExpanded = expandedGroups.has(groupName);
    const groupSelectedCount = groupColumns.filter((col) =>
      selectedColumns.includes(col.key),
    ).length;
    const isGroupAllSelected = groupSelectedCount === groupColumns.length;
    const isGroupPartiallySelected =
      groupSelectedCount > 0 && groupSelectedCount < groupColumns.length;

    if (groupByType && groupName !== "all") {
      return (
        <div key={groupName} className="space-y-2">
          <Collapsible>
            <CollapsibleTrigger
              onClick={() => toggleGroup(groupName)}
              className="flex items-center justify-between w-full p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGroupToggle(groupColumns);
                    }}
                    className="p-0 h-auto"
                  >
                    {isGroupAllSelected ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : isGroupPartiallySelected ? (
                      <div className="h-4 w-4 border border-gray-400 bg-gray-200 dark:bg-gray-600 rounded-sm flex items-center justify-center">
                        <div className="h-2 w-2 bg-blue-600 rounded-sm" />
                      </div>
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <div className="flex items-center space-x-2">
                  {getTypeIcon(groupName as ExportColumn["type"])}
                  <span className="font-medium capitalize">{groupName}</span>
                  <Badge variant="outline">
                    {groupSelectedCount}/{groupColumns.length}
                  </Badge>
                </div>
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent className="space-y-1 mt-2 ml-6">
              {isExpanded && groupColumns.map(renderColumnItem)}
            </CollapsibleContent>
          </Collapsible>
        </div>
      );
    }

    return (
      <div key={groupName} className="space-y-1">
        {groupColumns.map(renderColumnItem)}
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Field Selection</CardTitle>
            <CardDescription>
              Choose which fields to include in your export ({selectedCount}/
              {totalCount} selected)
            </CardDescription>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGroupByType(!groupByType)}
            >
              {groupByType ? "Ungroup" : "Group by Type"}
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search fields..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            className="whitespace-nowrap"
          >
            {isAllSelected ? (
              <>
                <CheckSquare className="h-4 w-4 mr-2" />
                Deselect All
              </>
            ) : (
              <>
                <Square className="h-4 w-4 mr-2" />
                Select All
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {filteredColumns.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No fields found matching your search.
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {Object.entries(groupedColumns).map(([groupName, groupColumns]) =>
              renderGroup(groupName, groupColumns),
            )}
          </div>
        )}

        {selectedCount > 0 && (
          <>
            <Separator className="my-4" />
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>
                {selectedCount} field{selectedCount !== 1 ? "s" : ""} selected
              </span>
              {selectedCount < totalCount && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() =>
                    onSelectionChange(columns.map((col) => col.key))
                  }
                  className="h-auto p-0 text-xs"
                >
                  Select remaining {totalCount - selectedCount}
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
