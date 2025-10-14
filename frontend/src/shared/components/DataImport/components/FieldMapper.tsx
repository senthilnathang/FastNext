"use client";

import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle,
  FileText,
  Hash,
  Link,
  Mail,
  Plus,
  RotateCcw,
  Search,
  ToggleLeft,
  Trash2,
  Type,
  X,
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
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Separator } from "@/shared/components/ui/separator";
import { Switch } from "@/shared/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";

import type { ImportColumn, ImportFieldMapping } from "../types";

interface FieldMapperProps {
  sourceHeaders: string[];
  targetColumns: ImportColumn[];
  mappings: ImportFieldMapping[];
  sampleData?: Record<string, any>[];
  onMappingsChange: (mappings: ImportFieldMapping[]) => void;
  className?: string;
}

const getTypeIcon = (type: ImportColumn["type"]) => {
  switch (type) {
    case "string":
      return <Type className="h-3 w-3" />;
    case "number":
      return <Hash className="h-3 w-3" />;
    case "date":
      return <Calendar className="h-3 w-3" />;
    case "boolean":
      return <ToggleLeft className="h-3 w-3" />;
    case "email":
      return <Mail className="h-3 w-3" />;
    case "url":
      return <Link className="h-3 w-3" />;
    case "object":
      return <FileText className="h-3 w-3" />;
    default:
      return <Type className="h-3 w-3" />;
  }
};

const getTypeColor = (type: ImportColumn["type"]) => {
  switch (type) {
    case "string":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    case "number":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    case "date":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
    case "boolean":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
    case "email":
      return "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300";
    case "url":
      return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300";
    case "object":
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
  }
};

