"use client";

import {
  ChevronDown,
  ChevronRight,
  Code,
  Database,
  FileSpreadsheet,
  FileText,
  Info,
  Settings,
} from "lucide-react";
import { useId, useState } from "react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Separator } from "@/shared/components/ui/separator";
import { Switch } from "@/shared/components/ui/switch";
import type { ExportFormat, ExportOptions } from "../types";

interface FormatSelectorProps {
  selectedFormat: ExportFormat;
  options: Partial<ExportOptions>;
  onFormatChange: (format: ExportFormat) => void;
  onOptionsChange: (options: Partial<ExportOptions>) => void;
  allowedFormats?: ExportFormat[];
  className?: string;
}

const formatConfig = {
  csv: {
    icon: FileText,
    label: "CSV",
    description:
      "Comma-separated values, compatible with Excel and most data tools",
    extension: ".csv",
    mimeType: "text/csv",
    features: ["Headers", "Custom delimiter", "Text encoding"],
    maxRows: 1000000,
  },
  json: {
    icon: Code,
    label: "JSON",
    description:
      "JavaScript Object Notation, ideal for APIs and web applications",
    extension: ".json",
    mimeType: "application/json",
    features: ["Structured data", "Nested objects", "Arrays"],
    maxRows: 500000,
  },
  excel: {
    icon: FileSpreadsheet,
    label: "Excel",
    description: "Microsoft Excel format with formatting and multiple sheets",
    extension: ".xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    features: ["Multiple sheets", "Formatting", "Formulas"],
    maxRows: 1048576,
  },
  xml: {
    icon: Database,
    label: "XML",
    description: "Extensible Markup Language for structured data exchange",
    extension: ".xml",
    mimeType: "application/xml",
    features: ["Hierarchical data", "Schema validation", "Namespaces"],
    maxRows: 100000,
  },
  yaml: {
    icon: FileText,
    label: "YAML",
    description: "Human-readable data serialization standard",
    extension: ".yaml",
    mimeType: "application/x-yaml",
    features: ["Human readable", "Comments", "Multi-document"],
    maxRows: 50000,
  },
};

