#!/usr/bin/env python3
"""
FastNext Scaffolding CLI Tool

A unified command-line interface for generating both frontend (TypeScript/React)
and backend (Python/FastAPI) scaffolding for the FastNext framework.

Usage:
    python scaffold-cli.py generate --name Product --type both
    python scaffold-cli.py generate --name BlogPost --type frontend
    python scaffold-cli.py generate --name Category --type backend --config config.json
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Import backend scaffolding
sys.path.append(str(Path(__file__).parent / "backend"))
from scaffolding.backend_generator import BackendScaffoldGenerator
from scaffolding.backend_generator import FieldDefinition as BackendFieldDefinition
from scaffolding.backend_generator import FieldType
from scaffolding.backend_generator import ModelDefinition as BackendModelDefinition
from scaffolding.backend_generator import ModelMixin, RelationshipConfig, ValidationRule


# Frontend scaffolding placeholder (TypeScript-based, not Python)
# TODO: Implement Python wrapper for TypeScript frontend scaffolding
class FrontendScaffoldGenerator:
    def __init__(self, model, output_path):
        self.model = model
        self.output_path = output_path

    def generateAll(self):
        print("⚠️  Frontend scaffolding requires TypeScript. Please use:")
        print(f"   cd frontend && npm run scaffold -- --model {self.model.name}")


class FrontendModelDefinition:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)


class FrontendFieldDefinition:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)


class UnifiedScaffoldCLI:
    """Unified CLI for both frontend and backend scaffolding"""

    def __init__(self):
        self.base_path = Path(__file__).parent
        self.frontend_path = self.base_path / "frontend"
        self.backend_path = self.base_path / "backend"

    def create_parser(self) -> argparse.ArgumentParser:
        """Create the argument parser"""
        parser = argparse.ArgumentParser(
            description="FastNext Scaffolding CLI - Generate complete CRUD interfaces",
            formatter_class=argparse.RawDescriptionHelpFormatter,
            epilog="""
