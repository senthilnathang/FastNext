"use client";

import * as XLSX from "xlsx";
import type {
  ImportError,
  ImportFormat,
  ImportOptions,
  ImportPreview,
  ImportWarning,
  ParsedData,
} from "../types";

export function detectFileFormat(file: File): ImportFormat {
  const extension = file.name.toLowerCase().split(".").pop();

  switch (extension) {
    case "xlsx":
    case "xls":
      return "excel";
    case "csv":
      return "csv";
    case "json":
      return "json";
    case "xml":
      return "xml";
    default:
      // Try to detect by content type
      if (file.type.includes("spreadsheet") || file.type.includes("excel")) {
        return "excel";
      }
      if (file.type.includes("csv")) {
        return "csv";
      }
      if (file.type.includes("json")) {
        return "json";
      }
      if (file.type.includes("xml")) {
        return "xml";
      }
      return "csv"; // Default fallback
  }
}

export async function parseFile(
  file: File,
  options: Partial<ImportOptions> = {},
): Promise<ParsedData> {
  const format = options.format || detectFileFormat(file);

  switch (format) {
    case "csv":
      return await parseCSV(file, options);
    case "json":
      return await parseJSON(file, options);
    case "excel":
      return await parseExcel(file, options);
    case "xml":
      return await parseXML(file, options);
    default:
      throw new Error(`Unsupported file format: ${format}`);
  }
}

export async function parseCSV(
  file: File,
  options: Partial<ImportOptions> = {},
): Promise<ParsedData> {
  const text = await file.text();
  const delimiter = options.delimiter || detectCSVDelimiter(text);
  const hasHeaders = options.hasHeaders ?? true;
  const skipFirstRows = options.skipFirstRows || 0;
  const maxRows = options.maxRows;

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line);
  const errors: ImportError[] = [];
  const warnings: ImportWarning[] = [];

  if (lines.length === 0) {
    throw new Error("File is empty");
  }

  // Skip initial rows if specified
  const processLines = lines.slice(skipFirstRows);

  if (processLines.length === 0) {
    throw new Error("No data rows found after skipping specified rows");
  }

  // Parse headers
  const headerLine = processLines[0];
  const headers = parseCSVLine(headerLine, delimiter);

  if (headers.length === 0) {
    throw new Error("No columns detected in header row");
  }

  // Parse data rows
  const dataLines = hasHeaders ? processLines.slice(1) : processLines;
  const rows: Record<string, any>[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    if (maxRows && rows.length >= maxRows) {
      warnings.push({
        row: i + (hasHeaders ? 2 : 1) + skipFirstRows,
        message: `Maximum row limit of ${maxRows} reached. Remaining rows will be ignored.`,
      });
      break;
    }

    const line = dataLines[i];
    if (!line.trim() && options.skipEmptyRows) {
      continue;
    }

    try {
      const values = parseCSVLine(line, delimiter);
      const row: Record<string, any> = {};

      for (let j = 0; j < headers.length; j++) {
        const header = headers[j];
        const value = j < values.length ? values[j] : "";
        row[header] = parseValue(value);
      }

      rows.push(row);
    } catch (error) {
      errors.push({
        row: i + (hasHeaders ? 2 : 1) + skipFirstRows,
        message: `Failed to parse row: ${error instanceof Error ? error.message : "Unknown error"}`,
        severity: "error",
      });
    }
  }

  return {
    headers,
    rows,
    totalRows: rows.length,
    errors,
    warnings,
  };
}

