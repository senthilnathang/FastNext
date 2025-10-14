"use client";

import {
  AlertTriangle,
  CheckCircle,
  Code,
  Database,
  File,
  FileSpreadsheet,
  FileText,
  Upload,
  X,
} from "lucide-react";
import type React from "react";
import { useCallback, useState } from "react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import type { ImportFormat } from "../types";
import { detectFileFormat } from "../utils/parseUtils";

interface FileUploadProps {
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  maxFileSize?: number;
  allowedFormats?: ImportFormat[];
  disabled?: boolean;
  className?: string;
}

const formatConfig = {
  csv: {
    icon: FileText,
    label: "CSV",
    extensions: [".csv"],
    mimeTypes: ["text/csv", "application/csv"],
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  },
  json: {
    icon: Code,
    label: "JSON",
    extensions: [".json"],
    mimeTypes: ["application/json"],
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
  excel: {
    icon: FileSpreadsheet,
    label: "Excel",
    extensions: [".xlsx", ".xls"],
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ],
    color:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
  },
  xml: {
    icon: Database,
    label: "XML",
    extensions: [".xml"],
    mimeTypes: ["application/xml", "text/xml"],
    color:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  },
};

export function FileUpload({
  selectedFile,
  onFileSelect,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  allowedFormats = ["csv", "json", "excel", "xml"],
  disabled = false,
  className,
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file size
      if (file.size > maxFileSize) {
        return `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds maximum allowed size (${(maxFileSize / 1024 / 1024).toFixed(1)}MB)`;
      }

      // Check file format
      const extension = file.name.toLowerCase().split(".").pop();
      const isValidFormat = allowedFormats.some((format) =>
        formatConfig[format].extensions.includes(`.${extension}`),
      );

      if (!isValidFormat) {
        const allowedExts = allowedFormats
          .flatMap((format) => formatConfig[format].extensions)
          .join(", ");
        return `File format .${extension} is not supported. Allowed formats: ${allowedExts}`;
      }

      return null;
    },
    [maxFileSize, allowedFormats],
  );

  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const file = files[0];
      const error = validateFile(file);

      if (error) {
        setUploadError(error);
        return;
      }

      setUploadError(null);
      onFileSelect(file);
    },
    [validateFile, onFileSelect],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) {
        setDragActive(true);
      }
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);

      if (disabled) return;

      handleFileSelect(e.dataTransfer.files);
    },
    [disabled, handleFileSelect],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFileSelect(e.target.files);
    },
    [handleFileSelect],
  );

  const handleRemoveFile = useCallback(() => {
    onFileSelect(null);
    setUploadError(null);
  }, [onFileSelect]);

  const formatFileSize = (bytes: number) => {
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getFileIcon = (file: File) => {
    const format = detectFileFormat(file);
    const config = formatConfig[format];
    const Icon = config?.icon || File;
    return <Icon className="h-8 w-8" />;
  };

  const getFormatBadge = (file: File) => {
    const format = detectFileFormat(file);
    const config = formatConfig[format];

    if (!config) return null;

    return (
      <Badge variant="secondary" className={`text-xs ${config.color}`}>
        {config.label}
      </Badge>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">File Upload</CardTitle>
        <CardDescription>
          Upload your data file to begin the import process
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* File Upload Area */}
        {!selectedFile ? (
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                : uploadError
                  ? "border-red-300 bg-red-50 dark:bg-red-950"
                  : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() =>
              !disabled && document.getElementById("file-input")?.click()
            }
          >
            <input
              id="file-input"
              type="file"
              className="hidden"
              accept={allowedFormats
                .flatMap((format) => formatConfig[format].extensions)
                .join(",")}
              onChange={handleInputChange}
              disabled={disabled}
            />

            <div className="space-y-4">
              <Upload
                className={`h-12 w-12 mx-auto ${
                  uploadError ? "text-red-500" : "text-gray-400"
                }`}
              />

              <div>
                <p className="text-lg font-medium">
                  {dragActive
                    ? "Drop your file here"
                    : "Choose a file or drag it here"}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Maximum file size: {formatFileSize(maxFileSize)}
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                disabled={disabled}
                className="mt-4"
              >
                <Upload className="h-4 w-4 mr-2" />
                Browse Files
              </Button>
            </div>
          </div>
        ) : (
          /* Selected File Display */
          <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center space-x-3">
              {getFileIcon(selectedFile)}
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{selectedFile.name}</span>
                  {getFormatBadge(selectedFile)}
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <span>{formatFileSize(selectedFile.size)}</span>
                  <span>•</span>
                  <span>
                    Last modified:{" "}
                    {new Date(selectedFile.lastModified).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveFile}
                disabled={disabled}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {uploadError && (
          <div className="flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-700 dark:text-red-300">
              <div className="font-medium">Upload Error</div>
              <div className="mt-1">{uploadError}</div>
            </div>
          </div>
        )}

        {/* Supported Formats */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Supported Formats</Label>
          <div className="flex flex-wrap gap-2">
            {allowedFormats.map((format) => {
              const config = formatConfig[format];
              const Icon = config.icon;

              return (
                <div
                  key={format}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm"
                >
                  <Icon className="h-4 w-4" />
                  <span>{config.label}</span>
                  <Badge variant="outline" className="text-xs">
                    {config.extensions.join(", ")}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>

        {/* File Guidelines */}
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <div className="font-medium">File Guidelines:</div>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              Files should contain structured data with consistent columns
            </li>
            <li>First row should contain column headers (recommended)</li>
            <li>Avoid merged cells in Excel files</li>
            <li>
              CSV files should use proper delimiters (comma, semicolon, or tab)
            </li>
            <li>JSON files should contain an array of objects</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
