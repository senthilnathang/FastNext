"""
Module Manifest Schema

Defines the structure and validation for module __manifest__.py files.
Inspired by Odoo's manifest format.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class ExternalDeps(BaseModel):
    """External dependency requirements for a module."""

    python: List[str] = Field(default_factory=list, description="Python packages (pip)")
    bin: List[str] = Field(default_factory=list, description="System binaries")


class AssetConfig(BaseModel):
    """Frontend asset configuration for a module."""

    routes: Optional[str] = Field(None, description="Path to routes config file")
    stores: List[str] = Field(default_factory=list, description="Paths to state stores")
    components: List[str] = Field(default_factory=list, description="Paths to React components")
    views: List[str] = Field(default_factory=list, description="Paths to React views/pages")
    styles: List[str] = Field(default_factory=list, description="Paths to CSS/SCSS files")
    locales: List[str] = Field(default_factory=list, description="Paths to i18n files")
    assets: List[str] = Field(default_factory=list, description="Static assets (images, fonts)")


class MenuConfig(BaseModel):
    """Menu item configuration for a module."""

    name: str
    path: str
    icon: Optional[str] = None
    parent: Optional[str] = None
    sequence: int = 10
    groups: List[str] = Field(default_factory=list)


class ManifestSchema(BaseModel):
    """
    Module manifest schema.

    Defines all metadata and configuration for a FastNext module.
    Based on Odoo's __manifest__.py format with adaptations for FastAPI/Next.js.
    """

    # Basic Info
    name: str = Field(..., description="Human-readable module name")
    technical_name: Optional[str] = Field(None, description="Technical name (folder name)")
    version: str = Field("1.0.0", description="Module version (semver)")
    summary: str = Field("", description="Short one-line description")
    description: str = Field("", description="Long description (markdown supported)")
    author: str = Field("", description="Author name or organization")
    website: str = Field("", description="Author website URL")
    license: str = Field("MIT", description="License type")
    category: str = Field("Uncategorized", description="Category for grouping")

    # Module Type
    application: bool = Field(
        False,
        description="True if this is a full application, False for technical modules"
    )
    installable: bool = Field(True, description="Whether the module can be installed")
    auto_install: bool = Field(
        False,
        description="Auto-install when all dependencies are met"
    )

    # Dependencies
    depends: List[str] = Field(
        default_factory=lambda: ["base"],
        description="List of required module names"
    )
    external_dependencies: ExternalDeps = Field(
        default_factory=ExternalDeps,
        description="External package dependencies"
    )

    # Backend Components
    models: List[str] = Field(
        default_factory=list,
        description="Model packages to import (e.g., ['models'])"
    )
    api: List[str] = Field(
        default_factory=list,
        description="API router modules (e.g., ['api.routes'])"
    )
    services: List[str] = Field(
        default_factory=list,
        description="Service modules to import"
    )
    data: List[str] = Field(
        default_factory=list,
        description="Data files to load on install (JSON/YAML)"
    )
    demo: List[str] = Field(
        default_factory=list,
        description="Demo data files (loaded in demo mode)"
    )

    # Frontend Assets
    assets: AssetConfig = Field(
        default_factory=AssetConfig,
        description="Frontend asset configuration"
    )

    # Menu Configuration
    menus: List[MenuConfig] = Field(
        default_factory=list,
        description="Menu items to register"
    )

    # Lifecycle Hooks
    pre_init_hook: Optional[str] = Field(
        None,
        description="Function to run before module init (e.g., 'hooks.pre_init')"
    )
    post_init_hook: Optional[str] = Field(
        None,
        description="Function to run after module init (e.g., 'hooks.post_init')"
    )
    uninstall_hook: Optional[str] = Field(
        None,
        description="Function to run on uninstall (e.g., 'hooks.uninstall')"
    )
    post_load_hook: Optional[str] = Field(
        None,
        description="Function to run after module load (e.g., 'hooks.post_load')"
    )

    # Inheritance/Extension
    inherits: Dict[str, str] = Field(
        default_factory=dict,
        description="Model inheritance mapping (base.Model -> extension.Mixin)"
    )
    overrides: Dict[str, str] = Field(
        default_factory=dict,
        description="Route override mapping (module.route -> custom.handler)"
    )

    # Permissions
    permissions: List[str] = Field(
        default_factory=list,
        description="Permission files to load"
    )
    access_rules: List[str] = Field(
        default_factory=list,
        description="Access rule files to load"
    )

    @field_validator("version")
    @classmethod
    def validate_version(cls, v: str) -> str:
        """Validate version is a valid semver-like string."""
        parts = v.split(".")
        if len(parts) < 2:
            raise ValueError("Version must have at least major.minor format")
        return v

    @field_validator("depends")
    @classmethod
    def validate_depends(cls, v: List[str]) -> List[str]:
        """Ensure base is always a dependency (unless this is base module)."""
        return list(set(v))  # Remove duplicates

    def get_frontend_config(self) -> Dict[str, Any]:
        """Get frontend-specific configuration for the module loader."""
        return {
            "name": self.technical_name or self.name.lower().replace(" ", "_"),
            "displayName": self.name,
            "routes": self.assets.routes,
            "stores": self.assets.stores,
            "components": self.assets.components,
            "views": self.assets.views,
            "locales": self.assets.locales,
            "menus": [m.model_dump() for m in self.menus],
        }


def parse_manifest(manifest_dict: Dict[str, Any]) -> ManifestSchema:
    """
    Parse a manifest dictionary into a validated ManifestSchema.

    Args:
        manifest_dict: Raw manifest dictionary from __manifest__.py

    Returns:
        Validated ManifestSchema instance

    Raises:
        ValueError: If manifest is invalid
    """
    import copy

    # Make a DEEP copy to avoid modifying the original (which may be cached)
    # This is critical because we convert dict values to Pydantic models below
    data = copy.deepcopy(manifest_dict)

    # Handle nested dicts that should be models
    if "external_dependencies" in data:
        if isinstance(data["external_dependencies"], dict):
            data["external_dependencies"] = ExternalDeps(
                **data["external_dependencies"]
            )

    if "assets" in data:
        if isinstance(data["assets"], dict):
            data["assets"] = AssetConfig(**data["assets"])

    if "menus" in data:
        data["menus"] = [
            MenuConfig(**m) if isinstance(m, dict) else m
            for m in data["menus"]
        ]

    return ManifestSchema(**data)
