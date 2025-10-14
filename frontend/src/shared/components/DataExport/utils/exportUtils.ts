"use client";

import * as XLSX from "xlsx";
import type { ExportColumn, ExportOptions } from "../types";

export function formatValue(value: any, column: ExportColumn): string {
  if (value === null || value === undefined) return "";

  switch (column.type) {
    case "boolean":
      return value ? "Yes" : "No";
    case "date":
      if (value instanceof Date) {
        return value.toLocaleDateString();
      }
      if (typeof value === "string") {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
      }
      return String(value);
    case "number":
      return typeof value === "number" ? value.toString() : String(value);
    case "object":
      return typeof value === "object" ? JSON.stringify(value) : String(value);
    default:
      return String(value);
  }
}

export function formatDateValue(value: any, format?: string): string {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  switch (format) {
    case "iso":
      return date.toISOString();
    case "us":
      return date.toLocaleDateString("en-US");
    case "eu":
      return date.toLocaleDateString("en-GB");
    case "timestamp":
      return Math.floor(date.getTime() / 1000).toString();
    case "custom":
      // This would require a date formatting library like date-fns
      return date.toISOString();
    default:
      return date.toLocaleDateString();
  }
}

export function prepareDataForExport(
  data: Record<string, any>[],
  columns: ExportColumn[],
  selectedColumns: string[],
  options: ExportOptions,
): any[][] {
  const exportColumns = columns.filter((col) =>
    selectedColumns.includes(col.key),
  );
  const rows: any[][] = [];

  // Add headers if requested
  if (options.includeHeaders) {
    rows.push(exportColumns.map((col) => col.label));
  }

  // Add data rows
  data.forEach((row) => {
    const exportRow = exportColumns.map((col) => {
      const value = row[col.key];

      if (col.type === "date" && options.dateFormat) {
        return formatDateValue(value, options.dateFormat);
      }

      return formatValue(value, col);
    });
    rows.push(exportRow);
  });

  return rows;
}

export function exportToCSV(
  data: Record<string, any>[],
  columns: ExportColumn[],
  selectedColumns: string[],
  options: ExportOptions,
): void {
  const rows = prepareDataForExport(data, columns, selectedColumns, options);
  const delimiter = options.delimiter || ",";

  const csvContent = rows
    .map((row) =>
      row
        .map((field) => {
          const stringField = String(field);
          // Escape delimiter and quotes
          if (
            stringField.includes(delimiter) ||
            stringField.includes('"') ||
            stringField.includes("\n")
          ) {
            return `"${stringField.replace(/"/g, '""')}"`;
          }
          return stringField;
        })
        .join(delimiter),
    )
    .join("\n");

  downloadFile(
    csvContent,
    options.fileName || "export.csv",
    "text/csv;charset=utf-8;",
  );
}

export function exportToJSON(
  data: Record<string, any>[],
  columns: ExportColumn[],
  selectedColumns: string[],
  options: ExportOptions,
): void {
  const exportColumns = columns.filter((col) =>
    selectedColumns.includes(col.key),
  );

  const jsonData = data.map((row) => {
    const exportRow: Record<string, any> = {};
    exportColumns.forEach((col) => {
      const value = row[col.key];

      if (col.type === "date" && options.dateFormat) {
        exportRow[col.label] = formatDateValue(value, options.dateFormat);
      } else {
        exportRow[col.label] = value;
      }
    });
    return exportRow;
  });

  const jsonContent = JSON.stringify(
    jsonData,
    null,
    options.prettyPrint ? 2 : 0,
  );
  downloadFile(
    jsonContent,
    options.fileName || "export.json",
    "application/json",
  );
}

export function exportToExcel(
  data: Record<string, any>[],
  columns: ExportColumn[],
  selectedColumns: string[],
  options: ExportOptions,
): void {
  const rows = prepareDataForExport(data, columns, selectedColumns, options);

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // Auto-fit columns if requested
  if (options.autoFitColumns) {
    const columnWidths = rows[0]?.map((_, colIndex) => {
      const maxLength = Math.max(
        ...rows.map((row) => String(row[colIndex] || "").length),
      );
      return { wch: Math.min(maxLength + 2, 50) }; // Max width of 50 characters
    });

    if (columnWidths) {
      worksheet["!cols"] = columnWidths;
    }
  }

  // Freeze header row if requested
  if (options.freezeHeaders && options.includeHeaders) {
    worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };
  }

  // Add worksheet to workbook
  const sheetName = options.sheetName || "Data";
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Write and download file
  const fileName = options.fileName || "export.xlsx";
  XLSX.writeFile(workbook, fileName);
}