export function FormatSelector({
  selectedFormat,
  options,
  onFormatChange,
  onOptionsChange,
  allowedFormats = ["csv", "json", "excel"],
  className,
}: FormatSelectorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const id = useId();

  const availableFormats = allowedFormats.filter(
    (format) => format in formatConfig,
  );
  const currentFormatConfig = formatConfig[selectedFormat];

  const updateOptions = (newOptions: Partial<ExportOptions>) => {
    onOptionsChange({ ...options, ...newOptions });
  };

  const renderFormatOption = (format: ExportFormat) => {
    const config = formatConfig[format];
    const Icon = config.icon;
    const isSelected = selectedFormat === format;

    return (
      <div
        key={format}
        role="button"
        tabIndex={0}
        className={`relative p-4 border rounded-lg cursor-pointer transition-all ${
          isSelected
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
        }`}
        onClick={() => onFormatChange(format)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onFormatChange(format);
          }
        }}
      >
        <div className="flex items-start space-x-3">
          <RadioGroupItem value={format} id={format} className="mt-1" />
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <Icon className="h-5 w-5" />
              <Label htmlFor={format} className="font-medium cursor-pointer">
                {config.label}
              </Label>
              <Badge variant="outline" className="text-xs">
                {config.extension}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {config.description}
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              {config.features.map((feature) => (
                <Badge key={feature} variant="secondary" className="text-xs">
                  {feature}
                </Badge>
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Max rows: {config.maxRows.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAdvancedOptions = () => {
    return (
      <div className="space-y-4">
        {/* Common Options */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor={`${id}-headers`} className="text-sm font-medium">
              Include Headers
            </Label>
            <Switch
              id={`${id}-headers`}
              checked={options.includeHeaders ?? true}
              onCheckedChange={(checked) =>
                updateOptions({ includeHeaders: checked })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${id}-filename`} className="text-sm font-medium">
              File Name (optional)
            </Label>
            <Input
              id={`${id}-filename`}
              placeholder={`export.${formatConfig[selectedFormat].extension.slice(1)}`}
              value={options.fileName || ""}
              onChange={(e) => updateOptions({ fileName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${id}-encoding`} className="text-sm font-medium">
              Text Encoding
            </Label>
            <Select
              value={options.encoding || "utf-8"}
              onValueChange={(value) => updateOptions({ encoding: value })}
            >
              <SelectTrigger id={`${id}-encoding`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="utf-8">UTF-8 (Recommended)</SelectItem>
                <SelectItem value="utf-16">UTF-16</SelectItem>
                <SelectItem value="ascii">ASCII</SelectItem>
                <SelectItem value="iso-8859-1">ISO-8859-1</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Format-specific options */}
        {selectedFormat === "csv" && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">CSV Options</h4>
            <div className="space-y-2">
              <Label htmlFor={`${id}-delimiter`} className="text-sm font-medium">
                Delimiter
              </Label>
              <Select
                value={options.delimiter || ","}
                onValueChange={(value) => updateOptions({ delimiter: value })}
              >
                <SelectTrigger id={`${id}-delimiter`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=",">Comma (,)</SelectItem>
                  <SelectItem value=";">Semicolon (;)</SelectItem>
                  <SelectItem value="\t">Tab</SelectItem>
                  <SelectItem value="|">Pipe (|)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {selectedFormat === "json" && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">JSON Options</h4>
            <div className="flex items-center justify-between">
              <Label htmlFor={`${id}-pretty`} className="text-sm font-medium">
                Pretty Print
              </Label>
              <Switch
                id={`${id}-pretty`}
                checked={options.prettyPrint ?? false}
                onCheckedChange={(checked) =>
                  updateOptions({ prettyPrint: checked })
                }
              />
            </div>
          </div>
        )}

        {selectedFormat === "excel" && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Excel Options</h4>
            <div className="space-y-2">
              <Label htmlFor={`${id}-sheetname`} className="text-sm font-medium">
                Sheet Name
              </Label>
              <Input
                id={`${id}-sheetname`}
                placeholder="Sheet1"
                value={options.sheetName || ""}
                onChange={(e) => updateOptions({ sheetName: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor={`${id}-autofit`} className="text-sm font-medium">
                Auto-fit Columns
              </Label>
              <Switch
                id={`${id}-autofit`}
                checked={options.autoFitColumns ?? true}
                onCheckedChange={(checked) =>
                  updateOptions({ autoFitColumns: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor={`${id}-freeze`} className="text-sm font-medium">
                Freeze Headers
              </Label>
              <Switch
                id={`${id}-freeze`}
                checked={options.freezeHeaders ?? false}
                onCheckedChange={(checked) =>
                  updateOptions({ freezeHeaders: checked })
                }
              />
            </div>
          </div>
        )}

        {/* Date Format Options */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Date Formatting</h4>
          <div className="space-y-2">
            <Label htmlFor={`${id}-dateformat`} className="text-sm font-medium">
              Date Format
            </Label>
            <Select
              value={options.dateFormat || "YYYY-MM-DD"}
              onValueChange={(value) => updateOptions({ dateFormat: value })}
            >
              <SelectTrigger id={`${id}-dateformat`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="YYYY-MM-DD">ISO Date (YYYY-MM-DD)</SelectItem>
                <SelectItem value="MM/DD/YYYY">US Format (MM/DD/YYYY)</SelectItem>
                <SelectItem value="DD/MM/YYYY">European (DD/MM/YYYY)</SelectItem>
                <SelectItem value="YYYY-MM-DD HH:mm:ss">
                  ISO DateTime (YYYY-MM-DD HH:mm:ss)
                </SelectItem>
                <SelectItem value="MM/DD/YYYY HH:mm:ss">
                  US DateTime (MM/DD/YYYY HH:mm:ss)
                </SelectItem>
                <SelectItem value="DD/MM/YYYY HH:mm:ss">
                  European DateTime (DD/MM/YYYY HH:mm:ss)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-customdate`} className="text-sm font-medium">
              Custom Date Format (optional)
            </Label>
            <Input
              id={`${id}-customdate`}
              placeholder="e.g., DD MMM YYYY"
              value={options.customDateFormat || ""}
              onChange={(e) =>
                updateOptions({ customDateFormat: e.target.value })
              }
            />
            <p className="text-xs text-gray-500">
              Use moment.js format tokens (e.g., DD MMM YYYY, YYYY-MM-DD HH:mm)
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Export Format</CardTitle>
        <CardDescription>
          Choose the format for your exported data
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <RadioGroup value={selectedFormat} onValueChange={onFormatChange}>
          <div className="grid gap-3">
            {availableFormats.map(renderFormatOption)}
          </div>
        </RadioGroup>

        {/* Format Information */}
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium text-blue-800 dark:text-blue-200">
                {currentFormatConfig.label} Format Selected
              </div>
              <div className="text-blue-700 dark:text-blue-300 mt-1">
                {currentFormatConfig.description}
              </div>
              <div className="text-blue-600 dark:text-blue-400 mt-2">
                <strong>MIME Type:</strong> {currentFormatConfig.mimeType}
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Options */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <div className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>Advanced Options</span>
              </div>
              {showAdvanced ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-4">
            {renderAdvancedOptions()}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