export function FieldMapper({
  sourceHeaders,
  targetColumns,
  mappings,
  sampleData = [],
  onMappingsChange,
  className,
}: FieldMapperProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showUnmapped, setShowUnmapped] = useState(false);
  const [showSampleData, setShowSampleData] = useState(true);

  const filteredMappings = useMemo(() => {
    let filtered = mappings;

    if (searchTerm) {
      filtered = filtered.filter(
        (mapping) =>
          mapping.sourceColumn
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          mapping.targetColumn.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    if (showUnmapped) {
      filtered = filtered.filter(
        (mapping) =>
          !mapping.targetColumn ||
          mapping.targetColumn === mapping.sourceColumn,
      );
    }

    return filtered;
  }, [mappings, searchTerm, showUnmapped]);

  const mappingStats = useMemo(() => {
    const mapped = mappings.filter(
      (m) => m.targetColumn && m.targetColumn !== m.sourceColumn,
    ).length;
    const unmapped = mappings.length - mapped;
    const requiredTargets = targetColumns.filter((col) => col.required);
    const mappedRequired = requiredTargets.filter((col) =>
      mappings.some((m) => m.targetColumn === col.key),
    ).length;

    return {
      mapped,
      unmapped,
      total: mappings.length,
      requiredTargets: requiredTargets.length,
      mappedRequired,
    };
  }, [mappings, targetColumns]);

  const handleMappingChange = (
    sourceColumn: string,
    field: keyof ImportFieldMapping,
    value: any,
  ) => {
    const newMappings = mappings.map((mapping) =>
      mapping.sourceColumn === sourceColumn
        ? { ...mapping, [field]: value }
        : mapping,
    );
    onMappingsChange(newMappings);
  };

  const handleAddMapping = () => {
    const unmappedHeaders = sourceHeaders.filter(
      (header) => !mappings.some((m) => m.sourceColumn === header),
    );

    if (unmappedHeaders.length > 0) {
      const newMapping: ImportFieldMapping = {
        sourceColumn: unmappedHeaders[0],
        targetColumn: unmappedHeaders[0],
        skipEmpty: true,
      };
      onMappingsChange([...mappings, newMapping]);
    }
  };

  const handleRemoveMapping = (sourceColumn: string) => {
    const newMappings = mappings.filter((m) => m.sourceColumn !== sourceColumn);
    onMappingsChange(newMappings);
  };

  const handleAutoMap = () => {
    const newMappings = sourceHeaders.map((sourceHeader) => {
      // Try to find exact match first
      let targetColumn = targetColumns.find(
        (col) => col.key === sourceHeader || col.label === sourceHeader,
      );

      // If no exact match, try case-insensitive match
      if (!targetColumn) {
        targetColumn = targetColumns.find(
          (col) =>
            col.key.toLowerCase() === sourceHeader.toLowerCase() ||
            col.label.toLowerCase() === sourceHeader.toLowerCase(),
        );
      }

      return {
        sourceColumn: sourceHeader,
        targetColumn: targetColumn ? targetColumn.key : sourceHeader,
        skipEmpty: true,
      };
    });

    onMappingsChange(newMappings);
  };

  const handleClearMappings = () => {
    const clearedMappings = mappings.map((mapping) => ({
      ...mapping,
      targetColumn: mapping.sourceColumn,
    }));
    onMappingsChange(clearedMappings);
  };

  const getTargetColumn = (targetKey: string) => {
    return targetColumns.find((col) => col.key === targetKey);
  };

  const renderMappingRow = (mapping: ImportFieldMapping) => {
    const targetColumn = getTargetColumn(mapping.targetColumn);
    const isMapped =
      mapping.targetColumn && mapping.targetColumn !== mapping.sourceColumn;
    const sampleValue = sampleData[0]?.[mapping.sourceColumn];

    return (
      <TableRow
        key={mapping.sourceColumn}
        className="hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        {/* Source Column */}
        <TableCell className="font-medium">
          <div className="flex items-center space-x-2">
            <span>{mapping.sourceColumn}</span>
            {!isMapped && (
              <Badge variant="outline" className="text-xs">
                Unmapped
              </Badge>
            )}
          </div>
          {showSampleData && sampleValue && (
            <div className="text-xs text-gray-500 mt-1 truncate max-w-[150px]">
              Sample: {String(sampleValue)}
            </div>
          )}
        </TableCell>

        {/* Arrow */}
        <TableCell className="w-12 text-center">
          <ArrowRight
            className={`h-4 w-4 ${isMapped ? "text-green-500" : "text-gray-400"}`}
          />
        </TableCell>

        {/* Target Column */}
        <TableCell>
          <Select
            value={mapping.targetColumn}
            onValueChange={(value) =>
              handleMappingChange(mapping.sourceColumn, "targetColumn", value)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select target column" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={mapping.sourceColumn}>
                <div className="flex items-center space-x-2">
                  <X className="h-4 w-4 text-gray-400" />
                  <span>No mapping</span>
                </div>
              </SelectItem>
              {targetColumns.map((column) => (
                <SelectItem key={column.key} value={column.key}>
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(column.type)}
                    <span>{column.label}</span>
                    {column.required && (
                      <Badge variant="destructive" className="text-xs">
                        Required
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {targetColumn && (
            <div className="flex items-center space-x-2 mt-1">
              <Badge
                variant="secondary"
                className={`text-xs ${getTypeColor(targetColumn.type)}`}
              >
                <div className="flex items-center space-x-1">
                  {getTypeIcon(targetColumn.type)}
                  <span>{targetColumn.type}</span>
                </div>
              </Badge>
              {targetColumn.required && (
                <Badge variant="destructive" className="text-xs">
                  Required
                </Badge>
              )}
              {targetColumn.unique && (
                <Badge variant="outline" className="text-xs">
                  Unique
                </Badge>
              )}
            </div>
          )}
        </TableCell>

        {/* Transform */}
        <TableCell>
          <Select
            value={mapping.transform || ""}
            onValueChange={(value) =>
              handleMappingChange(
                mapping.sourceColumn,
                "transform",
                value || undefined,
              )
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="No transform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No transform</SelectItem>
              <SelectItem value="uppercase">UPPERCASE</SelectItem>
              <SelectItem value="lowercase">lowercase</SelectItem>
              <SelectItem value="trim">Trim whitespace</SelectItem>
              <SelectItem value="number">Convert to number</SelectItem>
              <SelectItem value="boolean">Convert to boolean</SelectItem>
              <SelectItem value="date">Convert to date</SelectItem>
            </SelectContent>
          </Select>
        </TableCell>

        {/* Options */}
        <TableCell>
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`skip-empty-${mapping.sourceColumn}`}
              checked={mapping.skipEmpty || false}
              onCheckedChange={(checked) =>
                handleMappingChange(mapping.sourceColumn, "skipEmpty", checked)
              }
            />
            <Label
              htmlFor={`skip-empty-${mapping.sourceColumn}`}
              className="text-xs"
            >
              Skip empty
            </Label>
          </div>
        </TableCell>

        {/* Actions */}
        <TableCell>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRemoveMapping(mapping.sourceColumn)}
            className="h-8 w-8 p-0"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Field Mapping</CardTitle>
            <CardDescription>
              Map your source columns to target database fields
            </CardDescription>
          </div>

          <div className="flex items-center space-x-2">
            {mappingStats.mappedRequired < mappingStats.requiredTargets && (
              <Badge variant="destructive" className="text-xs">
                Missing required:{" "}
                {mappingStats.requiredTargets - mappingStats.mappedRequired}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {mappingStats.mapped}/{mappingStats.total} mapped
            </Badge>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-center space-x-4 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search mappings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="show-unmapped"
                checked={showUnmapped}
                onCheckedChange={setShowUnmapped}
              />
              <Label htmlFor="show-unmapped" className="text-sm">
                Show unmapped only
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="show-sample"
                checked={showSampleData}
                onCheckedChange={setShowSampleData}
              />
              <Label htmlFor="show-sample" className="text-sm">
                Show sample data
              </Label>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleAutoMap}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Auto Map
            </Button>

            <Button variant="outline" size="sm" onClick={handleClearMappings}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Clear
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleAddMapping}
              disabled={sourceHeaders.length <= mappings.length}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Mapping
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Mapping Statistics */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {mappingStats.mapped}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Mapped
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {mappingStats.unmapped}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Unmapped
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {mappingStats.total}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Columns
            </div>
          </div>
          <div className="text-center">
            <div
              className={`text-2xl font-bold ${
                mappingStats.mappedRequired === mappingStats.requiredTargets
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {mappingStats.mappedRequired}/{mappingStats.requiredTargets}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Required Fields
            </div>
          </div>
        </div>

        <Separator className="mb-4" />

        {/* Mapping Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source Column</TableHead>
                <TableHead className="w-12"></TableHead>
                <TableHead>Target Column</TableHead>
                <TableHead>Transform</TableHead>
                <TableHead>Options</TableHead>
                <TableHead className="w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMappings.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-gray-500"
                  >
                    {searchTerm || showUnmapped
                      ? "No mappings found matching your criteria"
                      : "No field mappings defined"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredMappings.map(renderMappingRow)
              )}
            </TableBody>
          </Table>
        </div>

        {/* Validation Summary */}
        {mappingStats.mappedRequired < mappingStats.requiredTargets && (
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-yellow-800 dark:text-yellow-200">
                  Missing Required Field Mappings
                </div>
                <div className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  The following required fields are not mapped:
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {targetColumns
                    .filter(
                      (col) =>
                        col.required &&
                        !mappings.some((m) => m.targetColumn === col.key),
                    )
                    .map((col) => (
                      <Badge
                        key={col.key}
                        variant="destructive"
                        className="text-xs"
                      >
                        {col.label}
                      </Badge>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          <p>
            <strong>Auto Map:</strong> Automatically matches columns by name
            similarity.
            <br />
            <strong>Transform:</strong> Apply data transformations during
            import.
            <br />
            <strong>Skip Empty:</strong> Skip rows where this field is empty.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