export async function parseJSON(
  file: File,
  options: Partial<ImportOptions> = {},
): Promise<ParsedData> {
  const text = await file.text();
  const maxRows = options.maxRows;
  const errors: ImportError[] = [];
  const warnings: ImportWarning[] = [];

  try {
    const jsonData = JSON.parse(text);
    let dataArray: any[];

    if (Array.isArray(jsonData)) {
      dataArray = jsonData;
    } else if (typeof jsonData === "object" && jsonData !== null) {
      // Try to find an array property in the object
      const arrayProperty = Object.values(jsonData).find((value) =>
        Array.isArray(value),
      );
      if (arrayProperty) {
        dataArray = arrayProperty as any[];
        warnings.push({
          row: 0,
          message:
            "JSON object detected. Using first array property found for import.",
        });
      } else {
        // Treat single object as array with one item
        dataArray = [jsonData];
      }
    } else {
      throw new Error(
        "JSON data must be an array or object containing an array",
      );
    }

    if (dataArray.length === 0) {
      throw new Error("No data found in JSON file");
    }

    // Extract headers from first object
    const firstItem = dataArray[0];
    if (typeof firstItem !== "object" || firstItem === null) {
      throw new Error("JSON array items must be objects");
    }

    const headers = Object.keys(firstItem);
    const rows: Record<string, any>[] = [];

    for (let i = 0; i < dataArray.length; i++) {
      if (maxRows && rows.length >= maxRows) {
        warnings.push({
          row: i + 1,
          message: `Maximum row limit of ${maxRows} reached. Remaining rows will be ignored.`,
        });
        break;
      }

      const item = dataArray[i];

      if (typeof item !== "object" || item === null) {
        errors.push({
          row: i + 1,
          message: "Row is not an object",
          severity: "error",
          value: item,
        });
        continue;
      }

      // Ensure all headers are present
      const row: Record<string, any> = {};
      headers.forEach((header) => {
        row[header] = item[header] !== undefined ? item[header] : null;
      });

      rows.push(row);
    }

    return {
      headers,
      rows,
      totalRows: rows.length,
      errors,
      warnings,
    };
  } catch (error) {
    throw new Error(
      `Failed to parse JSON: ${error instanceof Error ? error.message : "Invalid JSON"}`,
    );
  }
}