Examples:
  # Generate both frontend and backend for a Product model
  python scaffold-cli.py generate --name Product --type both

  # Generate only frontend components
  python scaffold-cli.py generate --name BlogPost --type frontend

  # Generate from configuration file
  python scaffold-cli.py generate --config frontend/config/product-config.json

  # List available field types
  python scaffold-cli.py field-types

  # Create example configuration
  python scaffold-cli.py example-config --name Product
            """,
        )

        subparsers = parser.add_subparsers(dest="command", help="Available commands")

        # Generate command
        gen_parser = subparsers.add_parser("generate", help="Generate scaffolding")
        gen_parser.add_argument(
            "--name", type=str, help="Model name (e.g., Product, BlogPost)"
        )
        gen_parser.add_argument(
            "--type",
            choices=["frontend", "backend", "both"],
            default="both",
            help="What to generate",
        )
        gen_parser.add_argument("--config", type=str, help="JSON config file path")
        gen_parser.add_argument(
            "--output-frontend",
            type=str,
            default=str(self.frontend_path),
            help="Frontend output path",
        )
        gen_parser.add_argument(
            "--output-backend",
            type=str,
            default=str(self.backend_path),
            help="Backend output path",
        )
        gen_parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be generated without creating files",
        )

        # Field types command
        subparsers.add_parser("field-types", help="List available field types")

        # Example config command
        config_parser = subparsers.add_parser(
            "example-config", help="Generate example config"
        )
        config_parser.add_argument("--name", type=str, required=True, help="Model name")
        config_parser.add_argument("--output", type=str, help="Output file path")

        # Interactive command
        subparsers.add_parser("interactive", help="Interactive model builder")

        return parser

    def generate_scaffolding(self, args):
        """Generate scaffolding based on arguments"""
        if args.config:
            config_data = self.load_config(args.config)
            model_name = config_data.get("name")
            if not model_name:
                print("❌ Error: Config file must specify 'name' field")
                return False
        elif args.name:
            config_data = self.create_default_config(args.name)
            model_name = args.name
        else:
            print("❌ Error: Must specify either --name or --config")
            return False

        print(f"🚀 Generating scaffolding for {model_name}")
        print(f"📂 Frontend path: {args.output_frontend}")
        print(f"📂 Backend path: {args.output_backend}")
        print(f"🎯 Type: {args.type}")

        if args.dry_run:
            print("\n🔍 DRY RUN - No files will be created")
            self.show_generation_plan(config_data, args.type)
            return True

        success = True

        # Generate frontend
        if args.type in ["frontend", "both"]:
            try:
                frontend_model = self.create_frontend_model(config_data)
                frontend_generator = FrontendScaffoldGenerator(
                    frontend_model, args.output_frontend
                )
                frontend_generator.generateAll()
                print("✅ Frontend scaffolding completed")
            except Exception as e:
                print(f"❌ Frontend scaffolding failed: {e}")
                success = False

        # Generate backend
        if args.type in ["backend", "both"]:
            try:
                backend_model = self.create_backend_model(config_data)
                backend_generator = BackendScaffoldGenerator(
                    backend_model, args.output_backend
                )
                backend_generator.generate_all()
                print("✅ Backend scaffolding completed")
            except Exception as e:
                print(f"❌ Backend scaffolding failed: {e}")
                success = False

        if success:
            print(f"\n🎉 Scaffolding for {model_name} completed successfully!")
            self.show_next_steps(model_name, args.type)

        return success

    def load_config(self, config_path: str) -> Dict[str, Any]:
        """Load configuration from JSON file"""
        try:
            with open(config_path, "r") as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"❌ Error: Config file '{config_path}' not found")
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"❌ Error: Invalid JSON in config file: {e}")
            sys.exit(1)

    def create_default_config(self, model_name: str) -> Dict[str, Any]:
        """Create a default configuration for a model"""
        return {
            "name": model_name,
            "description": f"{model_name} model",
            "fields": [
                {
                    "name": "name",
                    "type": "string",
                    "required": True,
                    "label": f"{model_name} Name",
                    "searchable": True,
                    "sortable": True,
                    "validation": {"min_length": 2, "max_length": 200},
                },
                {
                    "name": "description",
                    "type": "text",
                    "required": False,
                    "label": "Description",
                    "searchable": True,
                    "displayInList": False,
                },
                {
                    "name": "is_active",
                    "type": "boolean",
                    "required": False,
                    "label": "Active",
                    "default": True,
                    "displayInList": True,
                    "filterable": True,
                },
            ],
            "permissions": {"category": model_name.lower(), "owner_field": "user_id"},
            "api": {"enable_search": True, "enable_filtering": True, "page_size": 25},
        }

    def create_frontend_model(self, config: Dict[str, Any]) -> FrontendModelDefinition:
        """Convert config to frontend model definition"""
        fields = []

        for field_config in config.get("fields", []):
            field = FrontendFieldDefinition(
                name=field_config["name"],
                type=field_config["type"],
                required=field_config.get("required", False),
                label=field_config.get("label"),
                placeholder=field_config.get("placeholder"),
                options=field_config.get("options"),
                validation=field_config.get("validation"),
                displayInList=field_config.get("displayInList", True),
                searchable=field_config.get("searchable", False),
                sortable=field_config.get("sortable", True),
                filterType=field_config.get("filterType"),
            )
            fields.append(field)

        return FrontendModelDefinition(
            name=config["name"],
            pluralName=config.get("pluralName"),
            description=config.get("description"),
            tableName=config.get("tableName"),
            icon=config.get("icon", "FileText"),
            module=config.get("module"),
            fields=fields,
            hasTimestamps=config.get("hasTimestamps", True),
            hasStatus=config.get("hasStatus", True),
        )

    def create_backend_model(self, config: Dict[str, Any]) -> BackendModelDefinition:
        """Convert config to backend model definition"""
        fields = []

        for field_config in config.get("fields", []):
            # Convert field type
            field_type_mapping = {
                "string": FieldType.STRING,
                "number": FieldType.INTEGER,
                "float": FieldType.FLOAT,
                "boolean": FieldType.BOOLEAN,
                "date": FieldType.DATE,
                "datetime": FieldType.DATETIME,
                "text": FieldType.TEXT,
                "email": FieldType.EMAIL,
                "url": FieldType.URL,
                "json": FieldType.JSON,
                "select": FieldType.ENUM,
                "multiselect": FieldType.JSON,
            }

            field_type = field_type_mapping.get(field_config["type"], FieldType.STRING)

            # Create validation rule if specified
            validation = None
            if "validation" in field_config:
                val_config = field_config["validation"]
                validation = ValidationRule(
                    min_length=val_config.get("min_length"),
                    max_length=val_config.get("max_length"),
                    min_value=val_config.get("min_value"),
                    max_value=val_config.get("max_value"),
                    pattern=val_config.get("pattern"),
                    error_message=val_config.get("error_message"),
                )

            field = BackendFieldDefinition(
                name=field_config["name"],
                type=field_type,
                required=field_config.get("required", False),
                nullable=not field_config.get("required", False),
                unique=field_config.get("unique", False),
                indexed=field_config.get("indexed", False),
                default=field_config.get("default"),
                validation=validation,
                max_length=field_config.get("max_length"),
                enum_values=field_config.get("options"),
                description=field_config.get("description"),
                example=field_config.get("example"),
                searchable=field_config.get("searchable", False),
                filterable=field_config.get("filterable", False),
                sortable=field_config.get("sortable", True),
            )
            fields.append(field)

        # Convert mixins
        mixins = [ModelMixin.TIMESTAMP]  # Default
        if config.get("hasAudit", False):
            mixins.append(ModelMixin.AUDIT)
        if config.get("hasSoftDelete", False):
            mixins.append(ModelMixin.SOFT_DELETE)
        if config.get("hasMetadata", False):
            mixins.append(ModelMixin.METADATA)

        return BackendModelDefinition(
            name=config["name"],
            table_name=config.get("tableName"),
            description=config.get("description"),
            fields=fields,
            mixins=mixins,
            permission_category=config.get("permissions", {}).get("category"),
            owner_field=config.get("permissions", {}).get("owner_field"),
            project_scoped=config.get("permissions", {}).get("project_scoped", False),
            list_page_size=config.get("api", {}).get("page_size", 25),
            enable_search=config.get("api", {}).get("enable_search", True),
            enable_filtering=config.get("api", {}).get("enable_filtering", True),
            enable_sorting=config.get("api", {}).get("enable_sorting", True),
            generate_service=config.get("generate_service", True),
            generate_migrations=config.get("generate_migrations", True),
            generate_tests=config.get("generate_tests", True),
        )

    def show_field_types(self):
        """Show available field types"""
        print("📋 Available Field Types:")
        print("\n🎯 Frontend Types:")
        frontend_types = [
            "string - Text input field",
            "number - Numeric input field",
            "boolean - Checkbox/toggle field",
            "date - Date picker field",
            "email - Email input with validation",
            "url - URL input with validation",
            "text - Multi-line text area",
            "select - Dropdown selection",
            "multiselect - Multiple checkbox selection",
        ]
        for ft in frontend_types:
            print(f"  • {ft}")

        print("\n🎯 Backend Types:")
        backend_types = [
            "string - VARCHAR column",
            "integer - Integer column",
            "float - Float/decimal column",
            "boolean - Boolean column",
            "date - Date column",
            "datetime - DateTime column",
            "text - Text column (unlimited length)",
            "email - String with email validation",
            "url - String with URL validation",
            "json - JSON column",
            "enum - Enumeration column",
            "foreign_key - Foreign key relationship",
        ]
        for bt in backend_types:
            print(f"  • {bt}")

    def generate_example_config(self, args):
        """Generate an example configuration file"""
        model_name = args.name
        config = {
            "$schema": "https://fastNext.dev/schemas/scaffold-config.json",
            "name": model_name,
            "pluralName": f"{model_name}s",
            "description": f"{model_name} management model",
            "icon": "FileText",
            "module": model_name.lower(),
            "hasTimestamps": True,
            "hasStatus": True,
            "hasAudit": True,
            "fields": [
                {
                    "name": "name",
                    "type": "string",
                    "required": True,
                    "label": f"{model_name} Name",
                    "placeholder": f"Enter {model_name.lower()} name...",
                    "validation": {
                        "min_length": 2,
                        "max_length": 200,
                        "error_message": "Name must be between 2 and 200 characters",
                    },
                    "unique": True,
                    "indexed": True,
                    "displayInList": True,
                    "searchable": True,
                    "sortable": True,
                },
                {
                    "name": "description",
                    "type": "text",
                    "required": False,
                    "label": "Description",
                    "placeholder": "Enter description...",
                    "displayInList": False,
                    "searchable": True,
                },
                {
                    "name": "status",
                    "type": "select",
                    "required": True,
                    "label": "Status",
                    "options": ["draft", "active", "inactive", "archived"],
                    "default": "draft",
                    "displayInList": True,
                    "filterable": True,
                },
                {
                    "name": "priority",
                    "type": "number",
                    "required": False,
                    "label": "Priority",
                    "validation": {"min_value": 1, "max_value": 10},
                    "default": 5,
                    "displayInList": True,
                    "sortable": True,
                },
                {
                    "name": "is_featured",
                    "type": "boolean",
                    "required": False,
                    "label": "Featured",
                    "default": False,
                    "displayInList": True,
                    "filterable": True,
                },
                {
                    "name": "tags",
                    "type": "multiselect",
                    "required": False,
                    "label": "Tags",
                    "options": ["important", "urgent", "featured", "popular", "new"],
                    "displayInList": True,
                },
                {
                    "name": "contact_email",
                    "type": "email",
                    "required": False,
                    "label": "Contact Email",
                    "displayInList": False,
                },
                {
                    "name": "website_url",
                    "type": "url",
                    "required": False,
                    "label": "Website URL",
                    "displayInList": False,
                },
                {
                    "name": "launch_date",
                    "type": "date",
                    "required": False,
                    "label": "Launch Date",
                    "displayInList": True,
                    "sortable": True,
                    "filterable": True,
                },
                {
                    "name": "metadata",
                    "type": "json",
                    "required": False,
                    "label": "Additional Data",
                    "description": "Additional metadata as JSON",
                    "displayInList": False,
                },
            ],
            "permissions": {
                "category": model_name.lower(),
                "owner_field": "user_id",
                "project_scoped": False,
            },
            "api": {
                "enable_search": True,
                "enable_filtering": True,
                "enable_sorting": True,
                "page_size": 25,
                "max_page_size": 100,
            },
            "generation": {
                "generate_service": True,
                "generate_migrations": True,
                "generate_tests": True,
            },
        }

        output_file = args.output or f"{model_name.lower()}-config.json"

        with open(output_file, "w") as f:
            json.dump(config, f, indent=2)

        print(f"📝 Example configuration created: {output_file}")
        print(
            f"🔧 Edit the file and run: python scaffold-cli.py generate --config {output_file}"
        )

    def interactive_builder(self):
        """Interactive model builder"""
        print("🎯 Interactive Model Builder")
        print("=" * 40)

        # Get basic model info
        name = input("Model name (e.g., Product, BlogPost): ").strip()
        if not name:
            print("❌ Model name is required")
            return

        description = input(f"Description for {name} (optional): ").strip()
        icon = input("Lucide icon name (default: FileText): ").strip() or "FileText"

        # Build fields interactively
        fields = []
        print("\n📝 Add fields to your model (press Enter with no name to finish):")

        while True:
            print(f"\nField #{len(fields) + 1}:")
            field_name = input("  Field name: ").strip()
            if not field_name:
                break

            print(
                "  Available types: string, number, boolean, date, email, url, text, select, multiselect"
            )
            field_type = input("  Field type: ").strip()

            required = input("  Required? (y/N): ").strip().lower() == "y"
            searchable = input("  Searchable? (y/N): ").strip().lower() == "y"

            field = {
                "name": field_name,
                "type": field_type,
                "required": required,
                "label": field_name.replace("_", " ").title(),
                "searchable": searchable,
                "sortable": True,
                "displayInList": True,
            }

            if field_type in ["select", "multiselect"]:
                options = input("  Options (comma-separated): ").strip()
                if options:
                    field["options"] = [opt.strip() for opt in options.split(",")]

            fields.append(field)

        # Create config
        config = {
            "name": name,
            "description": description,
            "icon": icon,
            "hasTimestamps": True,
            "hasStatus": True,
            "fields": fields,
            "permissions": {"category": name.lower(), "owner_field": "user_id"},
            "api": {"enable_search": True, "enable_filtering": True, "page_size": 25},
        }

        # Save config
        config_file = f"{name.lower()}-interactive.json"
        with open(config_file, "w") as f:
            json.dump(config, f, indent=2)

        print(f"\n💾 Configuration saved to: {config_file}")

        # Ask to generate immediately
        generate = input("\nGenerate scaffolding now? (Y/n): ").strip().lower()
        if generate != "n":
            print("\nGenerating scaffolding...")

            # Simulate args
            class Args:
                config = config_file
                type = "both"
                output_frontend = str(self.frontend_path)
                output_backend = str(self.backend_path)
                dry_run = False

            self.generate_scaffolding(Args())

    def show_generation_plan(self, config: Dict[str, Any], gen_type: str):
        """Show what would be generated in dry run"""
        model_name = config["name"]

        print(f"\n📋 Generation Plan for {model_name}:")
        print(f"🏷️  Model: {model_name}")
        print(f"📄 Description: {config.get('description', 'N/A')}")
        print(f"🔢 Fields: {len(config.get('fields', []))}")

        if gen_type in ["frontend", "both"]:
            print(f"\n📱 Frontend Files:")
            print(f"  • src/shared/services/api/{model_name.lower()}.ts")
            print(f"  • src/modules/{model_name.lower()}/hooks/use{model_name}s.ts")
            print(
                f"  • src/modules/{model_name.lower()}/components/{model_name}Form.tsx"
            )
            print(f"  • src/shared/components/data-table/{model_name}sDataTable.tsx")
            print(
                f"  • src/app/{model_name.lower()}s/page.tsx (+ create, edit, view pages)"
            )
            print(f"  • Updated src/shared/components/navigation/menuConfig.ts")

        if gen_type in ["backend", "both"]:
            print(f"\n🐍 Backend Files:")
            print(f"  • app/models/{model_name.lower()}.py")
            print(f"  • app/schemas/{model_name.lower()}.py")
            print(f"  • app/api/{model_name.lower()}s.py")
            print(f"  • app/services/{model_name.lower()}_service.py")
            print(f"  • alembic/versions/add_{model_name.lower()}s.py")
            print(f"  • tests/test_{model_name.lower()}.py")
            print(f"  • Updated app/api/main.py")

        print(f"\n🔧 Fields:")
        for field in config.get("fields", []):
            required = "required" if field.get("required") else "optional"
            print(f"  • {field['name']} ({field['type']}, {required})")

    def show_next_steps(self, model_name: str, gen_type: str):
        """Show next steps after generation"""
        print(f"\n📋 Next Steps for {model_name}:")

        if gen_type in ["backend", "both"]:
            print("🐍 Backend:")
            print("  1. Run database migration: alembic upgrade head")
            print("  2. Review generated models and schemas")
            print("  3. Customize service layer business logic")
            print("  4. Run tests: pytest tests/test_*.py")

        if gen_type in ["frontend", "both"]:
            print("📱 Frontend:")
            print("  1. Review generated components and pages")
            print("  2. Update API endpoints to match backend")
            print("  3. Customize forms and data tables as needed")
            print("  4. Run build: npm run build")

        print("🚀 General:")
        print("  1. Test the generated CRUD operations")
        print("  2. Add custom business logic")
        print("  3. Implement proper error handling")
        print("  4. Add authorization rules")
        print("  5. Deploy and monitor")

    def run(self):
        """Main CLI entry point"""
        parser = self.create_parser()
        args = parser.parse_args()

        if not args.command:
            parser.print_help()
            return

        if args.command == "generate":
            self.generate_scaffolding(args)
        elif args.command == "field-types":
            self.show_field_types()
        elif args.command == "example-config":
            self.generate_example_config(args)
        elif args.command == "interactive":
            self.interactive_builder()


if __name__ == "__main__":
    cli = UnifiedScaffoldCLI()
    cli.run()