export function exportToXML(
  data: Record<string, any>[],
  columns: ExportColumn[],
  selectedColumns: string[],
  options: ExportOptions,
): void {
  const exportColumns = columns.filter((col) =>
    selectedColumns.includes(col.key),
  );

  let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xmlContent += "<data>\n";

  data.forEach((row, index) => {
    xmlContent += `  <item id="${index + 1}">\n`;
    exportColumns.forEach((col) => {
      const value = row[col.key];
      const formattedValue =
        col.type === "date" && options.dateFormat
          ? formatDateValue(value, options.dateFormat)
          : formatValue(value, col);

      // Escape XML special characters
      const escapedValue = String(formattedValue)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

      xmlContent += `    <${col.key}>${escapedValue}</${col.key}>\n`;
    });
    xmlContent += "  </item>\n";
  });

  xmlContent += "</data>";

  downloadFile(xmlContent, options.fileName || "export.xml", "application/xml");
}

export function exportToYAML(
  data: Record<string, any>[],
  columns: ExportColumn[],
  selectedColumns: string[],
  options: ExportOptions,
): void {
  const exportColumns = columns.filter((col) =>
    selectedColumns.includes(col.key),
  );

  const yamlData = data.map((row) => {
    const exportRow: Record<string, any> = {};
    exportColumns.forEach((col) => {
      const value = row[col.key];
      exportRow[col.key] =
        col.type === "date" && options.dateFormat
          ? formatDateValue(value, options.dateFormat)
          : value;
    });
    return exportRow;
  });

  // Simple YAML serialization (for more complex needs, use a proper YAML library)
  let yamlContent = "# Data Export\n";
  yamlContent += "data:\n";

  yamlData.forEach((item, index) => {
    yamlContent += `  - # Item ${index + 1}\n`;
    Object.entries(item).forEach(([key, value]) => {
      const yamlValue =
        typeof value === "string"
          ? `"${value.replace(/"/g, '\\"')}"`
          : String(value);
      yamlContent += `    ${key}: ${yamlValue}\n`;
    });
  });

  downloadFile(
    yamlContent,
    options.fileName || "export.yaml",
    "application/x-yaml",
  );
}

function downloadFile(
  content: string,
  fileName: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement("a");

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export function estimateFileSize(
  data: Record<string, any>[],
  columns: ExportColumn[],
  selectedColumns: string[],
  format: "csv" | "json" | "excel" | "xml" | "yaml",
): number {
  if (data.length === 0) return 0;

  const exportColumns = columns.filter((col) =>
    selectedColumns.includes(col.key),
  );
  const sampleSize = Math.min(100, data.length);
  const sampleData = data.slice(0, sampleSize);

  let sampleContent: string;

  switch (format) {
    case "csv":
      sampleContent = sampleData
        .map((row) =>
          exportColumns.map((col) => String(row[col.key] || "")).join(","),
        )
        .join("\n");
      break;
    case "json": {
      const jsonSample = sampleData.map((row) => {
        const exportRow: Record<string, any> = {};
        exportColumns.forEach((col) => {
          exportRow[col.label] = row[col.key];
        });
        return exportRow;
      });
      sampleContent = JSON.stringify(jsonSample, null, 2);
      break;
    }
    case "xml":
      sampleContent = sampleData
        .map((row) =>
          exportColumns
            .map(
              (col) => `<${col.key}>${String(row[col.key] || "")}</${col.key}>`,
            )
            .join(""),
        )
        .join("");
      break;
    case "yaml":
      sampleContent = sampleData
        .map((row) =>
          exportColumns
            .map((col) => `${col.key}: ${String(row[col.key] || "")}`)
            .join("\n"),
        )
        .join("\n");
      break;
    default:
      sampleContent = JSON.stringify(sampleData);
  }

  const avgBytesPerRow = new Blob([sampleContent]).size / sampleSize;
  return Math.round(avgBytesPerRow * data.length);
}