export async function parseExcel(
  file: File,
  options: Partial<ImportOptions> = {},
): Promise<ParsedData> {
  const arrayBuffer = await file.arrayBuffer();
  const hasHeaders = options.hasHeaders ?? true;
  const skipFirstRows = options.skipFirstRows || 0;
  const maxRows = options.maxRows;
  const errors: ImportError[] = [];
  const warnings: ImportWarning[] = [];

  try {
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    if (workbook.SheetNames.length === 0) {
      throw new Error("No worksheets found in Excel file");
    }

    // Use first sheet by default
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    if (workbook.SheetNames.length > 1) {
      warnings.push({
        row: 0,
        message: `Multiple sheets detected. Using first sheet: "${sheetName}"`,
      });
    }

    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: "",
      raw: false,
    }) as any[][];

    if (jsonData.length === 0) {
      throw new Error("No data found in Excel sheet");
    }

    // Skip initial rows if specified
    const processRows = jsonData.slice(skipFirstRows);

    if (processRows.length === 0) {
      throw new Error("No data rows found after skipping specified rows");
    }

    // Extract headers
    const headerRow = processRows[0];
    const headers = headerRow.map((cell: any, index: number) =>
      cell ? String(cell).trim() : `Column_${index + 1}`,
    );

    // Process data rows
    const dataRows = hasHeaders ? processRows.slice(1) : processRows;
    const rows: Record<string, any>[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      if (maxRows && rows.length >= maxRows) {
        warnings.push({
          row: i + (hasHeaders ? 2 : 1) + skipFirstRows,
          message: `Maximum row limit of ${maxRows} reached. Remaining rows will be ignored.`,
        });
        break;
      }

      const rowData = dataRows[i];

      // Skip empty rows if option is set
      if (
        options.skipEmptyRows &&
        (!rowData || rowData.every((cell: any) => !cell))
      ) {
        continue;
      }

      const row: Record<string, any> = {};

      headers.forEach((header, j) => {
        const value = j < rowData.length ? rowData[j] : "";
        row[header] = parseValue(value);
      });

      rows.push(row);
    }

    return {
      headers,
      rows,
      totalRows: rows.length,
      errors,
      warnings,
    };
  } catch (error) {
    throw new Error(
      `Failed to parse Excel file: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function parseXML(
  file: File,
  options: Partial<ImportOptions> = {},
): Promise<ParsedData> {
  const text = await file.text();
  const maxRows = options.maxRows;
  const errors: ImportError[] = [];
  const warnings: ImportWarning[] = [];

  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "text/xml");

    // Check for parsing errors
    const parseError = xmlDoc.querySelector("parsererror");
    if (parseError) {
      throw new Error("Invalid XML format");
    }

    // Find the root element and detect repeating elements
    const rootElement = xmlDoc.documentElement;
    const childElements = Array.from(rootElement.children);

    if (childElements.length === 0) {
      throw new Error("No data elements found in XML");
    }

    // Assume all direct children are data items
    const dataElements = childElements;
    const headers = new Set<string>();

    // Extract all possible field names from all elements
    dataElements.forEach((element) => {
      Array.from(element.children).forEach((child) => {
        headers.add(child.tagName);
      });

      // Also check for attributes
      Array.from(element.attributes).forEach((attr) => {
        headers.add(`@${attr.name}`);
      });
    });

    const headerArray = Array.from(headers);
    const rows: Record<string, any>[] = [];

    for (let i = 0; i < dataElements.length; i++) {
      if (maxRows && rows.length >= maxRows) {
        warnings.push({
          row: i + 1,
          message: `Maximum row limit of ${maxRows} reached. Remaining rows will be ignored.`,
        });
        break;
      }

      const element = dataElements[i];
      const row: Record<string, any> = {};

      // Extract child element values
      Array.from(element.children).forEach((child) => {
        row[child.tagName] = parseValue(child.textContent || "");
      });

      // Extract attribute values
      Array.from(element.attributes).forEach((attr) => {
        row[`@${attr.name}`] = parseValue(attr.value);
      });

      // Ensure all headers are present
      headerArray.forEach((header) => {
        if (!(header in row)) {
          row[header] = null;
        }
      });

      rows.push(row);
    }

    return {
      headers: headerArray,
      rows,
      totalRows: rows.length,
      errors,
      warnings,
    };
  } catch (error) {
    throw new Error(
      `Failed to parse XML: ${error instanceof Error ? error.message : "Invalid XML"}`,
    );
  }
}

// Helper functions
function detectCSVDelimiter(text: string): string {
  const delimiters = [",", ";", "\t", "|"];
  const firstLine = text.split("\n")[0];

  if (!firstLine) return ",";

  let maxCount = 0;
  let detectedDelimiter = ",";

  delimiters.forEach((delimiter) => {
    const count = (firstLine.match(new RegExp(`\\${delimiter}`, "g")) || [])
      .length;
    if (count > maxCount) {
      maxCount = count;
      detectedDelimiter = delimiter;
    }
  });

  return detectedDelimiter;
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current.trim());

  return result;
}

function parseValue(value: any): any {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const stringValue = String(value).trim();

  if (stringValue === "") {
    return null;
  }

  // Try to parse as number
  if (/^-?\d+(\.\d+)?$/.test(stringValue)) {
    const num = Number(stringValue);
    if (!Number.isNaN(num)) {
      return num;
    }
  }

  // Try to parse as boolean
  const lowerValue = stringValue.toLowerCase();
  if (lowerValue === "true" || lowerValue === "yes" || lowerValue === "1") {
    return true;
  }
  if (lowerValue === "false" || lowerValue === "no" || lowerValue === "0") {
    return false;
  }

  // Try to parse as date
  if (
    /^\d{4}-\d{2}-\d{2}/.test(stringValue) ||
    /^\d{1,2}\/\d{1,2}\/\d{4}/.test(stringValue)
  ) {
    const date = new Date(stringValue);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return stringValue;
}

export function createPreview(
  file: File,
  parsedData: ParsedData,
): ImportPreview {
  const sampleSize = 5;
  const sampleData = parsedData.rows.slice(0, sampleSize);

  // Generate suggested mappings (this would be more sophisticated in practice)
  const suggestedMappings = parsedData.headers.map((header) => ({
    sourceColumn: header,
    targetColumn: header.toLowerCase().replace(/\s+/g, "_"),
    skipEmpty: true,
  }));

  // Create column definitions based on detected data types
  const columns = parsedData.headers.map((header) => ({
    key: header,
    label: header,
    type: detectColumnType(parsedData.rows, header),
    required: false,
  }));

  return {
    headers: parsedData.headers,
    sampleData,
    totalRows: parsedData.totalRows,
    detectedFormat: detectFileFormat(file),
    suggestedMappings,
    columns,
  };
}

function detectColumnType(
  rows: Record<string, any>[],
  columnName: string,
): "string" | "number" | "date" | "boolean" | "email" | "url" {
  const sampleValues = rows
    .slice(0, 10)
    .map((row) => row[columnName])
    .filter((value) => value !== null && value !== undefined && value !== "");

  if (sampleValues.length === 0) {
    return "string";
  }

  // Check for email
  if (
    sampleValues.some((value) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value)),
    )
  ) {
    return "email";
  }

  // Check for URL
  if (sampleValues.some((value) => /^https?:\/\//.test(String(value)))) {
    return "url";
  }

  // Check for date
  if (sampleValues.some((value) => !Number.isNaN(new Date(value).getTime()))) {
    return "date";
  }

  // Check for boolean
  if (
    sampleValues.every((value) => {
      const str = String(value).toLowerCase();
      return ["true", "false", "yes", "no", "1", "0"].includes(str);
    })
  ) {
    return "boolean";
  }

  // Check for number
  if (sampleValues.every((value) => !Number.isNaN(Number(value)))) {
    return "number";
  }

  return "string";
}
