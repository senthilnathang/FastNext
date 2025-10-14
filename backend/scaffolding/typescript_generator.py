"""
TypeScript Integration for Backend Scaffolding Generator

Generates TypeScript definitions for:
- API client types
- Response/Request interfaces
- Frontend form validation schemas
- tRPC router integration
"""

from pathlib import Path
from typing import Dict, List, Optional

from .backend_generator import FieldDefinition, FieldType, ModelDefinition


class TypeScriptGenerator:
    """Generate TypeScript definitions for frontend integration"""

    def __init__(
        self, model_def: ModelDefinition, output_path: str = "../frontend/src/types"
    ):
        self.model_def = model_def
        self.output_path = Path(output_path)
        self.model_name = model_def.name
        self.snake_name = model_def.name.lower()

    def generate_all_types(self):
        """Generate all TypeScript type definitions"""
        print(f"🔧 Generating TypeScript definitions for {self.model_name}...")

        # Create output directory if it doesn't exist
        self.output_path.mkdir(parents=True, exist_ok=True)

        # Generate type definitions
        self.generate_model_types()
        self.generate_api_client_types()
        self.generate_form_types()
        self.generate_trpc_types()

        print(f"✅ TypeScript definitions generated for {self.model_name}")

    def generate_model_types(self):
        """Generate model interface definitions"""
        content = f"""// Auto-generated TypeScript types for {self.model_name}
// Generated on: {self._get_timestamp()}

export interface {self.model_name} {{
"""

        # Add base fields
        content += "  id: number;\n"
        content += "  createdAt: string;\n"
        content += "  updatedAt: string;\n"

        # Add custom fields
        for field in self.model_def.fields:
            ts_type = self._get_typescript_type(field)
            optional = "?" if not field.required or field.nullable else ""
            content += f"  {self._to_camel_case(field.name)}{optional}: {ts_type};\n"

        content += "}\n\n"

        # Generate create/update types
        content += f"export interface Create{self.model_name}Request {{\n"
        for field in self.model_def.fields:
            if field.name in ["id", "created_at", "updated_at"]:
                continue
            ts_type = self._get_typescript_type(field)
            optional = "?" if not field.required else ""
            content += f"  {self._to_camel_case(field.name)}{optional}: {ts_type};\n"
        content += "}\n\n"

        content += f"export interface Update{self.model_name}Request {{\n"
        for field in self.model_def.fields:
            if field.name in ["id", "created_at", "updated_at"]:
                continue
            ts_type = self._get_typescript_type(field)
            content += f"  {self._to_camel_case(field.name)}?: {ts_type};\n"
        content += "}\n\n"

        # Generate list response type
        content += f"""export interface {self.model_name}ListResponse {{
  items: {self.model_name}[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}}

export interface {self.model_name}Response {{
  data: {self.model_name};
  message?: string;
}}

export interface {self.model_name}ListApiResponse {{
  data: {self.model_name}ListResponse;
  message?: string;
}}
"""

        # Write to file
        type_file = self.output_path / f"{self.snake_name}.ts"
        type_file.write_text(content)

    def generate_api_client_types(self):
        """Generate API client function signatures"""
        content = f"""// Auto-generated API client types for {self.model_name}
import {{ {self.model_name}, Create{self.model_name}Request, Update{self.model_name}Request, {self.model_name}ListResponse }} from './{self.snake_name}';

export interface {self.model_name}ApiClient {{
  // CRUD operations
  getAll(params?: {{
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: keyof {self.model_name};
    sortOrder?: 'asc' | 'desc';
  }}): Promise<{self.model_name}ListResponse>;

  getById(id: number): Promise<{self.model_name}>;

  create(data: Create{self.model_name}Request): Promise<{self.model_name}>;

  update(id: number, data: Update{self.model_name}Request): Promise<{self.model_name}>;

  delete(id: number): Promise<void>;

  // Bulk operations
  bulkCreate(data: Create{self.model_name}Request[]): Promise<{self.model_name}[]>;

  bulkUpdate(updates: {{ id: number; data: Update{self.model_name}Request }}[]): Promise<{self.model_name}[]>;

  bulkDelete(ids: number[]): Promise<void>;
}}

// Query parameters for filtering
export interface {self.model_name}QueryParams {{
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
"""

        # Add filter parameters for each field
        for field in self.model_def.fields:
            if field.type in [FieldType.STRING, FieldType.EMAIL]:
                content += f"  {self._to_camel_case(field.name)}Contains?: string;\n"
            elif field.type in [FieldType.INTEGER, FieldType.FLOAT]:
                content += f"  {self._to_camel_case(field.name)}Min?: number;\n"
                content += f"  {self._to_camel_case(field.name)}Max?: number;\n"
            elif field.type == FieldType.BOOLEAN:
                content += f"  {self._to_camel_case(field.name)}?: boolean;\n"
            elif field.type in [FieldType.DATE, FieldType.DATETIME]:
                content += f"  {self._to_camel_case(field.name)}From?: string;\n"
                content += f"  {self._to_camel_case(field.name)}To?: string;\n"

        content += "}\n"

        # Write to file
        api_file = self.output_path / f"{self.snake_name}-api.ts"
        api_file.write_text(content)

    def generate_form_types(self):
        """Generate form validation types for React Hook Form"""
        content = f"""// Auto-generated form types for {self.model_name}
import {{ z }} from 'zod';

// Zod validation schemas
export const create{self.model_name}Schema = z.object({{
"""

        # Add validation for each field
        for field in self.model_def.fields:
            if field.name in ["id", "created_at", "updated_at"]:
                continue

            validation = self._get_zod_validation(field)
            content += f"  {self._to_camel_case(field.name)}: {validation},\n"

        content += "});\n\n"

        content += f"export const update{self.model_name}Schema = create{self.model_name}Schema.partial();\n\n"

        # Generate form types
        content += f"export type Create{self.model_name}Form = z.infer<typeof create{self.model_name}Schema>;\n"
        content += f"export type Update{self.model_name}Form = z.infer<typeof update{self.model_name}Schema>;\n\n"

        # Generate form field configurations
        content += f"""// Form field configurations for UI generation
export const {self.snake_name}FormFields = {{
"""

        for field in self.model_def.fields:
            if field.name in ["id", "created_at", "updated_at"]:
                continue

            field_config = self._get_form_field_config(field)
            content += f"  {self._to_camel_case(field.name)}: {field_config},\n"

        content += "};\n"

        # Write to file
        form_file = self.output_path / f"{self.snake_name}-forms.ts"
        form_file.write_text(content)

    def generate_trpc_types(self):
        """Generate tRPC router integration types"""
        content = f"""// Auto-generated tRPC types for {self.model_name}
import {{ {self.model_name}, Create{self.model_name}Request, Update{self.model_name}Request, {self.model_name}QueryParams }} from './{self.snake_name}';

// tRPC router input/output types
export interface {self.model_name}Router {{
  getAll: {{
    input: {self.model_name}QueryParams;
    output: {self.model_name}ListResponse;
  }};

  getById: {{
    input: {{ id: number }};
    output: {self.model_name};
  }};

  create: {{
    input: Create{self.model_name}Request;
    output: {self.model_name};
  }};

  update: {{
    input: {{ id: number; data: Update{self.model_name}Request }};
    output: {self.model_name};
  }};

  delete: {{
    input: {{ id: number }};
    output: void;
  }};
}}

// React Query keys for cache management
export const {self.snake_name}QueryKeys = {{
  all: ['{self.snake_name}s'] as const,
  lists: () => [...{self.snake_name}QueryKeys.all, 'list'] as const,
  list: (filters: {self.model_name}QueryParams) => [...{self.snake_name}QueryKeys.lists(), filters] as const,
  details: () => [...{self.snake_name}QueryKeys.all, 'detail'] as const,
  detail: (id: number) => [...{self.snake_name}QueryKeys.details(), id] as const,
}};
"""

        # Write to file
        trpc_file = self.output_path / f"{self.snake_name}-trpc.ts"
        trpc_file.write_text(content)

    def _get_typescript_type(self, field: FieldDefinition) -> str:
        """Convert Python field type to TypeScript type"""
        type_mapping = {
            FieldType.STRING: "string",
            FieldType.INTEGER: "number",
            FieldType.FLOAT: "number",
            FieldType.BOOLEAN: "boolean",
            FieldType.DATE: "string",  # ISO date string
            FieldType.DATETIME: "string",  # ISO datetime string
            FieldType.TEXT: "string",
            FieldType.EMAIL: "string",
            FieldType.URL: "string",
            FieldType.JSON: "Record<string, any>",
            FieldType.ENUM: (
                f"'{field.enum_values[0]}'"
                + "".join(f" | '{val}'" for val in field.enum_values[1:])
                if field.enum_values
                else "string"
            ),
            FieldType.FOREIGN_KEY: "number",
        }
        return type_mapping.get(field.type, "any")

    def _get_zod_validation(self, field: FieldDefinition) -> str:
        """Generate Zod validation schema for field"""
        base_validations = {
            FieldType.STRING: "z.string()",
            FieldType.INTEGER: "z.number().int()",
            FieldType.FLOAT: "z.number()",
            FieldType.BOOLEAN: "z.boolean()",
            FieldType.DATE: "z.string().date()",
            FieldType.DATETIME: "z.string().datetime()",
            FieldType.TEXT: "z.string()",
            FieldType.EMAIL: "z.string().email()",
            FieldType.URL: "z.string().url()",
            FieldType.JSON: "z.record(z.any())",
            FieldType.FOREIGN_KEY: "z.number().int().positive()",
        }

        validation = base_validations.get(field.type, "z.any()")

        # Add enum validation
        if field.type == FieldType.ENUM and field.enum_values:
            enum_values = "', '".join(field.enum_values)
            validation = f"z.enum(['{enum_values}'])"

        # Add string length validation
        if field.type in [
            FieldType.STRING,
            FieldType.TEXT,
            FieldType.EMAIL,
            FieldType.URL,
        ]:
            if field.max_length:
                validation += f".max({field.max_length})"
            if field.validation and field.validation.min_length:
                validation += f".min({field.validation.min_length})"

        # Add number range validation
        if field.type in [FieldType.INTEGER, FieldType.FLOAT]:
            if field.validation:
                if field.validation.min_value is not None:
                    validation += f".min({field.validation.min_value})"
                if field.validation.max_value is not None:
                    validation += f".max({field.validation.max_value})"

        # Handle optional/nullable fields
        if not field.required:
            validation += ".optional()"
        elif field.nullable:
            validation += ".nullable()"

        return validation

    def _get_form_field_config(self, field: FieldDefinition) -> str:
        """Generate form field configuration object"""
        config = {
            "type": self._get_form_field_type(field),
            "label": field.name.replace("_", " ").title(),
            "required": field.required,
            "placeholder": f"Enter {field.name.replace('_', ' ')}",
        }

        if field.description:
            config["description"] = field.description

        if field.type == FieldType.ENUM and field.enum_values:
            config["options"] = field.enum_values

        if field.max_length:
            config["maxLength"] = field.max_length

        return str(config).replace("'", '"')

    def _get_form_field_type(self, field: FieldDefinition) -> str:
        """Get form field type for UI generation"""
        field_type_mapping = {
            FieldType.STRING: "text",
            FieldType.INTEGER: "number",
            FieldType.FLOAT: "number",
            FieldType.BOOLEAN: "checkbox",
            FieldType.DATE: "date",
            FieldType.DATETIME: "datetime-local",
            FieldType.TEXT: "textarea",
            FieldType.EMAIL: "email",
            FieldType.URL: "url",
            FieldType.JSON: "textarea",
            FieldType.ENUM: "select",
            FieldType.FOREIGN_KEY: "select",
        }
        return field_type_mapping.get(field.type, "text")

    def _to_camel_case(self, snake_str: str) -> str:
        """Convert snake_case to camelCase"""
        components = snake_str.split("_")
        return components[0] + "".join(x.capitalize() for x in components[1:])

    def _get_timestamp(self) -> str:
        """Get current timestamp for file header"""
        from datetime import datetime

        return datetime.now().isoformat()
